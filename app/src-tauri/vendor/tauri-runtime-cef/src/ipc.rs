//! IPC bridge helpers for the CEF runtime.
//!
//! Tauri 2 prefers `fetch(ipc://localhost/<cmd>)` for command IPC and falls
//! back to `window.ipc.postMessage(...)` when the custom-protocol request fails.
//! `protocol.rs` handles the primary `ipc://` path by forwarding CEF requests
//! to Tauri's prepared URI scheme handlers. This module supplies the
//! `window.ipc.postMessage` fallback by routing it through a CEF-owned
//! `cef-ipc://` custom protocol, then invoking Tauri's `PendingWebview`
//! `ipc_handler`.

use std::{borrow::Cow, sync::Mutex};

use http::{
    header::{ACCESS_CONTROL_ALLOW_ORIGIN, CONTENT_TYPE},
    Request as HttpRequest, Response as HttpResponse, StatusCode,
};
use tauri_runtime::{
    webview::{DetachedWebview, InitializationScript, PendingWebview},
    UserEvent,
};

use crate::Cef;

pub(crate) const CEF_IPC_SCHEME: &str = "cef-ipc";

const POST_MESSAGE_SHIM: &str = r#"
;(() => {
  if (window.ipc && typeof window.ipc.postMessage === 'function') {
    return
  }

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

    pending.webview_attributes.initialization_scripts.insert(
        0,
        InitializationScript {
            script: POST_MESSAGE_SHIM.to_string(),
            for_main_frame_only: true,
        },
    );

    force_postmessage_ipc_transport(&mut pending.webview_attributes.initialization_scripts);

    let ipc_handler = Mutex::new(ipc_handler);
    pending.register_uri_scheme_protocol(CEF_IPC_SCHEME, move |_label, request, responder| {
        let response = match post_message_request(request, &initial_url) {
            Ok(request) => {
                let handler = ipc_handler.lock().expect("CEF IPC handler mutex poisoned");
                handler(detached.clone(), request);
                empty_response(StatusCode::NO_CONTENT)
            }
            Err(message) => HttpResponse::builder()
                .status(StatusCode::BAD_REQUEST)
                .header(CONTENT_TYPE, "text/plain; charset=utf-8")
                .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(Cow::Owned(message.into_bytes()))
                .expect("static bad-request response must be valid"),
        };
        responder(response);
    });
}

/// 把 Tauri `ipc-protocol.js` 里的 `customProtocolIpcFailed = false` 预置为 `true`,
/// 让前端 IPC 从一开始就走 postMessage 主路径,而不是先尝试 `fetch(ipc://...)`。
///
/// 原因:CEF 渲染进程在页面首帧提交时拿到的 `URLLoaderFactory` bundle 还不包含
/// 运行时动态注册的 `ipc` scheme,导致每个页面加载后的第一个 invoke 必然
/// `net::ERR_UNKNOWN_URL_SCHEME`。Tauri 前端一旦失败就把 `customProtocolIpcFailed`
/// 永久置位并回退 postMessage —— 于是每页留下一条报错、首个命令还多一次注定失败
/// 的往返。直接把初值改成"已失败",跳过这次往返;postMessage 经本模块的
/// `cef-ipc://` POST 桥传输,功能与 `ipc://` 等价。
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

fn empty_response(status: StatusCode) -> HttpResponse<Cow<'static, [u8]>> {
    HttpResponse::builder()
        .status(status)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(Cow::Borrowed(&[] as &[u8]))
        .expect("static empty response must be valid")
}
