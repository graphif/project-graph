//! IPC bridge helpers for the CEF runtime.
//!
//! Tauri 2 的命令 IPC 有两条上游通道:`fetch(ipc://localhost/<cmd>)` 自定义协议
//! (唯一能携带 **raw 二进制 body** 的通道)与 `window.ipc.postMessage(...)`
//! JSON 回退。在 CEF 上,上游 fetch 路径因 `Tauri-*` 自定义头触发 CORS 预检而
//! 不可用(见 [`force_postmessage_ipc_transport`]),所以本模块:
//!
//! 1. 提供 `window.ipc.postMessage` 实现 —— 经 CEF 自有的 `cef-ipc://` 自定义
//!    协议 POST,转发给 Tauri `PendingWebview` 的 `ipc_handler`(JSON 通道,
//!    `Uint8Array` payload 会退化成数字数组,不能承载二进制);
//! 2. 提供 `cef-ipc://localhost/raw` **二进制直通端点** —— 元数据(cmd/invoke
//!    key/业务头)帧化进 body 前缀,请求本身零自定义头、不触发预检;Rust 侧解帧
//!    后重建带 `Tauri-*` 头的请求,转发给 Tauri 注册的 `ipc` 协议 handler,
//!    走完整的 invoke 解析 + ACL + `InvokeBody::Raw` 链路。页面侧入口是
//!    [`POST_MESSAGE_SHIM`] 注入的 `window.__kb_raw_invoke__(cmd, bytes, opts)`。

use std::{
    borrow::Cow,
    sync::{Arc, Mutex},
};

use http::{
    header::{ACCESS_CONTROL_ALLOW_ORIGIN, CONTENT_TYPE, ORIGIN},
    Request as HttpRequest, Response as HttpResponse, StatusCode,
};
use tauri_runtime::{
    webview::{DetachedWebview, InitializationScript, PendingWebview},
    UserEvent,
};

use crate::{protocol::ProtocolHandler, Cef};

pub(crate) const CEF_IPC_SCHEME: &str = "cef-ipc";
/// `cef-ipc://localhost/raw` —— 二进制帧化 invoke 端点的路径。
const RAW_INVOKE_PATH: &str = "/raw";

/// `__KB_INVOKE_KEY__` 会被替换为 JSON 字符串字面量(提取失败时为 `null`,
/// 此时 `__kb_raw_invoke__` 直接抛出可诊断错误而不是挂起)。
const POST_MESSAGE_SHIM: &str = r#"
;(() => {
  if (window.ipc && typeof window.ipc.postMessage === 'function') {
    return
  }

  const invokeKey = __KB_INVOKE_KEY__

  Object.defineProperty(window, 'ipc', {
    configurable: true,
    value: Object.freeze({
      postMessage(data) {
        fetch('cef-ipc://localhost/', {
          method: 'POST',
          body: String(data),
          headers: { 'Content-Type': 'application/json' }
        }).catch((error) => {
          console.error('CEF IPC postMessage failed', error)
        })
      }
    })
  })

  // 二进制 invoke 通道:帧格式 [u32 LE 头长][JSON 头][payload]。
  // 请求不带任何自定义 HTTP 头(元数据全在帧头里),避开 CORS 预检
  // —— CEF 的 scheme handler 收不到 network process 发起的预检请求。
  Object.defineProperty(window, '__kb_raw_invoke__', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: async (cmd, payload, options) => {
      if (invokeKey === null) {
        throw new Error('CEF raw invoke unavailable: invoke key not found in upstream scripts')
      }
      const header = new TextEncoder().encode(JSON.stringify({
        cmd: encodeURIComponent(String(cmd)),
        invokeKey,
        headers: (options && options.headers) || {}
      }))
      const bytes = payload instanceof Uint8Array
        ? payload
        : payload instanceof ArrayBuffer
          ? new Uint8Array(payload)
          : ArrayBuffer.isView(payload)
            ? new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)
            : new Uint8Array(payload)
      // 帧必须是单个连续 buffer:CEF 的 post data 拿不到 fetch 的 Blob body
      // (data-pipe 元素读不出来,实测 body 直接丢失),Uint8Array 则完整可达。
      const frame = new Uint8Array(4 + header.byteLength + bytes.byteLength)
      new DataView(frame.buffer).setUint32(0, header.byteLength, true)
      frame.set(header, 4)
      frame.set(bytes, 4 + header.byteLength)
      const response = await fetch('cef-ipc://localhost/raw', {
        method: 'POST',
        body: frame
      })
      const ok = response.headers.get('Tauri-Response') === 'ok'
      const mime = (response.headers.get('content-type') || '').split(';')[0].trim()
      const data = mime === 'application/json'
        ? await response.json()
        : mime === 'text/plain'
          ? await response.text()
          : await response.arrayBuffer()
      if (!ok) {
        throw new Error(typeof data === 'string' ? data : JSON.stringify(data))
      }
      return data
    }
  })
})()
"#;

pub(crate) fn install_post_message_bridge<T: UserEvent>(
    pending: &mut PendingWebview<T, Cef<T>>,
    detached: DetachedWebview<T, Cef<T>>,
    initial_url: String,
) {
    let Some(ipc_handler) = pending.ipc_handler.take() else {
        return;
    };

    // 把 Tauri 注册的 `ipc` 协议 handler 包成 Arc 双路复用:原样回插(保持
    // take_webview_protocols 语义不变),另一份供下面的 /raw 端点转发。
    let raw_ipc_protocol: Option<Arc<ProtocolHandler>> =
        pending.uri_scheme_protocols.remove("ipc").map(|handler| {
            let handler: Arc<ProtocolHandler> = Arc::from(handler);
            let reinserted = handler.clone();
            pending.register_uri_scheme_protocol("ipc", move |label, request, responder| {
                reinserted(label, request, responder)
            });
            handler
        });

    let invoke_key = extract_invoke_key(&pending.webview_attributes.initialization_scripts);
    let shim = POST_MESSAGE_SHIM.replace(
        "__KB_INVOKE_KEY__",
        &invoke_key
            .map(|key| serde_json::Value::String(key).to_string())
            .unwrap_or_else(|| "null".to_string()),
    );

    pending.webview_attributes.initialization_scripts.insert(
        0,
        InitializationScript {
            script: shim,
            for_main_frame_only: true,
        },
    );

    force_postmessage_ipc_transport(&mut pending.webview_attributes.initialization_scripts);

    let ipc_handler = Mutex::new(ipc_handler);
    pending.register_uri_scheme_protocol(CEF_IPC_SCHEME, move |label, request, responder| {
        if request.uri().path() == RAW_INVOKE_PATH {
            let Some(protocol) = raw_ipc_protocol.as_ref() else {
                responder(text_response(
                    StatusCode::NOT_IMPLEMENTED,
                    "ipc protocol handler unavailable".to_string(),
                ));
                return;
            };
            match raw_invoke_request(request) {
                // 转发给 Tauri 的 ipc 协议 handler,响应(含 Tauri-Response /
                // ACAO / expose 头)原样回给页面的 fetch。
                Ok(request) => protocol(label, request, responder),
                Err(message) => responder(text_response(StatusCode::BAD_REQUEST, message)),
            }
            return;
        }

        let response = match post_message_request(request, &initial_url) {
            Ok(request) => {
                let handler = ipc_handler.lock().expect("CEF IPC handler mutex poisoned");
                handler(detached.clone(), request);
                empty_response(StatusCode::NO_CONTENT)
            }
            Err(message) => text_response(StatusCode::BAD_REQUEST, message),
        };
        responder(response);
    });
}

/// 把 Tauri `ipc-protocol.js` 里的 `customProtocolIpcFailed = false` 预置为 `true`,
/// 让前端 IPC 从一开始就走 postMessage 主路径,而不是先尝试 `fetch(ipc://...)`。
///
/// 原因(2026-07 实测修订;早期"首帧 URLLoaderFactory bundle 不含动态 scheme"
/// 的解释不准确):上游 fetch 路径带 `Tauri-Callback`/`Tauri-Error`/
/// `Tauri-Invoke-Key` 自定义头,该头组合会触发 CORS 预检,而 CEF 的 scheme
/// handler 收不到预检请求 —— preflight 由 network process 直接发起(见 CEF
/// `proxy_url_loader_factory.cc` 的 `CorsPreflightRequest` 注释),对动态注册的
/// 自定义 scheme 报 `net::ERR_UNKNOWN_URL_SCHEME`。于是每个页面的头几个 invoke
/// 必然失败、留下成串报错后才回退 postMessage。直接预置"已失败"跳过这些注定
/// 失败的往返。无自定义头的请求不受预检影响 —— 二进制 payload 走本模块的
/// `cef-ipc://localhost/raw` 帧化通道(`window.__kb_raw_invoke__`)。
///
/// 该替换与 Tauri 上游脚本文本强耦合;若上游改写此标记,替换会静默失效(仅退回
/// "先失败再回退",功能不受影响)。
fn force_postmessage_ipc_transport(scripts: &mut [InitializationScript]) {
    const NEEDLE: &str = "customProtocolIpcFailed = false";
    const PATCHED: &str = "customProtocolIpcFailed = true";
    for script in scripts.iter_mut() {
        if script.script.contains(NEEDLE) {
            script.script = script.script.replace(NEEDLE, PATCHED);
        }
    }
}

/// 从已完成模板替换的上游初始化脚本里提取 invoke key。
///
/// 上游 `ipc-protocol.js` 经 serialize-to-javascript 渲染后含
/// `const __TAURI_INVOKE_KEY__ = JSON.parse('"<key>"')`(取赋值行首个双引号对,
/// 兼容将来退化为裸 `"<key>"` 字面量的形态)。key 是 z85 编码,字符集不含 `"`、
/// `\`、`'`,无需处理转义。提取失败(上游改写)时返回 None,shim 内的
/// `__kb_raw_invoke__` 会抛出可诊断错误。
fn extract_invoke_key(scripts: &[InitializationScript]) -> Option<String> {
    const MARKER: &str = "__TAURI_INVOKE_KEY__ = ";
    for script in scripts {
        let Some(start) = script.script.find(MARKER) else {
            continue;
        };
        let rest = &script.script[start + MARKER.len()..];
        let line = rest.lines().next().unwrap_or(rest);
        let Some(open) = line.find('"') else { continue };
        let value = &line[open + 1..];
        if let Some(end) = value.find('"') {
            return Some(value[..end].to_string());
        }
    }
    None
}

/// `/raw` 帧头:`[u32 LE 头长][本 JSON][payload]` 中的 JSON 部分。
#[derive(serde::Deserialize)]
struct RawInvokeHeader {
    /// 命令名,JS 侧已 `encodeURIComponent`(Tauri 的 `parse_invoke_request`
    /// 会对路径做 percent-decode)。
    cmd: String,
    #[serde(rename = "invokeKey")]
    invoke_key: String,
    /// 业务头(如 `rid`),对应 `invoke(cmd, payload, { headers })` 的 headers。
    #[serde(default)]
    headers: std::collections::HashMap<String, String>,
}

/// 把 `/raw` 帧化请求重建为 Tauri `ipc` 协议 handler 期望的形态:
/// `ipc://localhost/<cmd>` + `Tauri-*` 头 + `application/octet-stream` raw body
/// (`parse_invoke_request` 由此产出 `InvokeBody::Raw`)。`Origin` 头原样转发,
/// 供 invoke 的 ACL 按 Local/Remote 归类 —— 与 postMessage 通道语义一致。
fn raw_invoke_request(request: HttpRequest<Vec<u8>>) -> Result<HttpRequest<Vec<u8>>, String> {
    if request.method() != http::Method::POST {
        return Err("CEF raw invoke only accepts POST".to_string());
    }

    let origin = request.headers().get(ORIGIN).cloned();
    let mut body = request.into_body();
    if body.len() < 4 {
        return Err("CEF raw invoke frame too short".to_string());
    }
    let header_len =
        u32::from_le_bytes(body[0..4].try_into().expect("length checked above")) as usize;
    let payload_start = 4usize
        .checked_add(header_len)
        .filter(|start| *start <= body.len())
        .ok_or_else(|| "CEF raw invoke frame header length out of bounds".to_string())?;
    let frame: RawInvokeHeader = serde_json::from_slice(&body[4..payload_start])
        .map_err(|error| format!("invalid CEF raw invoke frame header: {error}"))?;
    // 原地把 payload 挪到开头(单次 memmove),避免整体再拷一份。
    body.drain(..payload_start);

    let mut builder = HttpRequest::builder()
        .method(http::Method::POST)
        .uri(format!("ipc://localhost/{}", frame.cmd))
        .header(CONTENT_TYPE, "application/octet-stream")
        .header("Tauri-Callback", "0")
        .header("Tauri-Error", "0")
        .header("Tauri-Invoke-Key", frame.invoke_key);
    if let Some(origin) = origin {
        builder = builder.header(ORIGIN, origin);
    }
    for (name, value) in frame.headers {
        builder = builder.header(name, value);
    }
    builder
        .body(body)
        .map_err(|error| format!("invalid CEF raw invoke request: {error}"))
}

fn post_message_request(
    request: HttpRequest<Vec<u8>>,
    fallback_url: &str,
) -> Result<HttpRequest<String>, String> {
    if request.method() != http::Method::POST {
        return Err("CEF IPC postMessage only accepts POST".to_string());
    }

    // Tauri 的 handle_ipc_message 会对该 URI 做 `Url::parse(...).expect(...)`;
    // opaque origin(错误页、Cloudflare 拦截页、沙箱 iframe)的 Origin 头是字面量
    // "null",能过 http::Uri 但过不了 url::Url,必须在此过滤,否则整个进程 abort。
    let uri = request
        .headers()
        .get(http::header::ORIGIN)
        .and_then(|value| value.to_str().ok())
        .filter(|value| url::Url::parse(value).is_ok())
        .unwrap_or(fallback_url)
        .to_string();

    if url::Url::parse(&uri).is_err() {
        return Err(format!("CEF IPC postMessage origin is not an absolute URL: {uri}"));
    }

    let body = String::from_utf8(request.into_body())
        .map_err(|_| "CEF IPC postMessage body must be UTF-8".to_string())?;

    HttpRequest::builder()
        .uri(uri)
        .body(body)
        .map_err(|error| format!("invalid CEF IPC postMessage request: {error}"))
}

fn text_response(status: StatusCode, message: String) -> HttpResponse<Cow<'static, [u8]>> {
    HttpResponse::builder()
        .status(status)
        .header(CONTENT_TYPE, "text/plain; charset=utf-8")
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(Cow::Owned(message.into_bytes()))
        .expect("static text response must be valid")
}

fn empty_response(status: StatusCode) -> HttpResponse<Cow<'static, [u8]>> {
    HttpResponse::builder()
        .status(status)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(Cow::Borrowed(&[] as &[u8]))
        .expect("static empty response must be valid")
}
