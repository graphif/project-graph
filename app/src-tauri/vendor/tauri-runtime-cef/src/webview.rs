//! CEF Views-backed Tauri webviews.

mod imp {
    use std::{
        collections::BTreeMap,
        io,
        path::PathBuf,
        rc::Rc,
        sync::{
            mpsc::{channel, RecvTimeoutError, Sender},
            Arc, Mutex,
        },
        time::Duration,
    };

    use cef::{self, *};
    use tauri_runtime::{
        dpi::{PhysicalPosition, PhysicalSize, Rect as RuntimeRect, Size},
        webview::{DetachedWebview, PageLoadEvent, PendingWebview},
        window::{WebviewEvent, WindowId},
        Cookie, Error, Result, UserEvent, WebviewDispatch, WebviewEventId,
    };
    use tauri_utils::config::Color;
    use url::Url;

    use crate::{ipc, protocol, runtime, Cef};

    static WEBVIEW_BROWSER_IDS: std::sync::OnceLock<Mutex<BTreeMap<String, i32>>> =
        std::sync::OnceLock::new();

    fn webview_browser_ids() -> &'static Mutex<BTreeMap<String, i32>> {
        WEBVIEW_BROWSER_IDS.get_or_init(|| Mutex::new(BTreeMap::new()))
    }

    fn register_webview_browser(label: &str, browser_id: i32) {
        if let Ok(mut map) = webview_browser_ids().lock() {
            map.insert(label.to_string(), browser_id);
        }
    }

    fn remove_webview_browser(browser_id: i32) {
        if let Ok(mut map) = webview_browser_ids().lock() {
            map.retain(|_, id| *id != browser_id);
        }
    }

    type CefUiTaskCallback = Box<dyn FnOnce() + Send>;

    wrap_task! {
        struct CefUiTask {
            task: Arc<Mutex<Option<CefUiTaskCallback>>>,
        }

        impl Task {
            fn execute(&self) {
                let Some(task) = self
                    .task
                    .lock()
                    .expect("CEF UI task mutex poisoned")
                    .take()
                else {
                    return;
                };
                task();
            }
        }
    }

    pub(crate) fn start_download(
        webview_label: &str,
        url: &str,
    ) -> std::result::Result<(), String> {
        let label = webview_label.to_string();
        let url = url.to_string();
        let (tx, rx) = channel();
        let mut task = CefUiTask::new(Arc::new(Mutex::new(Some(Box::new(move || {
            let browser_id = webview_browser_ids()
                .lock()
                .ok()
                .and_then(|map| map.get(&label).copied());
            let Some(browser_id) = browser_id else {
                let _ = tx.send(Err(format!("CEF webview not found: {label}")));
                return;
            };
            let Some(browser) = browser_host_get_browser_by_identifier(browser_id) else {
                let _ = tx.send(Err(format!("CEF browser not found: {label}")));
                return;
            };
            let Some(host) = browser.host() else {
                let _ = tx.send(Err(format!("CEF browser host not found: {label}")));
                return;
            };
            host.start_download(Some(&CefString::from(url.as_str())));
            let _ = tx.send(Ok(()));
        }) as CefUiTaskCallback))));
        if cef::post_task(ThreadId::UI, Some(&mut task)) == 0 {
            return Err("CEF failed to post start_download task".to_string());
        }
        rx.recv_timeout(Duration::from_secs(2))
            .map_err(|_| "CEF start_download timed out".to_string())?
    }

    #[derive(Clone)]
    pub struct CefWebviewDispatcher<T: UserEvent> {
        pub(crate) window_id: WindowId,
        pub(crate) webview_id: runtime::WebviewId,
        pub(crate) context: runtime::CefContext<T>,
    }

    impl<T: UserEvent> std::fmt::Debug for CefWebviewDispatcher<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.debug_struct("CefWebviewDispatcher")
                .field("window_id", &self.window_id)
                .field("webview_id", &self.webview_id)
                .finish()
        }
    }

    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl<T: UserEvent> Sync for CefWebviewDispatcher<T> {}

    impl<T: UserEvent> WebviewDispatch<T> for CefWebviewDispatcher<T> {
        type Runtime = Cef<T>;

        fn run_on_main_thread<F: FnOnce() + Send + 'static>(&self, f: F) -> Result<()> {
            self.context.send(runtime::Message::Task(Box::new(f)))
        }

        fn on_webview_event<F: Fn(&WebviewEvent) + Send + 'static>(&self, f: F) -> WebviewEventId {
            let id = self.context.next_webview_event_id();
            let _ = self.context.send(runtime::Message::Webview(
                self.webview_id,
                runtime::WebviewMessage::AddEventListener(id, Box::new(f)),
            ));
            id
        }

        fn with_webview<F: FnOnce(Box<dyn std::any::Any>) + Send + 'static>(
            &self,
            f: F,
        ) -> Result<()> {
            self.context.send(runtime::Message::Webview(
                self.webview_id,
                runtime::WebviewMessage::WithWebview(Box::new(f)),
            ))
        }

        fn open_devtools(&self) {
            let _ = self.send(runtime::WebviewMessage::OpenDevTools);
        }
        fn close_devtools(&self) {
            let _ = self.send(runtime::WebviewMessage::CloseDevTools);
        }
        fn is_devtools_open(&self) -> Result<bool> {
            webview_getter(self, runtime::WebviewGetter::DevToolsOpen)
        }
        fn url(&self) -> Result<String> {
            webview_getter(self, runtime::WebviewGetter::Url)
        }
        fn bounds(&self) -> Result<RuntimeRect> {
            Ok(RuntimeRect {
                position: PhysicalPosition::new(0, 0).into(),
                size: self.size()?.into(),
            })
        }
        fn position(&self) -> Result<PhysicalPosition<i32>> {
            Ok(PhysicalPosition::new(0, 0))
        }
        fn size(&self) -> Result<PhysicalSize<u32>> {
            webview_getter(self, runtime::WebviewGetter::Size)
        }
        fn navigate(&self, url: Url) -> Result<()> {
            self.send(runtime::WebviewMessage::Navigate(url.to_string()))
        }
        fn reload(&self) -> Result<()> {
            self.send(runtime::WebviewMessage::Reload)
        }
        fn print(&self) -> Result<()> {
            unsupported()
        }
        fn close(&self) -> Result<()> {
            self.send(runtime::WebviewMessage::Close)
        }
        fn set_bounds(&self, bounds: RuntimeRect) -> Result<()> {
            self.set_size(bounds.size)
        }
        fn set_size(&self, size: Size) -> Result<()> {
            self.send(runtime::WebviewMessage::SetSize(size))
        }
        fn set_position(&self, _: tauri_runtime::dpi::Position) -> Result<()> {
            Ok(())
        }
        fn set_focus(&self) -> Result<()> {
            self.send(runtime::WebviewMessage::SetFocus)
        }
        fn hide(&self) -> Result<()> {
            self.send(runtime::WebviewMessage::SetVisible(false))
        }
        fn show(&self) -> Result<()> {
            self.send(runtime::WebviewMessage::SetVisible(true))
        }
        fn eval_script<S: Into<String>>(&self, script: S) -> Result<()> {
            self.send(runtime::WebviewMessage::Eval(script.into()))
        }
        fn reparent(&self, _: WindowId) -> Result<()> {
            unsupported()
        }
        fn cookies_for_url(&self, url: Url) -> Result<Vec<Cookie<'static>>> {
            visit_cef_cookies(&self.context, Some(url.to_string()))
        }
        fn cookies(&self) -> Result<Vec<Cookie<'static>>> {
            visit_cef_cookies(&self.context, None)
        }
        fn set_cookie(&self, cookie: Cookie<'_>) -> Result<()> {
            set_cef_cookie(&self.context, cookie.into_owned(), self.url().ok())
        }
        fn delete_cookie(&self, cookie: Cookie<'_>) -> Result<()> {
            delete_cef_cookie(&self.context, cookie.into_owned(), self.url().ok())
        }
        fn eval_script_with_callback<S: Into<String>>(
            &self,
            script: S,
            callback: impl Fn(String) + Send + 'static,
        ) -> Result<()> {
            self.eval_script(script)?;
            callback(String::new());
            Ok(())
        }
        fn set_auto_resize(&self, auto_resize: bool) -> Result<()> {
            self.send(runtime::WebviewMessage::SetAutoResize(auto_resize))
        }
        fn set_zoom(&self, scale_factor: f64) -> Result<()> {
            self.send(runtime::WebviewMessage::SetZoom(scale_factor))
        }
        fn set_background_color(&self, _: Option<Color>) -> Result<()> {
            Ok(())
        }
        fn clear_all_browsing_data(&self) -> Result<()> {
            Ok(())
        }
    }

    impl<T: UserEvent> CefWebviewDispatcher<T> {
        fn send(&self, message: runtime::WebviewMessage) -> Result<()> {
            self.context
                .send(runtime::Message::Webview(self.webview_id, message))
        }
    }

    fn webview_getter<T: UserEvent, R: Send + 'static>(
        dispatcher: &CefWebviewDispatcher<T>,
        getter: runtime::WebviewGetter<R>,
    ) -> Result<R> {
        let (tx, rx) = channel();
        dispatcher.context.send(runtime::Message::Webview(
            dispatcher.webview_id,
            runtime::WebviewMessage::Get(getter.kind, tx),
        ))?;
        rx.recv()
            .map_err(|_| Error::FailedToReceiveMessage)?
            .and_then(|boxed| {
                boxed
                    .downcast::<R>()
                    .map(|value| *value)
                    .map_err(|_| Error::FailedToReceiveMessage)
            })
    }

    fn unsupported<T>() -> Result<T> {
        Err(Error::CreateWebview(Box::new(std::io::Error::other(
            "operation is not implemented by the CEF runtime yet",
        ))))
    }

    fn cef_runtime_error<T>(message: impl Into<String>) -> Result<T> {
        Err(Error::CreateWebview(Box::new(io::Error::other(
            message.into(),
        ))))
    }

    const COOKIE_WAIT_TIMEOUT: Duration = Duration::from_secs(2);

    wrap_cookie_visitor! {
        pub(crate) struct TauriCefCookieVisitor {
            cookies: Arc<Mutex<Vec<Cookie<'static>>>>,
            tx: Sender<Result<Vec<Cookie<'static>>>>,
        }
        impl CookieVisitor {
            fn visit(
                &self,
                cookie: Option<&cef::Cookie>,
                count: ::std::os::raw::c_int,
                total: ::std::os::raw::c_int,
                _delete_cookie: Option<&mut ::std::os::raw::c_int>,
            ) -> ::std::os::raw::c_int {
                if let Some(cookie) = cookie {
                    if let Some(cookie) = cef_cookie_to_tauri(cookie) {
                        if let Ok(mut cookies) = self.cookies.lock() {
                            cookies.push(cookie);
                        }
                    }
                }
                if total <= 0 || count + 1 >= total {
                    let cookies = self
                        .cookies
                        .lock()
                        .map(|cookies| cookies.clone())
                        .unwrap_or_default();
                    let _ = self.tx.send(Ok(cookies));
                }
                1
            }
        }
    }

    wrap_set_cookie_callback! {
        pub(crate) struct TauriCefSetCookieCallback {
            tx: Sender<bool>,
        }
        impl SetCookieCallback {
            fn on_complete(&self, success: ::std::os::raw::c_int) {
                let _ = self.tx.send(success != 0);
            }
        }
    }

    wrap_delete_cookies_callback! {
        pub(crate) struct TauriCefDeleteCookiesCallback {
            tx: Sender<i32>,
        }
        impl DeleteCookiesCallback {
            fn on_complete(&self, num_deleted: ::std::os::raw::c_int) {
                let _ = self.tx.send(num_deleted);
            }
        }
    }

    fn cef_cookie_to_tauri(cookie: &cef::Cookie) -> Option<Cookie<'static>> {
        let name = cookie.name.to_string();
        if name.is_empty() {
            return None;
        }
        let value = cookie.value.to_string();
        let mut out = Cookie::build((name, value)).build();

        let domain = cookie.domain.to_string();
        if !domain.is_empty() {
            out.set_domain(domain);
        }
        let path = cookie.path.to_string();
        if !path.is_empty() {
            out.set_path(path);
        }
        out.set_secure(cookie.secure != 0);
        out.set_http_only(cookie.httponly != 0);
        match cookie.same_site.get_raw() {
            raw if raw == CookieSameSite::NO_RESTRICTION.get_raw() => {
                out.set_same_site(cookie::SameSite::None);
            }
            raw if raw == CookieSameSite::LAX_MODE.get_raw() => {
                out.set_same_site(cookie::SameSite::Lax);
            }
            raw if raw == CookieSameSite::STRICT_MODE.get_raw() => {
                out.set_same_site(cookie::SameSite::Strict);
            }
            _ => {}
        }
        Some(out.into_owned())
    }

    fn tauri_cookie_to_cef(cookie: &Cookie<'_>) -> cef::Cookie {
        let mut out = cef::Cookie::default();
        out.name = CefString::from(cookie.name());
        out.value = CefString::from(cookie.value());
        if let Some(domain) = cookie.domain() {
            out.domain = CefString::from(domain);
        }
        out.path = CefString::from(cookie.path().unwrap_or("/"));
        out.secure = i32::from(cookie.secure().unwrap_or(false));
        out.httponly = i32::from(cookie.http_only().unwrap_or(false));
        if let Some(same_site) = cookie.same_site() {
            out.same_site = match same_site {
                cookie::SameSite::None => CookieSameSite::NO_RESTRICTION,
                cookie::SameSite::Lax => CookieSameSite::LAX_MODE,
                cookie::SameSite::Strict => CookieSameSite::STRICT_MODE,
            };
        }
        out
    }

    fn cookie_url(cookie: &Cookie<'_>, fallback_url: Option<String>) -> String {
        if let Some(domain) = cookie.domain().filter(|d| !d.trim().is_empty()) {
            let scheme = if cookie.secure().unwrap_or(false) {
                "https"
            } else {
                "http"
            };
            let host = domain.trim_start_matches('.');
            let path = cookie.path().filter(|p| !p.is_empty()).unwrap_or("/");
            let normalized_path = if path.starts_with('/') {
                path.to_string()
            } else {
                format!("/{path}")
            };
            format!("{scheme}://{host}{normalized_path}")
        } else {
            fallback_url.unwrap_or_else(|| "http://localhost/".to_string())
        }
    }

    fn wait_for_cookie_result<T>(rx: std::sync::mpsc::Receiver<Result<T>>, empty: T) -> Result<T> {
        match rx.recv_timeout(COOKIE_WAIT_TIMEOUT) {
            Ok(result) => result,
            // CEF explicitly documents that CookieVisitor may never be called
            // when no cookies match. Treat that case as an empty result.
            Err(RecvTimeoutError::Timeout) => Ok(empty),
            Err(RecvTimeoutError::Disconnected) => Err(Error::FailedToReceiveMessage),
        }
    }

    fn visit_cef_cookies<T: UserEvent>(
        context: &runtime::CefContext<T>,
        url: Option<String>,
    ) -> Result<Vec<Cookie<'static>>> {
        let (tx, rx) = channel();
        context.send(runtime::Message::Task(Box::new(move || {
            let Some(manager) = cookie_manager_get_global_manager(None) else {
                let _ = tx.send(cef_runtime_error("CEF cookie manager is unavailable"));
                return;
            };
            let cookies = Arc::new(Mutex::new(Vec::new()));
            let mut visitor = TauriCefCookieVisitor::new(cookies, tx.clone());
            let ok = if let Some(url) = url {
                manager.visit_url_cookies(
                    Some(&CefString::from(url.as_str())),
                    1,
                    Some(&mut visitor),
                )
            } else {
                manager.visit_all_cookies(Some(&mut visitor))
            };
            if ok == 0 {
                let _ = tx.send(cef_runtime_error("CEF cookies cannot be accessed"));
            }
        })))?;
        wait_for_cookie_result(rx, Vec::new())
    }

    fn set_cef_cookie<T: UserEvent>(
        context: &runtime::CefContext<T>,
        cookie: Cookie<'static>,
        fallback_url: Option<String>,
    ) -> Result<()> {
        let (tx, rx) = channel();
        context.send(runtime::Message::Task(Box::new(move || {
            let Some(manager) = cookie_manager_get_global_manager(None) else {
                let _ = tx.send(false);
                return;
            };
            let url = cookie_url(&cookie, fallback_url);
            let cef_cookie = tauri_cookie_to_cef(&cookie);
            let mut callback = TauriCefSetCookieCallback::new(tx.clone());
            let ok = manager.set_cookie(
                Some(&CefString::from(url.as_str())),
                Some(&cef_cookie),
                Some(&mut callback),
            );
            if ok == 0 {
                let _ = tx.send(false);
            }
        })))?;
        match rx.recv_timeout(COOKIE_WAIT_TIMEOUT) {
            Ok(true) => Ok(()),
            Ok(false) => cef_runtime_error("CEF failed to set cookie"),
            Err(RecvTimeoutError::Timeout) => cef_runtime_error("CEF set_cookie timed out"),
            Err(RecvTimeoutError::Disconnected) => Err(Error::FailedToReceiveMessage),
        }
    }

    fn delete_cef_cookie<T: UserEvent>(
        context: &runtime::CefContext<T>,
        cookie: Cookie<'static>,
        fallback_url: Option<String>,
    ) -> Result<()> {
        let (tx, rx) = channel();
        context.send(runtime::Message::Task(Box::new(move || {
            let Some(manager) = cookie_manager_get_global_manager(None) else {
                let _ = tx.send(-1);
                return;
            };
            let url = cookie_url(&cookie, fallback_url);
            let mut callback = TauriCefDeleteCookiesCallback::new(tx.clone());
            let ok = manager.delete_cookies(
                Some(&CefString::from(url.as_str())),
                Some(&CefString::from(cookie.name())),
                Some(&mut callback),
            );
            if ok == 0 {
                let _ = tx.send(-1);
            }
        })))?;
        match rx.recv_timeout(COOKIE_WAIT_TIMEOUT) {
            Ok(n) if n >= 0 => Ok(()),
            Ok(_) => cef_runtime_error("CEF failed to delete cookie"),
            Err(RecvTimeoutError::Timeout) => cef_runtime_error("CEF delete_cookie timed out"),
            Err(RecvTimeoutError::Disconnected) => Err(Error::FailedToReceiveMessage),
        }
    }

    type PageLoadHandler = Rc<Box<dyn Fn(Url, PageLoadEvent) + Send>>;

    type TauriDownloadFn =
        Arc<dyn for<'a> Fn(tauri_runtime::webview::DownloadEvent<'a>) -> bool + Send + Sync>;

    // Rc 而非 Arc:RequestHandler 回调只在 CEF UI 线程调用,无需 Sync。
    // 与 PageLoadHandler 同模式。
    type TauriNavigationFn = Rc<Box<dyn Fn(&Url) -> bool + Send>>;

    fn download_identity_url(item: &DownloadItem) -> String {
        let original = CefString::from(&item.original_url()).to_string();
        if original.is_empty() {
            CefString::from(&item.url()).to_string()
        } else {
            original
        }
    }

    wrap_load_handler! {
        pub(crate) struct InitializationLoadHandler {
            on_page_load: Option<PageLoadHandler>,
        }
        impl LoadHandler {
            fn on_load_start(&self, _browser: Option<&mut Browser>, frame: Option<&mut Frame>, _transition: TransitionType) {
                let Some(frame) = frame else { return };
                emit_page_load(frame, &self.on_page_load, PageLoadEvent::Started);
            }
            fn on_load_end(&self, _browser: Option<&mut Browser>, frame: Option<&mut Frame>, _status: ::std::os::raw::c_int) {
                if let Some(frame) = frame { emit_page_load(frame, &self.on_page_load, PageLoadEvent::Finished); }
            }
        }
    }

    wrap_download_handler! {
        pub(crate) struct TauriCefDownloadHandler {
            handler: TauriDownloadFn,
        }
        impl DownloadHandler {
            // CEF 默认 can_download 返回 0(取消),必须显式返回 1 才会进入
            // on_before_download。否则所有下载在回调链最前面就被静默取消。
            fn can_download(
                &self,
                _browser: Option<&mut Browser>,
                _url: Option<&CefString>,
                _request_method: Option<&CefString>,
            ) -> ::std::os::raw::c_int {
                1
            }

            fn on_before_download(
                &self,
                _browser: Option<&mut Browser>,
                download_item: Option<&mut DownloadItem>,
                suggested_name: Option<&CefString>,
                callback: Option<&mut BeforeDownloadCallback>,
            ) -> ::std::os::raw::c_int {
                // Alloy 风格下:返回 0 = 默认处理(取消);返回 1 必须执行 callback
                // 继续或取消下载。
                let (Some(item), Some(cb)) = (download_item, callback) else {
                    return 0;
                };
                let url_str = download_identity_url(item);
                let Ok(url) = Url::parse(&url_str) else { return 0 };
                let suggested = suggested_name
                    .map(CefString::to_string)
                    .unwrap_or_default();
                let mut destination = PathBuf::from(&suggested);
                let allow = (self.handler)(tauri_runtime::webview::DownloadEvent::Requested {
                    url,
                    destination: &mut destination,
                });
                if !allow {
                    return 0;
                }
                let dest_str = destination.to_string_lossy();
                cb.cont(Some(&CefString::from(dest_str.as_ref())), 0);
                1
            }

            fn on_download_updated(
                &self,
                _browser: Option<&mut Browser>,
                download_item: Option<&mut DownloadItem>,
                _callback: Option<&mut DownloadItemCallback>,
            ) {
                let Some(item) = download_item else { return };
                let is_complete = item.is_complete() != 0;
                let is_canceled = item.is_canceled() != 0;
                let is_interrupted = item.is_interrupted() != 0;
                // 仅在终止态(成功/取消/中断)上报一次 Finished;in-progress 更新忽略。
                if !is_complete && !is_canceled && !is_interrupted {
                    return;
                }
                let url_str = download_identity_url(item);
                let Ok(url) = Url::parse(&url_str) else { return };
                let path_str = CefString::from(&item.full_path()).to_string();
                let path = if path_str.is_empty() {
                    None
                } else {
                    Some(PathBuf::from(&path_str))
                };
                (self.handler)(tauri_runtime::webview::DownloadEvent::Finished {
                    url,
                    path,
                    success: is_complete,
                });
            }
        }
    }

    wrap_request_handler! {
        pub(crate) struct TauriCefRequestHandler {
            handler: TauriNavigationFn,
        }
        impl RequestHandler {
            // 纯导航闸门,语义与 wry 的 with_navigation_handler 对齐:仅裁决主框架
            // 导航,handler 返回 false 时 return 1(取消导航)。具体「取消后做什么」
            // (例如改为触发下载)由上层 on_navigation 闭包决定,本层不耦合下载逻辑。
            fn on_before_browse(
                &self,
                browser: Option<&mut Browser>,
                frame: Option<&mut Frame>,
                request: Option<&mut Request>,
                _user_gesture: ::std::os::raw::c_int,
                _is_redirect: ::std::os::raw::c_int,
            ) -> ::std::os::raw::c_int {
                let Some(frame) = frame else { return 0 };
                let is_main = frame.is_main() == 1;
                let Some(req) = request else { return 0 };
                let url_str = CefString::from(&req.url()).to_string();
                if !is_main {
                    return 0;
                }
                let Ok(url) = Url::parse(&url_str) else { return 0 };
                // true = 允许导航, false = 取消并改为原生下载
                if (self.handler)(&url) {
                    return 0;
                }
                if let Some(host) = browser.and_then(|b| b.host()) {
                    host.start_download(Some(&CefString::from(url_str.as_str())));
                }
                1
            }

            // start_download 发起的是「无来源页」的程序化下载,默认不带 Referer,
            // 会被 i.pximg.net 等校验 referer 的 CDN 403。这里对下载请求补回
            // Referer = 当前主框架页(即用户正在浏览的来源页),还原浏览器从页面 P
            // 点击下载图片时本应带的 Referer(策略 ORIGIN:仅发送来源页 origin)。
            fn resource_request_handler(
                &self,
                browser: Option<&mut Browser>,
                _frame: Option<&mut Frame>,
                _request: Option<&mut Request>,
                _is_navigation: ::std::os::raw::c_int,
                is_download: ::std::os::raw::c_int,
                _request_initiator: Option<&CefString>,
                _disable_default_handling: Option<&mut ::std::os::raw::c_int>,
            ) -> Option<ResourceRequestHandler> {
                if is_download != 1 {
                    return None;
                }
                let referrer = browser
                    .and_then(|b| b.main_frame())
                    .map(|f| CefString::from(&f.url()).to_string())
                    .filter(|s| !s.is_empty());
                Some(DownloadReferrerHandler::new(referrer))
            }
        }
    }

    wrap_resource_request_handler! {
        pub(crate) struct DownloadReferrerHandler {
            referrer: Option<String>,
        }
        impl ResourceRequestHandler {
            fn on_before_resource_load(
                &self,
                _browser: Option<&mut Browser>,
                _frame: Option<&mut Frame>,
                request: Option<&mut Request>,
                _callback: Option<&mut Callback>,
            ) -> ReturnValue {
                if let (Some(req), Some(referrer)) = (request, self.referrer.as_ref()) {
                    req.set_referrer(
                        Some(&CefString::from(referrer.as_str())),
                        ReferrerPolicy::ORIGIN,
                    );
                }
                ReturnValue::CONTINUE
            }
        }
    }

    fn emit_page_load(frame: &Frame, handler: &Option<PageLoadHandler>, event: PageLoadEvent) {
        if frame.is_main() != 1 {
            return;
        }
        let Some(handler) = handler else {
            return;
        };
        if let Ok(url) = Url::parse(&CefString::from(&frame.url()).to_string()) {
            handler(url, event);
        }
    }

    wrap_client! {
        pub(crate) struct ViewsClient {
            load_handler: LoadHandler,
            keyboard_handler: KeyboardHandler,
            context_menu_handler: ContextMenuHandler,
            download_handler: Option<DownloadHandler>,
            request_handler: Option<RequestHandler>,
            life_span_handler: Option<LifeSpanHandler>,
        }
        impl Client {
            fn load_handler(&self) -> Option<LoadHandler> { Some(self.load_handler.clone()) }
            fn keyboard_handler(&self) -> Option<KeyboardHandler> { Some(self.keyboard_handler.clone()) }
            fn context_menu_handler(&self) -> Option<ContextMenuHandler> { Some(self.context_menu_handler.clone()) }
            fn download_handler(&self) -> Option<DownloadHandler> { self.download_handler.clone() }
            fn request_handler(&self) -> Option<RequestHandler> { self.request_handler.clone() }
            fn life_span_handler(&self) -> Option<LifeSpanHandler> { self.life_span_handler.clone() }
        }
    }

    wrap_context_menu_handler! {
        pub(crate) struct DisabledContextMenuHandler {}
        impl ContextMenuHandler {
            // 清空菜单模型:CEF 在 Client 未提供 ContextMenuHandler 时会退回内置的
            // 默认菜单(后退/前进/重新加载/查看网页源代码/检查元素…),与裸 Chromium
            // 一致。kabegame 前端用自有的 Vue 右键菜单(TaskContextMenu 等),这里
            // 全局清空模型抑制原生菜单,交给页面 JS 的 contextmenu 处理。
            fn on_before_context_menu(&self, _browser: Option<&mut Browser>, _frame: Option<&mut Frame>, _params: Option<&mut ContextMenuParams>, model: Option<&mut MenuModel>) {
                if let Some(model) = model {
                    model.clear();
                }
            }
        }
    }

    wrap_life_span_handler! {
        // popup 拦截:Linux 上 tauri-runtime 的 NewWindowFeatures/NewWindowOpener
        // 携带 webkit2gtk::WebView 字段,CEF runtime 无法构造,因此无法把 popup
        // 请求转交给 tauri 的 new_window_handler 闭包裁决。折中语义:凡上层注册了
        // on_new_window 的 webview,tab 类 disposition(target="_blank"、Ctrl/中键
        // 点击等)视为「禁止弹新窗口」,一律取消,http/https 目标改为在 opener 主
        // 框架内导航(与 wry 平台上 surf 的 navigate + Deny 行为对齐)。
        //
        // 例外:真正的 `window.open(url, name, "width=..,height=..")` 弹窗以
        // NEW_POPUP disposition 到达。OAuth 登录、分享等流程依赖 window.open() 返回
        // 可用的 WindowProxy 并与 opener 双向 postMessage(如 Google Identity
        // Services),取消后 window.open() 返回 null,页面会在 popup.postMessage
        // 处抛 "Cannot read properties of null (reading 'postMessage')" 并白屏。
        // 对 NEW_POPUP 放行,退回 CEF 默认弹窗行为(与未注册 on_new_window 的
        // webview 一致,生成可与 opener 通信的真实弹窗)。
        //
        // 所有 webview 都挂本 handler,以便 popup 继承 renderer document-start
        // initialization scripts;是否把 tab 类 popup 改为本页导航仍由
        // redirect_tab_popups 区分。devtools 走 on_before_dev_tools_popup,不受影响。
        pub(crate) struct PopupToNavigationLifeSpanHandler {
            initialization_scripts_payload: String,
            redirect_tab_popups: bool,
        }
        impl LifeSpanHandler {
            fn on_before_popup(
                &self,
                browser: Option<&mut Browser>,
                _frame: Option<&mut Frame>,
                _popup_id: ::std::os::raw::c_int,
                target_url: Option<&CefString>,
                _target_frame_name: Option<&CefString>,
                target_disposition: WindowOpenDisposition,
                _user_gesture: ::std::os::raw::c_int,
                _popup_features: Option<&PopupFeatures>,
                _window_info: Option<&mut WindowInfo>,
                _client: Option<&mut Option<Client>>,
                _settings: Option<&mut BrowserSettings>,
                extra_info: Option<&mut Option<DictionaryValue>>,
                _no_javascript_access: Option<&mut ::std::os::raw::c_int>,
            ) -> ::std::os::raw::c_int {
                if let Some(extra_info) = extra_info {
                    match crate::subprocess::initialization_scripts_extra_info(
                        &self.initialization_scripts_payload,
                    ) {
                        Ok(initialization_scripts) => *extra_info = Some(initialization_scripts),
                        Err(error) => eprintln!(
                            "[cef-runtime] failed to attach popup initialization scripts: {error}"
                        ),
                    }
                }
                // 返回 0 = 放行,让 CEF 以默认弹窗行为生成真实窗口(见上方注释)。
                if target_disposition == WindowOpenDisposition::NEW_POPUP {
                    return 0;
                }
                if !self.redirect_tab_popups {
                    return 0;
                }
                let url = target_url.map(CefString::to_string).unwrap_or_default();
                let is_web_url = Url::parse(&url)
                    .map(|u| matches!(u.scheme(), "http" | "https"))
                    .unwrap_or(false);
                if is_web_url {
                    if let Some(main_frame) = browser.and_then(|b| b.main_frame()) {
                        main_frame.load_url(Some(&CefString::from(url.as_str())));
                    }
                }
                // 返回 1 = 取消 popup(about:blank 等非 web scheme 仅取消,不导航)
                1
            }
        }
    }

    wrap_keyboard_handler! {
        pub(crate) struct DevToolsKeyboardHandler {}
        impl KeyboardHandler {
            #[cfg(target_os = "linux")]
            fn on_pre_key_event(&self, browser: Option<&mut Browser>, event: Option<&KeyEvent>, _os_event: Option<&mut cef::sys::XEvent>, _is_keyboard_shortcut: Option<&mut ::std::os::raw::c_int>) -> ::std::os::raw::c_int {
                handle_devtools_shortcut(browser, event)
            }

            #[cfg(target_os = "windows")]
            fn on_pre_key_event(&self, browser: Option<&mut Browser>, event: Option<&KeyEvent>, _os_event: Option<&mut cef::sys::MSG>, _is_keyboard_shortcut: Option<&mut ::std::os::raw::c_int>) -> ::std::os::raw::c_int {
                handle_devtools_shortcut(browser, event)
            }

            #[cfg(target_os = "macos")]
            fn on_pre_key_event(&self, browser: Option<&mut Browser>, event: Option<&KeyEvent>, _os_event: *mut u8, _is_keyboard_shortcut: Option<&mut ::std::os::raw::c_int>) -> ::std::os::raw::c_int {
                handle_devtools_shortcut(browser, event)
            }
        }
    }

    fn handle_devtools_shortcut(
        browser: Option<&mut Browser>,
        event: Option<&KeyEvent>,
    ) -> ::std::os::raw::c_int {
        let Some(event) = event else { return 0 };
        let devtools_modifiers = event_flag_primary_modifier() | event_flag_shift();
        if event.type_ != KeyEventType::RAWKEYDOWN
            || event.windows_key_code != b'D' as i32
            || event.modifiers & devtools_modifiers != devtools_modifiers
        {
            return 0;
        }
        if let Some(host) = browser.and_then(|browser| browser.host()) {
            host.show_dev_tools(
                Some(&WindowInfo::default()),
                None,
                Some(&BrowserSettings::default()),
                None,
            );
            return 1;
        }
        0
    }

    #[cfg(target_os = "macos")]
    fn event_flag_primary_modifier() -> u32 {
        cef::sys::cef_event_flags_t::EVENTFLAG_COMMAND_DOWN.0 as u32
    }
    #[cfg(not(target_os = "macos"))]
    fn event_flag_primary_modifier() -> u32 {
        cef::sys::cef_event_flags_t::EVENTFLAG_CONTROL_DOWN.0 as u32
    }
    fn event_flag_shift() -> u32 {
        cef::sys::cef_event_flags_t::EVENTFLAG_SHIFT_DOWN.0 as u32
    }

    /// Surf 顶部导航栏 webview 的固定高度(DIP;CEF Views 坐标系为 DIP,由 Chromium
    /// 按显示器缩放自动转物理像素)。导航栏 label 以 `-navbar` 结尾。
    pub(crate) const SURF_NAVBAR_DIP_HEIGHT: i32 = 40;

    wrap_browser_view_delegate! {
        pub(crate) struct ViewsBrowserViewDelegate {
            label: String,
            // on_browser_created 时一次性取出写入全局注册表。
            pending_protocols: Arc<Mutex<Option<protocol::WebviewProtocols>>>,
        }
        impl ViewDelegate {
            fn preferred_size(&self, _view: Option<&mut View>) -> cef::Size {
                // Surf 导航栏以固定 DIP 高度参与窗口的垂直 BoxLayout;内容 webview 用
                // flex=1 撑满剩余高度。
                //
                // 两个维度都必须非 0:CEF(view_view.h)仅在 delegate 返回的 Size
                // 非 empty(gfx::Size::IsEmpty() = 任一维度为 0)时才采用,否则回退
                // 到 views::WebView 自身的 preferred size(跟随视图当前尺寸变化,
                // 会导致导航栏高度锁死在历史尺寸)。宽度由 BoxLayout 的 cross-axis
                // STRETCH 拉伸到窗口宽,这里的值不参与布局,取 1 即可。
                if self.label.ends_with("-navbar") {
                    cef::Size { width: 1, height: SURF_NAVBAR_DIP_HEIGHT }
                } else {
                    cef::Size { width: 1, height: 1 }
                }
            }
        }
        impl BrowserViewDelegate {
            fn browser_runtime_style(&self) -> RuntimeStyle { RuntimeStyle::ALLOY }

            fn on_browser_created(
                &self,
                _browser_view: Option<&mut BrowserView>,
                browser: Option<&mut Browser>,
            ) {
                let Some(browser) = browser else { return };
                let id = browser.identifier();
                register_webview_browser(&self.label, id);
                if let Some(p) = self.pending_protocols.lock().unwrap().take() {
                    protocol::insert_browser_protocols(id, p);
                }
            }

            fn on_browser_destroyed(
                &self,
                _browser_view: Option<&mut BrowserView>,
                browser: Option<&mut Browser>,
            ) {
                if let Some(browser) = browser {
                    remove_webview_browser(browser.identifier());
                    protocol::remove_browser_protocols(browser.identifier());
                }
            }
        }
    }

    pub(crate) struct CefBrowserView {
        pub(crate) inner: BrowserView,
    }
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Send for CefBrowserView {}
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Sync for CefBrowserView {}

    pub(crate) struct CefWebviewState {
        pub(crate) label: String,
        pub(crate) browser_view: Option<CefBrowserView>,
        pub(crate) url: String,
        pub(crate) auto_resize: bool,
        pub(crate) visible: bool,
        pub(crate) listeners: crate::window::WebviewListeners,
    }

    impl CefWebviewState {
        pub(crate) fn resolve_browser(&self) -> Option<Browser> {
            self.browser_view
                .as_ref()
                .and_then(|view| view.inner.browser())
        }
    }

    pub(crate) fn create_cef_browser_view<T: UserEvent>(
        window_id: WindowId,
        webview_id: runtime::WebviewId,
        context: runtime::CefContext<T>,
        mut pending: PendingWebview<T, Cef<T>>,
    ) -> Result<(CefWebviewState, BrowserView)> {
        let detached = detached_webview(pending.label.clone(), window_id, webview_id, context);
        let initial_url = pending.url.clone();
        ipc::install_post_message_bridge(&mut pending, detached, initial_url);
        // 从 pending 取出所有协议 handler 并向 CEF 全局注册各 scheme factory(每个
        // scheme 首次注册时才实际调用 register_scheme_handler_factory)。
        // 协议表在 on_browser_created 时通过 delegate 以 browser id 为键写入注册表。
        let webview_label = pending.label.clone();
        let (label, schemes) = protocol::take_webview_protocols(&mut pending)?;
        let pending_protocols = Arc::new(Mutex::new(Some(protocol::WebviewProtocols {
            label,
            schemes,
        })));
        let scripts = std::mem::take(&mut pending.webview_attributes.initialization_scripts);
        let initialization_scripts = scripts
            .into_iter()
            .map(|script| crate::subprocess::InitializationScript {
                script: script.script,
                for_main_frame_only: script.for_main_frame_only,
            })
            .collect::<Vec<_>>();
        let initialization_scripts_payload = crate::subprocess::encode_initialization_scripts(
            &initialization_scripts,
        )
        .map_err(|error| {
            Error::CreateWebview(Box::new(io::Error::other(format!(
                "failed to encode CEF initialization scripts: {error}"
            ))))
        })?;
        let mut initialization_scripts_extra_info =
            crate::subprocess::initialization_scripts_extra_info(&initialization_scripts_payload)
                .map_err(|error| Error::CreateWebview(Box::new(io::Error::other(error))))?;
        let on_page_load = pending.on_page_load_handler.take().map(Rc::new);
        let download_handler = pending
            .download_handler
            .take()
            .map(TauriCefDownloadHandler::new);
        let navigation_handler = pending
            .navigation_handler
            .take()
            .map(|h| TauriCefRequestHandler::new(Rc::new(h)));
        // 无法在 Linux 上调用 new_window_handler 本体(见 PopupToNavigationLifeSpanHandler
        // 注释),仅以其存在与否作为「取消 popup 改本页导航」的开关。
        let redirect_tab_popups = pending.new_window_handler.take().is_some();
        let life_span_handler = Some(PopupToNavigationLifeSpanHandler::new(
            initialization_scripts_payload,
            redirect_tab_popups,
        ));
        let mut client = ViewsClient::new(
            InitializationLoadHandler::new(on_page_load),
            DevToolsKeyboardHandler::new(),
            DisabledContextMenuHandler::new(),
            download_handler,
            navigation_handler,
            life_span_handler,
        );
        let mut delegate = ViewsBrowserViewDelegate::new(webview_label, pending_protocols);
        let url = pending.url.clone();
        // request_context = None: 使用全局 RequestContext(由 CefSettings.cache_path 决定落盘)。
        // 全局 context 在 cef_initialize 期间同步初始化,不会触发异步 15s 超时。
        let browser_view = browser_view_create(
            Some(&mut client),
            Some(&CefString::from(url.as_str())),
            Some(&BrowserSettings::default()),
            Some(&mut initialization_scripts_extra_info),
            None,
            Some(&mut delegate),
        )
        .ok_or_else(|| {
            Error::CreateWebview(Box::new(std::io::Error::other(
                "CEF failed to create a BrowserView",
            )))
        })?;
        let state = CefWebviewState {
            label: pending.label,
            browser_view: Some(CefBrowserView {
                inner: browser_view.clone(),
            }),
            url,
            auto_resize: true,
            visible: true,
            listeners: Vec::new(),
        };
        Ok((state, browser_view))
    }

    pub(crate) fn detached_webview<T: UserEvent>(
        label: String,
        window_id: WindowId,
        webview_id: runtime::WebviewId,
        context: runtime::CefContext<T>,
    ) -> DetachedWebview<T, Cef<T>> {
        DetachedWebview {
            label,
            dispatcher: CefWebviewDispatcher {
                window_id,
                webview_id,
                context,
            },
        }
    }
}

pub use imp::*;
