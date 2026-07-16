//! Runtime / RuntimeHandle / EventLoopProxy 实现。
//!
//! 这一层负责把 Tauri 的 runtime trait 映射到 tao 事件循环和 CEF 外部消息泵。
//! 所有 CEF browser 操作都应通过内部 `Message` 投递回主循环,避免跨线程直接
//! 调用 CEF UI 对象。

mod imp {
    #![allow(non_upper_case_globals)]
    use std::{
        any::Any,
        cell::{Cell, RefCell},
        collections::{BTreeMap, VecDeque},
        fmt,
        sync::{
            atomic::{AtomicBool, AtomicPtr, AtomicU32, Ordering},
            mpsc::{channel, Sender},
            Arc, Mutex, OnceLock,
        },
        thread::{current as current_thread, ThreadId as StdThreadId},
        time::{Duration, Instant},
    };

    use cef::{args::Args, *};
    #[cfg(target_os = "linux")]
    use gtk::glib::MainContext;
    #[cfg(target_os = "linux")]
    use tao::platform::unix::EventLoopBuilderExtUnix;
    #[cfg(target_os = "windows")]
    use tao::platform::windows::EventLoopBuilderExtWindows;
    use tao::{
        event_loop::{ControlFlow, EventLoop, EventLoopBuilder, EventLoopProxy},
        window::Icon as TaoIcon,
    };
    use tauri_runtime::window::WindowId;
    use tauri_runtime::{
        dpi::{PhysicalPosition, PhysicalSize, Position, Size},
        monitor::Monitor,
        webview::{DetachedWebview, PendingWebview},
        window::{DetachedWindow, DetachedWindowWebview, PendingWindow, RawWindow, WindowEvent},
        DeviceEventFilter, Error, EventLoopProxy as RuntimeEventLoopProxy,
        ExitRequestedEventAction, Result, RunEvent, Runtime, RuntimeHandle, RuntimeInitArgs,
        UserEvent, WebviewEventId, WindowEventId,
    };
    use tauri_utils::Theme;

    use crate::{webview, window, Cef, CefEventLoopProxy, CefHandle};

    /// runtime 内部使用的 webview 标识。
    ///
    /// Tauri 的 `WindowId` 来自 `tauri-runtime`,但 webview 没有直接暴露一个
    /// 可复用的公开 id 类型,所以这里维护独立递增 id。
    pub(crate) type WebviewId = u32;

    static WINDOWED_QUIT: OnceLock<Arc<AtomicBool>> = OnceLock::new();
    static WINDOWED_CONTEXT_INITIALIZED: AtomicBool = AtomicBool::new(false);
    const CHROME_ONLY_DISABLED_FEATURES: &[&str] = &[
        "ImmersiveReadAnything",
        // `tauri`/`asset` custom schemes are registered with `SECURE` below, so
        // `http://tauri.localhost` counts as a secure origin to Chromium's Local/
        // Private Network Access checks. LNA then requires a user permission grant
        // before that "secure" page may reach loopback services (e.g. the app's own
        // `http://127.0.0.1:<port>` media server in `http_server.rs`). Real Chrome
        // shows a permission prompt for this; CEF windowed mode has no such UI, so
        // the request is denied before any socket opens — no CSP violation, no
        // network entry, images just never load. Disable both the legacy PNA and
        // current LNA feature names since the exact one gated by CEF's pinned
        // Chromium version isn't guaranteed.
        "LocalNetworkAccessChecks",
        "PrivateNetworkAccessPermissionPrompt",
        "PrivateNetworkAccessRespectPreflightResults",
        "PrivateNetworkAccessSendPreflights",
        "BlockInsecurePrivateNetworkRequests",
    ];

    fn windowed_quit() -> Arc<AtomicBool> {
        WINDOWED_QUIT
            .get_or_init(|| Arc::new(AtomicBool::new(false)))
            .clone()
    }

    fn disable_chrome_only_features(command_line: &CommandLine) {
        let switch = CefString::from("disable-features");
        let mut value = if command_line.has_switch(Some(&switch)) == 1 {
            CefString::from(&command_line.switch_value(Some(&switch))).to_string()
        } else {
            String::new()
        };

        for feature in CHROME_ONLY_DISABLED_FEATURES {
            if value.split(',').any(|entry| entry == *feature) {
                continue;
            }
            if !value.is_empty() {
                value.push(',');
            }
            value.push_str(feature);
        }

        command_line
            .append_switch_with_value(Some(&switch), Some(&CefString::from(value.as_str())));
    }

    fn apply_windowed_gpu_mode(command_line: &CommandLine) {
        let mode = std::env::var("KABEGAME_CEF_GPU_MODE")
            .or_else(|_| std::env::var("CEF_WINDOWED_GPU_MODE"))
            .unwrap_or_else(|_| default_windowed_gpu_mode().to_string());

        match mode.as_str() {
            "" | "default" => {}
            "disabled" | "disable" | "off" => {
                command_line.append_switch(Some(&CefString::from("disable-gpu")));
                command_line.append_switch(Some(&CefString::from("disable-gpu-compositing")));
            }
            angle_backend => {
                command_line.append_switch_with_value(
                    Some(&CefString::from("use-angle")),
                    Some(&CefString::from(angle_backend)),
                );
                if angle_backend == "vulkan" {
                    command_line.append_switch_with_value(
                        Some(&CefString::from("enable-features")),
                        Some(&CefString::from("Vulkan")),
                    );
                }
            }
        }
    }

    fn default_windowed_gpu_mode() -> &'static str {
        if cfg!(target_os = "linux") {
            // Linux 视频合成在 ANGLE/GL 下比 Vulkan 更稳。
            "gl"
        } else {
            "default"
        }
    }

    /// CEF runtime 的主状态。
    ///
    /// 它只应在 tao 主事件循环线程上被实际驱动。`RefCell` 存储窗口/webview
    /// 表是因为 tao `run_return` 闭包在单线程内同步访问这些状态,不需要跨线程
    /// 锁；跨线程请求通过 `CefContext::send` 进入主循环。
    pub(crate) struct CefRuntime<T: UserEvent> {
        pub(crate) context: CefContext<T>,
        pub(crate) event_loop: EventLoop<Message<T>>,
        windows: Arc<CefWindows>,
        webviews: Arc<CefWebviews>,
        pub(crate) exit_code: Cell<i32>,
    }

    impl<T: UserEvent> fmt::Debug for CefRuntime<T> {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            f.debug_struct("CefRuntime")
                .field("windows", &self.context.windows.0.borrow().len())
                .field("webviews", &self.context.webviews.0.borrow().len())
                .finish()
        }
    }

    /// 可克隆的 runtime 上下文。
    ///
    /// dispatcher/handle/proxy 都持有它,用 tao `EventLoopProxy` 把操作投递回
    /// runtime 主线程,并集中分配 window/webview/event listener id。
    #[derive(Clone)]
    pub(crate) struct CefContext<T: UserEvent> {
        tao_proxy: EventLoopProxy<Message<T>>,
        messages: Arc<CefMessageQueue<T>>,
        main_thread_id: StdThreadId,
        windows: Arc<CefWindows>,
        webviews: Arc<CefWebviews>,
        main_runtime: Arc<AtomicPtr<CefRuntime<T>>>,
        next_window_id: Arc<AtomicU32>,
        next_webview_id: Arc<AtomicU32>,
        next_window_event_id: Arc<AtomicU32>,
        next_webview_event_id: Arc<AtomicU32>,
        // 启动期(`new_any_thread`,event_loop 已建)枚举的显示器快照。
        // RuntimeHandle 在 setup 阶段(主循环尚未运行、`main_runtime` 仍为 null)
        // 也能据此返回 monitor —— kabegame 用它算主窗口居中坐标。
        monitors: Arc<Mutex<MonitorSnapshot>>,
    }

    #[derive(Default)]
    pub(crate) struct MonitorSnapshot {
        primary: Option<Monitor>,
        all: Vec<Monitor>,
    }

    /// 用 CEF/Chromium 的 `Display` 构造 `Monitor`。
    ///
    /// 关键:Chromium 正确处理 XWayland 下的小数缩放(`device_scale_factor` 给真实
    /// 1.4 等),而 tao/GTK 的 `MonitorHandle::scale_factor()` 在 XWayland 上会误报
    /// 整数 1.0,导致依赖 scale 的居中计算(kabegame 自己算窗口居中位置)整体偏移。
    ///
    /// CEF `bounds()` 是 DIP(逻辑像素);Tauri `Monitor` 约定 size/position 为物理
    /// 像素,故按 scale 换算回物理。
    fn monitor_from_cef_display(display: &Display) -> Monitor {
        let bounds = display.bounds();
        let work_area = display.work_area();
        let scale = f64::from(display.device_scale_factor()).max(1.0);
        let phys_i = |v: i32| (v as f64 * scale).round() as i32;
        let phys_u = |v: i32| (v.max(0) as f64 * scale).round() as u32;
        let position = PhysicalPosition::new(phys_i(bounds.x), phys_i(bounds.y));
        let size = PhysicalSize::new(phys_u(bounds.width), phys_u(bounds.height));
        let work_area_position = PhysicalPosition::new(phys_i(work_area.x), phys_i(work_area.y));
        let work_area_size = PhysicalSize::new(phys_u(work_area.width), phys_u(work_area.height));
        Monitor {
            name: None,
            position,
            size,
            work_area: tauri_runtime::dpi::PhysicalRect {
                position: work_area_position,
                size: work_area_size,
            },
            scale_factor: scale,
        }
    }

    /// 启动期从 CEF 枚举显示器快照。CEF 未就绪(返回空)时返回 `None`,调用方回退 tao。
    fn cef_monitor_snapshot() -> Option<MonitorSnapshot> {
        let primary = display_get_primary().map(|d| monitor_from_cef_display(&d));
        // `display_get_alls` uses the vector length as its output capacity. An
        // empty vector only asks CEF for the count and yields no display values.
        let mut displays = vec![None; display_get_count()];
        display_get_alls(Some(&mut displays));
        let all: Vec<Monitor> = displays
            .into_iter()
            .flatten()
            .map(|d| monitor_from_cef_display(&d))
            .collect();
        if primary.is_none() && all.is_empty() {
            return None;
        }
        Some(MonitorSnapshot {
            primary: primary.or_else(|| all.first().cloned()),
            all,
        })
    }

    fn tao_monitor_snapshot<T: UserEvent>(event_loop: &EventLoop<Message<T>>) -> MonitorSnapshot {
        MonitorSnapshot {
            primary: event_loop.primary_monitor().map(window::monitor_from_tao),
            all: event_loop
                .available_monitors()
                .map(window::monitor_from_tao)
                .collect(),
        }
    }

    impl<T: UserEvent> fmt::Debug for CefContext<T> {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            f.debug_struct("CefContext").finish_non_exhaustive()
        }
    }

    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl<T: UserEvent> Send for CefContext<T> {}
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl<T: UserEvent> Sync for CefContext<T> {}

    impl<T: UserEvent> CefContext<T> {
        /// 向 runtime 主循环发送一条内部消息。
        ///
        /// CEF/GLib pump 轮询内部队列。调用方不应直接操作 CEF UI 对象。
        pub(crate) fn send(&self, message: Message<T>) -> Result<()> {
            match message {
                Message::UserEvent(_) | Message::RequestExit(_) => self.enqueue(message),
                message => {
                    if current_thread().id() == self.main_thread_id {
                        let runtime = self.main_runtime.load(Ordering::Acquire);
                        if !runtime.is_null() {
                            return unsafe { &*runtime }.handle_main_thread_message(message);
                        }
                        // 主循环尚未运行(`main_runtime` 为 null,如 Builder::build 阶段
                        // macOS 默认菜单经 run_on_main_thread 创建并同步等待结果):
                        // Task 只要求在主线程执行、不依赖 runtime 状态,必须内联执行,
                        // 否则入队后无人消费,调用方 recv 死锁。
                        if let Message::Task(task) = message {
                            task();
                            return Ok(());
                        }
                    }
                    self.enqueue(message)
                }
            }
        }

        fn enqueue(&self, message: Message<T>) -> Result<()> {
            self.messages.push(message);
            let _ = self.tao_proxy.send_event(Message::Wake);
            Ok(())
        }

        fn pop_message(&self) -> Option<Message<T>> {
            self.messages.pop()
        }

        /// 分配一个新的 Tauri window id。
        pub(crate) fn next_window_id(&self) -> WindowId {
            self.next_window_id.fetch_add(1, Ordering::Relaxed).into()
        }

        /// 分配一个新的内部 webview id。
        pub(crate) fn next_webview_id(&self) -> WebviewId {
            self.next_webview_id.fetch_add(1, Ordering::Relaxed)
        }

        /// 分配一个新的窗口事件监听器 id。
        pub(crate) fn next_window_event_id(&self) -> WindowEventId {
            self.next_window_event_id.fetch_add(1, Ordering::Relaxed)
        }

        /// 分配一个新的 webview 事件监听器 id。
        pub(crate) fn next_webview_event_id(&self) -> WebviewEventId {
            self.next_webview_event_id.fetch_add(1, Ordering::Relaxed)
        }
    }

    struct CefMessageQueue<T: UserEvent>(Mutex<VecDeque<Message<T>>>);

    impl<T: UserEvent> CefMessageQueue<T> {
        fn new() -> Self {
            Self(Mutex::new(VecDeque::new()))
        }

        fn push(&self, message: Message<T>) {
            self.0
                .lock()
                .expect("CEF message queue mutex poisoned")
                .push_back(message);
        }

        fn pop(&self) -> Option<Message<T>> {
            self.0
                .lock()
                .expect("CEF message queue mutex poisoned")
                .pop_front()
        }
    }

    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl<T: UserEvent> Send for CefMessageQueue<T> {}
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl<T: UserEvent> Sync for CefMessageQueue<T> {}

    struct CefWindows(RefCell<BTreeMap<WindowId, CefWindowState>>);
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Send for CefWindows {}
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Sync for CefWindows {}

    struct CefWebviews(RefCell<BTreeMap<WebviewId, webview::CefWebviewState>>);
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Send for CefWebviews {}
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Sync for CefWebviews {}

    /// runtime 内部消息。
    ///
    /// Tauri runtime trait 的大多数方法都可以被任意线程调用；这里把它们统一
    /// 表达为消息,由 tao 主循环消费后再操作窗口、webview 或回调上层 Tauri。
    pub(crate) enum Message<T: UserEvent> {
        /// Tauri 用户自定义事件。
        UserEvent(T),
        /// tao-only wakeup used after a message has been queued.
        Wake,
        /// 需要在主线程执行的一次性任务。
        Task(Box<dyn FnOnce() + Send>),
        /// 请求退出事件循环。
        RequestExit(i32),
        /// 在 CEF UI 线程创建 Views 窗口,并返回 Tauri detached window。
        CreateWindow {
            window_id: WindowId,
            pending: PendingWindow<T, Cef<T>>,
            after_window_creation: Option<Box<dyn Fn(RawWindow) + Send>>,
            tx: Sender<Result<DetachedWindow<T, Cef<T>>>>,
        },
        /// 在已存在 CEF Views 窗口上创建 BrowserView。
        CreateWebview {
            window_id: WindowId,
            webview_id: WebviewId,
            pending: PendingWebview<T, Cef<T>>,
            tx: Sender<Result<DetachedWebview<T, Cef<T>>>>,
        },
        /// 派发窗口操作或 getter。
        Window(WindowId, WindowMessage),
        /// 派发 webview 操作或 getter。
        Webview(WebviewId, WebviewMessage),
        /// windowed(CEF Views)的窗口事件回流:delegate 在 UI 线程产生,经
        /// `CefContext::enqueue` 投入队列,由主循环 `emit_mapped_window_event`
        /// 分发给该窗口的 listeners + `RunEvent::WindowEvent`。
        CefWindowEvent(WindowId, WindowEvent),
        /// CEF `can_close` 首次被调用,需主循环向上层发 `CloseRequested` 裁决。
        /// 由 delegate 的 `close_requester` 投递;主循环处理后决定是否置
        /// `close_confirmed` 并再次触发 `cef_window.close()`。
        WindowCloseRequested(WindowId),
    }

    /// 类型擦除的窗口事件发射器,交给 CEF Views `WindowDelegate` 在回调里调用。
    ///
    /// 闭包内部捕获 `CefContext<T>` 与 `WindowId`,把事件 `enqueue` 成
    /// `Message::CefWindowEvent`;delegate 本身不需要泛型。
    pub(crate) type WindowEventEmitter = Arc<dyn Fn(WindowEvent) + Send + Sync>;

    impl<T: UserEvent> fmt::Debug for Message<T> {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            match self {
                Self::UserEvent(event) => f.debug_tuple("UserEvent").field(event).finish(),
                Self::Wake => f.write_str("Wake"),
                Self::Task(_) => f.write_str("Task"),
                Self::RequestExit(code) => f.debug_tuple("RequestExit").field(code).finish(),
                Self::CreateWindow { window_id, .. } => {
                    f.debug_tuple("CreateWindow").field(window_id).finish()
                }
                Self::CreateWebview {
                    window_id,
                    webview_id,
                    ..
                } => f
                    .debug_tuple("CreateWebview")
                    .field(window_id)
                    .field(webview_id)
                    .finish(),
                Self::Window(id, _) => f.debug_tuple("Window").field(id).finish(),
                Self::Webview(id, _) => f.debug_tuple("Webview").field(id).finish(),
                Self::CefWindowEvent(id, _) => f.debug_tuple("CefWindowEvent").field(id).finish(),
                Self::WindowCloseRequested(id) => {
                    f.debug_tuple("WindowCloseRequested").field(id).finish()
                }
            }
        }
    }

    /// 单个 CEF Views 窗口的运行期状态。
    ///
    /// 记录 Tauri label、原生窗口、窗口事件监听器以及挂载到该窗口上的 CEF
    /// webview id。
    pub(crate) struct CefWindowState {
        pub(crate) label: String,
        pub(crate) kind: CefWindowKind,
        pub(crate) listeners: window::WindowListeners,
        pub(crate) webviews: Vec<WebviewId>,
    }

    pub(crate) enum CefWindowKind {
        Windowed(WindowedWindowState),
    }

    pub(crate) struct WindowedWindowState {
        shared: Arc<Mutex<WindowedWindowShared>>,
        title: String,
        size: PhysicalSize<u32>,
        position: Option<PhysicalPosition<i32>>,
        resizable: bool,
        maximizable: bool,
        minimizable: bool,
        closable: bool,
        decorated: bool,
        visible: bool,
        fullscreen: bool,
        maximized: bool,
        minimized: bool,
        focused: bool,
        always_on_top: bool,
        #[cfg(target_os = "windows")]
        native_options: WindowsNativeWindowOptions,
    }

    impl WindowedWindowState {
        /// 在 CEF UI 线程上,用活的 CEF Views `Window` 执行闭包(窗口已创建时)。
        ///
        /// windowed getter 借此直接查询真实窗口状态(尺寸/位置/最大化/全屏/DPI…),
        /// 而非读可能过期的缓存;窗口尚未创建或不可用时返回 `None`,调用方回退到缓存。
        ///
        /// 仅应在窗口消息循环(= CEF UI 线程)上调用 —— 与 `apply_windowed_window_set`
        /// 一致;CEF Views API 要求在 UI 线程访问。
        fn with_cef_window<R>(&self, f: impl FnOnce(&cef::Window) -> R) -> Option<R> {
            let shared = self.shared.lock().ok()?;
            shared.window.as_ref().map(|w| f(&w.inner))
        }
    }

    struct WindowedWindowShared {
        window: Option<CefWindow>,
        browser_view: Option<webview::CefBrowserView>,
        browser_view_attached: bool,
        chrome_view: Option<webview::CefBrowserView>,
        chrome_view_attached: bool,
        quit: Arc<AtomicBool>,
        /// `can_close` 已向主循环发出 `CloseRequested` 请求,正等待裁决。
        close_requested: bool,
        /// 上层未拦截,已确认允许销毁,`can_close` 下次调用直接放行。
        close_confirmed: bool,
    }

    pub(crate) struct CefWindow {
        inner: cef::Window,
    }

    #[cfg(target_os = "windows")]
    #[derive(Clone, Copy, Debug)]
    struct WindowsNativeWindowOptions {
        owner_hwnd: Option<isize>,
        parent_hwnd: Option<isize>,
        drag_and_drop: bool,
        shadow: Option<bool>,
    }

    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Send for CefWindow {}
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Sync for CefWindow {}

    /// 允许 GTK window 跨内部 mpsc 返回的 wrapper。
    ///
    /// GTK 类型本身不是 `Send`,但这里的通道只用于主循环同步回复 dispatcher
    /// getter,使用方式与 `tauri-runtime-wry` 的 wrapper 相同。
    #[cfg(target_os = "linux")]
    pub(crate) struct GtkWindow(pub gtk::ApplicationWindow);
    #[cfg(target_os = "linux")]
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Send for GtkWindow {}

    /// 允许 GTK box 跨内部 mpsc 返回的 wrapper。
    #[cfg(target_os = "linux")]
    pub(crate) struct GtkBox(pub gtk::Box);
    #[cfg(target_os = "linux")]
    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Send for GtkBox {}

    /// 允许 raw window handle 跨内部 mpsc 返回的 wrapper。
    pub(crate) struct SendRawWindowHandle(pub raw_window_handle::RawWindowHandle);
    unsafe impl Send for SendRawWindowHandle {}

    /// 窗口层消息。
    ///
    /// getter 使用 `Any` 装箱返回,由 dispatcher 按请求类型 downcast；setter 则
    /// 通过 `WindowSet` 聚合,避免为每个窗口操作定义一条顶层消息。
    pub(crate) enum WindowMessage {
        AddEventListener(WindowEventId, Box<dyn Fn(&WindowEvent) + Send>),
        Get(WindowGetterKind, Sender<Result<Box<dyn Any + Send>>>),
        MonitorFromPoint(Sender<Option<tao::monitor::MonitorHandle>>, f64, f64),
        Set(WindowSet),
        Center,
        RequestUserAttention(Option<tao::window::UserAttentionType>),
    }

    /// 类型化窗口 getter 请求。
    ///
    /// `R` 只存在于编译期,帮助调用点表达期望返回类型；运行期实际发送的是
    /// `WindowGetterKind`,响应通过 `Any` downcast 回 `R`。
    pub(crate) struct WindowGetter<R> {
        pub(crate) kind: WindowGetterKind,
        _marker: std::marker::PhantomData<R>,
    }

    /// 窗口 getter 的运行期种类。
    #[derive(Clone, Copy)]
    pub(crate) enum WindowGetterKind {
        ScaleFactor,
        InnerPosition,
        OuterPosition,
        InnerSize,
        OuterSize,
        IsFullscreen,
        IsMinimized,
        IsMaximized,
        IsFocused,
        IsDecorated,
        IsResizable,
        IsMaximizable,
        IsMinimizable,
        IsClosable,
        IsVisible,
        IsEnabled,
        IsAlwaysOnTop,
        Title,
        CurrentMonitor,
        PrimaryMonitor,
        AvailableMonitors,
        #[cfg(target_os = "linux")]
        GtkWindow,
        #[cfg(target_os = "linux")]
        GtkBox,
        RawWindowHandle,
        Theme,
    }

    impl WindowGetter<f64> {
        pub(crate) const ScaleFactor: Self = Self::from_kind(WindowGetterKind::ScaleFactor);
    }

    /// 窗口 setter/命令的聚合枚举。
    ///
    /// 这些操作最终在主线程由 `apply_window_set` 映射到 tao window API。
    pub(crate) enum WindowSet {
        Resizable(bool),
        Enabled(bool),
        Maximizable(bool),
        Minimizable(bool),
        Closable(bool),
        Title(String),
        Maximize,
        Unmaximize,
        Minimize,
        Unminimize,
        Show,
        Hide,
        Close,
        Destroy,
        Decorations(bool),
        AlwaysOnBottom(bool),
        AlwaysOnTop(bool),
        VisibleOnAllWorkspaces(bool),
        ContentProtected(bool),
        Size(Size),
        MinSize(Option<Size>),
        MaxSize(Option<Size>),
        SizeConstraints(tauri_runtime::window::WindowSizeConstraints),
        Position(Position),
        Fullscreen(bool),
        Focus,
        Focusable(bool),
        Icon(TaoIcon),
        SkipTaskbar(bool),
        CursorGrab(bool),
        CursorVisible(bool),
        CursorIcon(tao::window::CursorIcon),
        CursorPosition(Position),
        IgnoreCursorEvents(bool),
        StartDragging,
        StartResizeDragging(tao::window::ResizeDirection),
        Theme(Option<Theme>),
    }

    /// webview 层消息。
    ///
    /// Phase 3 起实现启动渲染所需的导航、脚本执行、尺寸和可见性控制；
    /// IPC、devtools、download handler 与 cookie bridge 按后续阶段补齐。
    pub(crate) enum WebviewMessage {
        AddEventListener(
            WebviewEventId,
            Box<dyn Fn(&tauri_runtime::window::WebviewEvent) + Send>,
        ),
        Get(WebviewGetterKind, Sender<Result<Box<dyn Any + Send>>>),
        WithWebview(Box<dyn FnOnce(Box<dyn Any>) + Send>),
        OpenDevTools,
        CloseDevTools,
        Navigate(String),
        Reload,
        Close,
        SetSize(Size),
        SetFocus,
        SetVisible(bool),
        Eval(String),
        SetAutoResize(bool),
        SetZoom(f64),
    }

    /// 类型化 webview getter 请求。
    pub(crate) struct WebviewGetter<R> {
        pub(crate) kind: WebviewGetterKind,
        _marker: std::marker::PhantomData<R>,
    }

    impl<R> WebviewGetter<R> {
        pub(crate) const fn from_kind(kind: WebviewGetterKind) -> Self {
            Self {
                kind,
                _marker: std::marker::PhantomData,
            }
        }
    }

    /// webview getter 的运行期种类。
    #[derive(Clone, Copy)]
    pub(crate) enum WebviewGetterKind {
        Url,
        Size,
        DevToolsOpen,
    }

    thread_local! {
        /// CEF app prepared by the executable's earliest subprocess-dispatch call.
        ///
        /// Keeping this thread-local preserves the exact app instance passed to
        /// `cef_execute_process` so runtime initialization does not dispatch the
        /// browser process a second time. Both operations happen on the UI thread.
        static PREPARED_CEF_APP: RefCell<Option<cef::App>> = const { RefCell::new(None) };
        #[cfg(target_os = "macos")]
        static CEF_LIBRARY_LOADER: RefCell<Option<cef::library_loader::LibraryLoader>> = const { RefCell::new(None) };
        static CEF_INITIALIZED: Cell<bool> = const { Cell::new(false) };
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

    /// 在 Tauri 启动前完成 CEF 进程分流与 browser 初始化。
    ///
    /// 单 binary 模型（与 Electron 相同）：`browser_subprocess_path` 指向主程序自身。
    /// CEF 再 exec 本进程并带上 `--type=...` 时，此处 `execute_process` 会接管并
    /// `exit`；browser 进程拿到 `-1` 后继续 `cef_initialize`。
    pub fn dispatch_cef_subprocess() {
        eprintln!("[cef-runtime] subprocess dispatch: start");
        // Select X11 before CEF parses
        // the process environment or launches any child process.
        #[cfg(target_os = "linux")]
        unsafe {
            std::env::set_var("GDK_BACKEND", "x11");
        }
        #[cfg(target_os = "macos")]
        {
            CEF_LIBRARY_LOADER.with(|loader| {
                if loader.borrow().is_none() {
                    eprintln!("[cef-runtime] loading macOS CEF framework");
                    let framework = cef::library_loader::LibraryLoader::new(
                        &std::env::current_exe().expect("failed to resolve current executable"),
                        false,
                    );
                    assert!(framework.load(), "failed to load the macOS CEF framework");
                    loader.replace(Some(framework));
                    eprintln!("[cef-runtime] macOS CEF framework loaded");
                }
            });
            crate::app_mac::init_cef_app_mac();
        }
        if CEF_INITIALIZED.with(Cell::get) {
            eprintln!("[cef-runtime] subprocess dispatch: CEF already initialized");
            return;
        }
        eprintln!("[cef-runtime] subprocess dispatch: creating CEF app");
        let mut app = create_cef_app();
        // 子进程在这里退出；browser 得到 -1 后继续初始化。
        maybe_exit_as_cef_subprocess(&mut app);
        eprintln!("[cef-runtime] browser initialization (CEF Views/windowed)");
        initialize_cef(&mut app).expect("failed to initialize CEF before Tauri startup");
        eprintln!("[cef-runtime] subprocess dispatch: CEF initialization complete");
        PREPARED_CEF_APP.with(|prepared| prepared.replace(Some(app)));
        CEF_INITIALIZED.with(|initialized| initialized.set(true));
    }

    wrap_app! {
        struct CefRuntimeApp {
            windowed_quit: Arc<AtomicBool>,
            // CEF 每次派发回调都会重新调 GetRenderProcessHandler/GetBrowserProcessHandler;
            // handler 必须建一次、每次返回同一实例的 clone,否则 on_browser_created 存进
            // 实例 A 的初始化脚本会在 on_context_created 的新实例 B 上丢失(注入静默失效)。
            render_process_handler: RenderProcessHandler,
            browser_process_handler: BrowserProcessHandler,
        }
        impl App {
            fn on_register_custom_schemes(&self, registrar: Option<&mut SchemeRegistrar>) {
                let Some(registrar) = registrar else { return };
                let web_resource_options = (SchemeOptions::STANDARD.get_raw()
                    | SchemeOptions::SECURE.get_raw()
                    | SchemeOptions::CORS_ENABLED.get_raw()
                    | SchemeOptions::FETCH_ENABLED.get_raw()) as i32;
                for scheme in ["tauri", "asset"] {
                    registrar.add_custom_scheme(Some(&CefString::from(scheme)), web_resource_options);
                }

                // Tauri IPC is injected into third-party pages such as surf sessions.
                // Strict site CSP can block `fetch(ipc://...)` before it reaches the runtime,
                // so only the internal IPC schemes bypass CSP.
                let ipc_options = (web_resource_options
                    | SchemeOptions::CSP_BYPASSING.get_raw() as i32) as i32;
                for scheme in ["ipc", "cef-ipc"] {
                    registrar.add_custom_scheme(Some(&CefString::from(scheme)), ipc_options);
                }
            }

            fn on_before_command_line_processing(
                &self,
                _process_type: Option<&CefString>,
                command_line: Option<&mut CommandLine>,
            ) {
                let Some(cl) = command_line else { return };
                #[cfg(target_os = "linux")]
                if cl.has_switch(Some(&CefString::from("ozone-platform"))) == 0 {
                    cl.append_switch_with_value(
                        Some(&CefString::from("ozone-platform")),
                        Some(&CefString::from("x11")),
                    );
                }
                cl.append_switch(Some(&CefString::from("no-sandbox")));
                #[cfg(target_os = "macos")]
                cl.append_switch(Some(&CefString::from("use-mock-keychain")));
                apply_windowed_gpu_mode(cl);
                // CEF WebContents are not Chrome browser tabs. Some Chrome UI
                // features assume tabs::TabInterface exists and crash on SPA
                // soft navigations when variations enable them.
                disable_chrome_only_features(cl);
                #[cfg(target_os = "linux")]
                {
                    // 禁用 zygote:Linux 下渲染进程默认从 zygote fork,**不会**重新
                    // `execute_process` → 不跑 `on_register_custom_schemes` → fork 出的
                    // renderer 不认 `ipc://` / `cef-ipc://`(`ERR_UNKNOWN_URL_SCHEME`),
                    // 导致 Tauri IPC 全断、ACL 因 `is_local=false` 拒命令。关掉 zygote
                    // 后每个 renderer 都会启动独立 helper,并自行注册自定义 scheme。
                    cl.append_switch(Some(&CefString::from("no-zygote")));
                }
                // NOTE: 不要开 `single-process`。CEF/Chromium 单进程模式已弃用且极不
                // 稳定(并伴随 "Cannot use V8 Proxy resolver in
                // single process mode")。多进程下渲染/GPU 子进程 re-exec 主程序自身
                //（`browser_subprocess_path = current_exe`）。
            }

            fn browser_process_handler(&self) -> Option<BrowserProcessHandler> {
                Some(self.browser_process_handler.clone())
            }

            fn render_process_handler(&self) -> Option<RenderProcessHandler> {
                Some(self.render_process_handler.clone())
            }
        }
    }

    wrap_window_delegate! {
        struct WindowedTopLevelWindowDelegate {
            shared: Arc<Mutex<WindowedWindowShared>>,
            initial_bounds: cef::Rect,
            initial_show_state: ShowState,
            frameless: bool,
            resizable: bool,
            maximizable: bool,
            minimizable: bool,
            closable: bool,
            emitter: WindowEventEmitter,
            // 是否在首次显示前居中(Tauri `center: true`)。
            center: bool,
            // 应用图标 RGBA(宽、高),用于 CEF 窗口标题栏 + 任务栏图标。
            icon: Option<Arc<(Vec<u8>, u32, u32)>>,
            // 窗口销毁时是否直接停泵退出进程。仅独立 bootstrap 窗口为 true:
            // 它不在 Tauri 窗口注册表里,主循环无法据此判断”已无窗口”。
            // 真实 Tauri 窗口为 false —— 销毁时只上报 `Destroyed`,由主循环按
            // wry 语义决定是否退出(最后一个窗口关闭才发 `ExitRequested`),
            // 子窗口/主窗口关闭都不再无条件牵连整个进程。
            quit_on_destroy: bool,
            // 真实 Tauri 窗口关闭时向主循环投递 `WindowCloseRequested` 的回调。
            // bootstrap 窗口为 `None`,直接走 CEF 握手;真实窗口为 `Some`,
            // `can_close` 先否决、再异步询问上层,实现与 wry 一致的可拦截语义。
            close_requester: Option<Arc<dyn Fn() + Send + Sync>>,
        }

        impl ViewDelegate {
            fn preferred_size(&self, _view: Option<&mut View>) -> cef::Size {
                cef::Size {
                    width: self.initial_bounds.width,
                    height: self.initial_bounds.height,
                }
            }
        }

        impl PanelDelegate {}

        impl WindowDelegate {
            fn on_window_created(&self, window: Option<&mut cef::Window>) {
                let Some(window) = window else { return };
                let mut shared = self.shared.lock().expect("windowed state mutex poisoned");
                shared.window = Some(CefWindow {
                    inner: window.clone(),
                });
                attach_windowed_browser_views(&mut shared, window);
                layout_windowed_browser_view(&shared, window);

                // 应用图标(标题栏 + 任务栏)。CEF Views 默认是 Chromium 图标,
                // tao 的 window_icon 在 windowed 路径用不上,故这里显式设置。
                if let Some(icon) = self.icon.as_ref() {
                    if let Some(mut image) = image_create() {
                        if image.add_bitmap(
                            1.0,
                            icon.1 as i32,
                            icon.2 as i32,
                            ColorType::RGBA_8888,
                            AlphaType::POSTMULTIPLIED,
                            Some(icon.0.as_slice()),
                        ) != 0
                        {
                            window.set_window_icon(Some(&mut image));
                            window.set_window_app_icon(Some(&mut image));
                        }
                    }
                }

                // 居中(Tauri `center: true`)。在 show 前居中,避免可见跳动。
                // CEF Views `center_window` 按窗口所在 display 的工作区居中。
                if self.center {
                    window.center_window(Some(&cef::Size {
                        width: self.initial_bounds.width,
                        height: self.initial_bounds.height,
                    }));
                }

                if self.initial_show_state != ShowState::HIDDEN {
                    window.show();
                }
                eprintln!("[cef-runtime] windowed top-level CEF window shown");
            }

            fn on_window_destroyed(&self, _window: Option<&mut cef::Window>) {
                self.shared
                    .lock()
                    .expect("windowed state mutex poisoned")
                    .window = None;
                if self.quit_on_destroy {
                    // 独立 bootstrap 窗口:不在 Tauri 注册表里,直接停泵退出。
                    self.shared
                        .lock()
                        .expect("windowed state mutex poisoned")
                        .quit
                        .store(true, Ordering::Release);
                } else {
                    // 真实 Tauri 窗口:仅上报销毁。主循环会移除该窗口,并仅在
                    // 最后一个窗口关闭时发 `ExitRequested`。单个子窗口(如 surf)
                    // 关闭不再连带退出整个应用。
                    (self.emitter)(WindowEvent::Destroyed);
                }
            }

            /// CEF Views 窗口尺寸/位置变化 → Tauri `Resized` + `Moved`。
            ///
            /// CEF Views bounds 是 DIP(逻辑像素),Tauri `WindowEvent` 要物理像素,
            /// 故按窗口所在 display 的 scale factor 换算。
            fn on_window_bounds_changed(
                &self,
                window: Option<&mut cef::Window>,
                new_bounds: Option<&cef::Rect>,
            ) {
                let Some(bounds) = new_bounds else { return };
                let scale = if let Some(window) = window {
                    // 必须 try_lock:Windows 上 attach/layout 期间 SetWindowPos 会
                    // **同步**派发 WM_WINDOWPOSCHANGED → CEF 立刻回调本函数;此时
                    // `shared` 正被 on_window_created / 主流程持有,同线程重入
                    // `Mutex::lock` 直接死锁(主窗口创建即挂死,Linux 的 X11 bounds
                    // 事件是异步的所以从未暴露)。拿不到锁说明持锁方随后自会 layout,
                    // 跳过无损;scale 换算不需要锁。
                    if let Ok(shared) = self.shared.try_lock() {
                        layout_windowed_browser_view(&shared, window);
                    }
                    window
                        .display()
                        .map(|display| display.device_scale_factor() as f64)
                        .unwrap_or(1.0)
                } else {
                    1.0
                };
                let width = (bounds.width.max(0) as f64 * scale).round() as u32;
                let height = (bounds.height.max(0) as f64 * scale).round() as u32;
                let x = (bounds.x as f64 * scale).round() as i32;
                let y = (bounds.y as f64 * scale).round() as i32;
                (self.emitter)(WindowEvent::Resized(PhysicalSize::new(width, height)));
                (self.emitter)(WindowEvent::Moved(PhysicalPosition::new(x, y)));
            }

            /// CEF Views 窗口激活态变化 → Tauri `Focused`。
            fn on_window_activation_changed(
                &self,
                _window: Option<&mut cef::Window>,
                active: ::std::os::raw::c_int,
            ) {
                (self.emitter)(WindowEvent::Focused(active != 0));
            }

            fn can_close(&self, _window: Option<&mut cef::Window>) -> i32 {
                if !self.closable {
                    return 0;
                }
                let Some(requester) = &self.close_requester else {
                    // bootstrap 窗口:无需询问上层,直接走 CEF 浏览器关闭握手。
                    return try_close_browser_now(&self.shared);
                };
                // 真实 Tauri 窗口:实现三段式关闭:
                //   1. 首次请求 → 否决(返回 0)+ 向主循环投递 WindowCloseRequested
                //   2. 主循环裁决:被拦截 → 复位 close_requested;未拦截 → 置 close_confirmed + 再调 cef_window.close()
                //   3. 已确认 → 放行给 CEF 握手(try_close_browser),最终 on_window_destroyed
                let (close_confirmed, close_requested) = {
                    let shared = self.shared.lock().expect("windowed state mutex poisoned");
                    (shared.close_confirmed, shared.close_requested)
                };
                if close_confirmed {
                    // 上层已确认:走 CEF 握手(注意 try_close_browser_now 内部不持锁调用)
                    return try_close_browser_now(&self.shared);
                }
                if !close_requested {
                    // 首次:否决并向主循环异步请求
                    self.shared
                        .lock()
                        .expect("windowed state mutex poisoned")
                        .close_requested = true;
                    requester();
                }
                // 等待裁决期间:继续否决
                0
            }

            fn initial_bounds(&self, _window: Option<&mut cef::Window>) -> cef::Rect {
                self.initial_bounds.clone()
            }

            fn initial_show_state(&self, _window: Option<&mut cef::Window>) -> ShowState {
                self.initial_show_state
            }

            fn is_frameless(&self, _window: Option<&mut cef::Window>) -> i32 {
                i32::from(self.frameless)
            }

            fn with_standard_window_buttons(&self, _window: Option<&mut cef::Window>) -> i32 {
                i32::from(!self.frameless)
            }

            fn can_resize(&self, _window: Option<&mut cef::Window>) -> i32 {
                i32::from(self.resizable)
            }

            fn can_maximize(&self, _window: Option<&mut cef::Window>) -> i32 {
                i32::from(self.maximizable)
            }

            fn can_minimize(&self, _window: Option<&mut cef::Window>) -> i32 {
                i32::from(self.minimizable)
            }

            fn window_runtime_style(&self) -> RuntimeStyle {
                RuntimeStyle::ALLOY
            }
        }
    }

    /// 向 CEF 发起浏览器关闭握手:依次取 browser_view → browser → host,
    /// 调用 `try_close_browser()`。无 browser 时返回 `1`(视为可关)。
    ///
    /// **关键**:先在短临界区内取出 owned `BrowserHost`(引用计数句柄),**释放
    /// `shared` 锁后**再调用 `try_close_browser()`。否则当 `try_close_browser()`
    /// 同步驱动关闭、回调 `on_window_destroyed`(也要 `shared.lock()`)时,会在
    /// 同一线程对非可重入的 `std::Mutex` 二次加锁而死锁,导致整个应用 freeze。
    fn try_close_browser_now(shared: &Mutex<WindowedWindowShared>) -> i32 {
        let host = {
            let s = shared.lock().expect("windowed state mutex poisoned");
            s.browser_view
                .as_ref()
                .and_then(|bv| bv.inner.browser())
                .and_then(|b| b.host())
            // shared 锁在此块结束时释放
        };
        match host {
            Some(host) => host.try_close_browser(),
            None => 1,
        }
    }

    fn attach_windowed_browser_views(shared: &mut WindowedWindowShared, window: &cef::Window) {
        if !shared.browser_view_attached {
            if let Some(browser_view) = shared.browser_view.as_ref() {
                let mut view = View::from(&browser_view.inner);
                window.add_child_view(Some(&mut view));
                shared.browser_view_attached = true;
            }
        }
    }

    /// Keep the sole content `BrowserView` aligned with the CEF Window client area.
    ///
    /// 仅用于「无导航栏」的普通窗口(main / wallpaper / crawler / 单 webview surf 之外)。
    /// 一旦窗口装上 surf 导航栏,布局改由 [`apply_surf_chrome_layout`] 安装的垂直
    /// BoxLayout 接管,这里直接返回,避免与 BoxLayout 争抢导致导航栏闪烁/错位。
    fn layout_windowed_browser_view(shared: &WindowedWindowShared, window: &cef::Window) {
        if shared.chrome_view.is_some() {
            return;
        }
        let client_area = window.client_area_bounds_in_screen();
        if let Some(browser_view) = shared.browser_view.as_ref() {
            browser_view.inner.set_bounds(Some(&cef::Rect {
                x: 0,
                y: 0,
                width: client_area.width.max(0),
                height: client_area.height.max(0),
            }));
        }
    }

    /// 把窗口从 CEF 默认的 fill 布局(所有 BrowserView 都铺满、后加的导航栏盖住
    /// 内容)切换为**垂直 BoxLayout**:顶部导航栏(固定 preferred 高度,见
    /// [`webview::SURF_NAVBAR_DIP_HEIGHT`])+ 内容 webview(flex=1 撑满剩余)。
    /// BoxLayout 会随窗口 resize 自动重排,无需手动 set_bounds。
    /// 前置条件:导航栏已通过 `add_child_view_at(_, 0)` 插到最上方(index 0)。
    fn apply_surf_chrome_layout(shared: &WindowedWindowShared, window: &cef::Window) {
        let settings = cef::BoxLayoutSettings {
            horizontal: 0, // 0 = 垂直堆叠
            main_axis_alignment: cef::AxisAlignment::START,
            cross_axis_alignment: cef::AxisAlignment::STRETCH, // 子视图占满宽度
            ..Default::default()
        };
        let Some(box_layout) = window.set_to_box_layout(Some(&settings)) else {
            return;
        };
        if let Some(content) = shared.browser_view.as_ref() {
            let mut content_view = View::from(&content.inner);
            box_layout.set_flex_for_view(Some(&mut content_view), 1);
        }
        // 导航栏是在默认 fill 布局下 add_child_view_at 的(此刻已被排成整窗),
        // 切到 BoxLayout 后必须显式触发一次重排,否则要等下一次窗口 resize。
        window.invalidate_layout();
    }

    wrap_browser_view_delegate! {
        struct WindowedBrowserViewDelegate {}

        impl ViewDelegate {}

        impl BrowserViewDelegate {
            fn browser_runtime_style(&self) -> RuntimeStyle {
                RuntimeStyle::ALLOY
            }
        }
    }

    wrap_client! {
        struct WindowedClient {
            life_span_handler: LifeSpanHandler,
            load_handler: LoadHandler,
        }

        impl Client {
            fn life_span_handler(&self) -> Option<LifeSpanHandler> {
                Some(self.life_span_handler.clone())
            }

            fn load_handler(&self) -> Option<LoadHandler> {
                Some(self.load_handler.clone())
            }
        }
    }

    wrap_life_span_handler! {
        struct WindowedLifeSpanHandler {
            quit: Arc<AtomicBool>,
        }

        impl LifeSpanHandler {
            fn on_after_created(&self, browser: Option<&mut Browser>) {
                let runtime_style = browser
                    .and_then(|browser| browser.host())
                    .map(|host| host.runtime_style());
                eprintln!("[cef-runtime] windowed browser created; runtime_style={runtime_style:?}");
            }

            fn on_before_close(&self, _browser: Option<&mut Browser>) {
                eprintln!("[cef-runtime] windowed browser closed; quitting external pump");
                self.quit.store(true, Ordering::Release);
                quit_message_loop();
            }
        }
    }

    wrap_load_handler! {
        struct WindowedLoadHandler;

        impl LoadHandler {
            fn on_load_error(
                &self,
                _browser: Option<&mut Browser>,
                _frame: Option<&mut Frame>,
                error_code: Errorcode,
                error_text: Option<&CefString>,
                failed_url: Option<&CefString>,
            ) {
                eprintln!(
                    "[cef-runtime] windowed load error: code={:?} text={} url={}",
                    error_code,
                    error_text.map(CefString::to_string).unwrap_or_default(),
                    failed_url.map(CefString::to_string).unwrap_or_default()
                );
            }
        }
    }

    wrap_browser_process_handler! {
        struct WindowedBrowserProcessHandler {
            client: RefCell<Option<Client>>,
            quit: Arc<AtomicBool>,
        }

        impl BrowserProcessHandler {
            fn on_schedule_message_pump_work(&self, _delay_ms: i64) {}

            fn on_context_initialized(&self) {
                WINDOWED_CONTEXT_INITIALIZED.store(true, Ordering::Release);
                if std::env::var("KABEGAME_CEF_WINDOWED_BOOTSTRAP").as_deref() != Ok("1") {
                    return;
                }

                let url = CefString::from(
                    std::env::var("KABEGAME_CEF_WINDOWED_URL")
                        .or_else(|_| std::env::var("CEF_WINDOWED_URL"))
                        .unwrap_or_else(|_| "https://example.com".to_string())
                        .as_str(),
                );
                eprintln!("[cef-runtime] windowed url={url}");

                *self.client.borrow_mut() = Some(WindowedClient::new(
                    WindowedLifeSpanHandler::new(self.quit.clone()),
                    WindowedLoadHandler::new(),
                ));

                let settings = BrowserSettings::default();
                let mut client = self.client.borrow().clone();
                let mut browser_view_delegate = WindowedBrowserViewDelegate::new();
                let browser_view = browser_view_create(
                    client.as_mut(),
                    Some(&url),
                    Some(&settings),
                    None,
                    None,
                    Some(&mut browser_view_delegate),
                );
                eprintln!(
                    "[cef-runtime] windowed browser_view created = {}",
                    browser_view.is_some()
                );

                let mut window_delegate =
                    WindowedTopLevelWindowDelegate::new(
                        Arc::new(Mutex::new(WindowedWindowShared {
                            window: None,
                            browser_view: browser_view.map(|inner| webview::CefBrowserView { inner }),
                            browser_view_attached: false,
                            chrome_view: None,
                            chrome_view_attached: false,
                            quit: self.quit.clone(),
                            close_requested: false,
                            close_confirmed: false,
                        })),
                        cef::Rect {
                            x: 0,
                            y: 0,
                            width: 1024,
                            height: 768,
                        },
                        ShowState::NORMAL,
                        false,
                        true,
                        true,
                        true,
                        true,
                        // bootstrap 窗口不对接 Tauri window,无需事件回流。
                        Arc::new(|_| {}),
                        // bootstrap 窗口:不居中、无图标。
                        false,
                        None,
                        // bootstrap 窗口不在注册表里,关闭时直接停泵退出。
                        true,
                        // bootstrap 无需询问上层,close_requester = None。
                        None,
                    );
                let window = window_create_top_level(Some(&mut window_delegate));
                eprintln!(
                    "[cef-runtime] windowed window_create_top_level = {}",
                    window.is_some()
                );
            }
        }
    }

    /// 创建 browser 与 helper 共用的 CEF app。
    fn create_cef_app() -> cef::App {
        eprintln!("[cef-runtime] create CEF app: negotiate API version");
        let _ = api_hash(sys::CEF_API_VERSION_LAST, 0);
        eprintln!("[cef-runtime] create CEF app: create quit state");
        let quit = windowed_quit();
        eprintln!("[cef-runtime] create CEF app: create render handler");
        let render_process_handler = crate::subprocess::initialization_render_process_handler();
        eprintln!("[cef-runtime] create CEF app: create browser handler");
        let browser_process_handler = WindowedBrowserProcessHandler::new(RefCell::new(None), quit.clone());
        eprintln!("[cef-runtime] create CEF app: create CEF wrapper");
        let app = CefRuntimeApp::new(quit, render_process_handler, browser_process_handler);
        eprintln!("[cef-runtime] create CEF app: complete");
        app
    }

    /// 若当前进程是 CEF 再 exec 出的 renderer/GPU/utility 子进程，则进入子进程
    /// 主循环并以 CEF 返回码退出；browser 进程（`execute_process` 返回 -1）直接返回。
    fn maybe_exit_as_cef_subprocess(app: &mut cef::App) {
        // 必须先协商 API 版本:下面 as_cmd_line 已经进 CEF C API,
        // 版本未配置(-1)会触发 CppToC wrap 的 NOTREACHED,子进程直接 abort。
        let _ = api_hash(sys::CEF_API_VERSION_LAST, 0);
        let args = Args::new();
        let process_type = args
            .as_cmd_line()
            .map(|command_line| {
                CefString::from(&command_line.switch_value(Some(&CefString::from("type"))))
                    .to_string()
            })
            .unwrap_or_default();
        eprintln!(
            "[cef-runtime] cef_execute_process pid={} type={process_type} args={:?}",
            std::process::id(),
            std::env::args().collect::<Vec<_>>()
        );
        let code = execute_process(Some(args.as_main_args()), Some(app), std::ptr::null_mut());
        if code >= 0 {
            std::process::exit(code.max(0));
        }
    }

    /// 独立 helper binary 入口（兼容旧打包）；单 binary 模型下主程序走
    /// [`dispatch_cef_subprocess`] 即可，无需再编第二个可执行文件。
    pub fn run_cef_subprocess() -> ! {
        let mut app = create_cef_app();
        maybe_exit_as_cef_subprocess(&mut app);
        eprintln!(
            "[cef-runtime] run_cef_subprocess called without --type=; \
             this process is not a CEF child"
        );
        std::process::exit(1);
    }

    /// 单 binary：子进程 re-exec 主程序自身。
    fn browser_subprocess_exe() -> std::path::PathBuf {
        let exe = std::env::current_exe().expect("failed to resolve current_exe");
        exe.canonicalize().unwrap_or(exe)
    }

    /// 裸 exe(无 .app bundle)运行时,为 CEF 生成并返回一个最小 main bundle 目录。
    ///
    /// Chromium 的 MachPortRendezvous 用 `<BaseBundleID>.MachPortRendezvousServer.<pid>`
    /// 作 bootstrap 服务名:browser 注册名来自 CEF `util_mac::OverrideBaseBundleID()`
    /// (= main bundle 的 CFBundleIdentifier;裸 exe 下 `GetAppBundlePath()` 找不到
    /// `.app` 祖先返回空 → override 成空串),子进程查找名来自其内嵌 __info_plist 的
    /// CFBundleIdentifier(**实测即使 helper 位于 .app 内,内嵌 plist 也优先于
    /// bundle 的 Info.plist**)。两者不一致时所有子进程 `bootstrap_look_up` 失败、
    /// 起来即退(窗口空白 + "Network service crashed" 循环)。把
    /// `settings.main_bundle_path` 指到本目录,让 browser 侧 override 与内嵌 plist
    /// 的 id 一致。
    ///
    /// 目录名**刻意不带 `.app` 后缀**:`AmIBundled()`(看 OuterBundle 路径后缀)保持
    /// false,stock CEF 才不会把子进程路径改写成 5 个 helper `.app` 变体。
    /// release(.app 内运行)返回 None:bundle 本身就是 main bundle,browser 注册名
    /// 因此来自 .app Info.plist 的 identifier(tauri.conf 桌面 identifier),而子进程
    /// 查找名仍来自内嵌 plist —— 所以下方 PLIST、两个内嵌 plist 与 tauri identifier
    /// 四者必须是同一个 id。
    #[cfg(target_os = "macos")]
    pub fn macos_unbundled_main_bundle() -> Option<std::path::PathBuf> {
        let exe = std::env::current_exe().ok()?;
        let in_app_bundle = exe
            .components()
            .any(|c| c.as_os_str().to_string_lossy().ends_with(".app"));
        if in_app_bundle {
            return None;
        }
        // CFBundleIdentifier 必须与 kabegame / kabegame-cef-helper 的内嵌 plist
        // 以及 tauri.conf.json.handlebars 的桌面 identifier(release .app 的
        // Info.plist)一致,否则 release 下 browser 注册名与子进程查找名分叉。
        const PLIST: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>Kabegame</string>
    <key>CFBundleName</key>
    <string>Kabegame</string>
</dict>
</plist>
"#;
        let bundle_dir = exe.parent()?.join("kabegame-main-bundle");
        let plist_path = bundle_dir.join("Contents/Info.plist");
        if std::fs::read_to_string(&plist_path).ok().as_deref() != Some(PLIST) {
            std::fs::create_dir_all(plist_path.parent()?).ok()?;
            std::fs::write(&plist_path, PLIST).ok()?;
        }
        Some(bundle_dir)
    }

    /// 解析 CEF 资源目录(`*.pak` / `icudtl.dat` / `v8_context_snapshot.bin` /
    /// `locales/` 的所在目录)。
    ///
    /// 注意:CEF 初始化早于 Tauri app 构建,此时还没有 `AppPaths` /
    /// `tauri-plugin-pathes`,因此这里只能用 `current_exe()` 自算 —— 是 CLAUDE.md
    /// 「路径逻辑归 tauri-plugin-pathes」规则在 CEF 早期初始化下的唯一例外。
    ///
    /// 顺序:
    /// 1. `CEF_PATH` 环境变量(开发期,cef-rs 导出的运行时目录);
    /// 2. 安装态:`<exe>/../lib/kabegame`(deb `/usr/bin/kabegame` → `/usr/lib/kabegame`),
    ///    以是否存在 `icudtl.dat` 判定;
    /// 3. 都没有 → `None`(交给 CEF 默认:可执行文件同目录)。
    #[cfg(not(target_os = "macos"))]
    fn resolve_cef_resource_dir() -> Option<std::path::PathBuf> {
        if let Ok(cef_path) = std::env::var("CEF_PATH") {
            if !cef_path.is_empty() {
                return Some(std::path::PathBuf::from(cef_path));
            }
        }
        let exe = std::env::current_exe().ok()?;
        let dir = exe.parent()?.join("../lib/project-graph");
        if dir.join("icudtl.dat").is_file() {
            return Some(dir.canonicalize().unwrap_or(dir));
        }
        None
    }

    /// CEF 用户数据目录名。**dev(debug)与安装态(release)必须分开**:
    ///
    /// CEF 用的是 Chrome runtime,浏览器进程在 `cef_initialize` 时按此目录建立 Chrome
    /// profile 并注册进程级 **ProcessSingleton**(单实例锁)。若 `bun dev` 与已安装的
    /// 正式版共用同一目录,后启动者的 `cef_initialize` 会命中对方的 singleton →
    /// 打印 "Opening in existing browser session." 并返回 false → `initialize_cef`
    /// panic(见 issue:开发启动时弹出一个 Chrome 窗口后崩溃)。按构建 profile 隔离即可:
    /// 安装态恒为 release,`bun dev` 恒为 debug,两者目录不再冲突。
    const fn cef_cache_dir_name() -> &'static str {
        if cfg!(debug_assertions) {
            "kabegame-cef-dev"
        } else {
            "kabegame-cef"
        }
    }

    /// CEF 缓存/用户数据目录(cookies、缓存等)。
    /// Linux 优先 XDG / HOME;Windows 用 %LOCALAPPDATA%(GUI 启动时 HOME 通常不存在,
    /// 不能让 cookies/localStorage 落进会被系统清理的 Temp);都取不到才回退临时目录。
    /// 目录名由 [`cef_cache_dir_name`] 决定(dev/prod 隔离)。
    fn cef_root_cache_dir() -> std::path::PathBuf {
        let name = cef_cache_dir_name();
        #[cfg(target_os = "windows")]
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            if !local_app_data.is_empty() {
                return std::path::PathBuf::from(local_app_data).join(name);
            }
        }
        if let Ok(xdg) = std::env::var("XDG_CACHE_HOME") {
            if !xdg.is_empty() {
                return std::path::PathBuf::from(xdg).join(name);
            }
        }
        if let Ok(home) = std::env::var("HOME") {
            if !home.is_empty() {
                return std::path::PathBuf::from(home).join(".cache").join(name);
            }
        }
        std::env::temp_dir().join(name)
    }

    /// 初始化 CEF browser 主进程。
    ///
    /// 关键配置:
    /// - `external_message_pump = 1`:由 runtime 主循环主动调用 `do_message_loop_work`。
    /// - CEF Views 创建真实顶层窗口并负责 GPU 组合。
    /// - `CEF_PATH`:可指定 CEF resources/locales 所在目录。
    fn initialize_cef(app: &mut cef::App) -> Result<()> {
        let args = Args::new();
        WINDOWED_CONTEXT_INITIALIZED.store(false, Ordering::Release);
        eprintln!("[cef-runtime] cef_initialize backend=windowed");
        let mut settings = Settings {
            no_sandbox: 1,
            external_message_pump: 1,
            log_severity: LogSeverity::ERROR,
            browser_subprocess_path: {
                // Electron 式单 binary：CEF 再 exec 主程序，由 dispatch 入口分流。
                let subprocess = browser_subprocess_exe().to_string_lossy().into_owned();
                eprintln!("[cef-runtime] browser_subprocess_path={subprocess}");
                CefString::from(subprocess.as_str())
            },
            // cache_path 与 root_cache_path 相同是 CEF 允许的。
            // 设置 cache_path 后全局 RequestContext 在 cef_initialize 期间同步落盘初始化,
            // localStorage / cookies 跨会话持久化。
            cache_path: CefString::from(cef_root_cache_dir().to_string_lossy().as_ref()),
            root_cache_path: CefString::from(cef_root_cache_dir().to_string_lossy().as_ref()),
            ..Default::default()
        };
        #[cfg(not(target_os = "macos"))]
        match resolve_cef_resource_dir() {
            Some(dir) => {
                settings.resources_dir_path = CefString::from(dir.to_string_lossy().as_ref());
                settings.locales_dir_path =
                    CefString::from(dir.join("locales").to_string_lossy().as_ref());
            }
            None => {
                eprintln!(
                    "[cef-runtime] WARN: CEF resource dir not found \
                     (no CEF_PATH, no <exe>/../lib/project-graph/icudtl.dat); \
                     relying on CEF default next to executable"
                );
            }
        }
        // Dev resolves target/debug/../Frameworks through the symlink created
        // by cef-dll-sys; release resolves Contents/MacOS/../Frameworks in the
        // app bundle. canonicalize keeps this path identical to dyld's load.
        #[cfg(target_os = "macos")]
        {
            let framework_dir = std::env::current_exe()
                .expect("failed to resolve current_exe")
                .parent()
                .expect("exe has no parent dir")
                .join("../Frameworks/Chromium Embedded Framework.framework")
                .canonicalize()
                .expect("CEF framework not found in app bundle Frameworks/");
            settings.framework_dir_path = CefString::from(framework_dir.to_string_lossy().as_ref());
            if let Some(main_bundle) = macos_unbundled_main_bundle() {
                settings.main_bundle_path = CefString::from(main_bundle.to_string_lossy().as_ref());
            }
        }

        if initialize(
            Some(args.as_main_args()),
            Some(&settings),
            Some(app),
            std::ptr::null_mut(),
        ) == 1
        {
            Ok(())
        } else {
            Err(Error::CreateWebview(Box::new(std::io::Error::other(
                "cef::initialize failed",
            ))))
        }
    }

    impl<R> WindowGetter<R> {
        pub(crate) const fn from_kind(kind: WindowGetterKind) -> Self {
            Self {
                kind,
                _marker: std::marker::PhantomData,
            }
        }
    }

    impl WindowGetter<PhysicalPosition<i32>> {
        pub(crate) const InnerPosition: Self = Self::from_kind(WindowGetterKind::InnerPosition);
        pub(crate) const OuterPosition: Self = Self::from_kind(WindowGetterKind::OuterPosition);
    }
    impl WindowGetter<PhysicalSize<u32>> {
        pub(crate) const InnerSize: Self = Self::from_kind(WindowGetterKind::InnerSize);
        pub(crate) const OuterSize: Self = Self::from_kind(WindowGetterKind::OuterSize);
    }
    impl WindowGetter<bool> {
        pub(crate) const IsFullscreen: Self = Self::from_kind(WindowGetterKind::IsFullscreen);
        pub(crate) const IsMinimized: Self = Self::from_kind(WindowGetterKind::IsMinimized);
        pub(crate) const IsMaximized: Self = Self::from_kind(WindowGetterKind::IsMaximized);
        pub(crate) const IsFocused: Self = Self::from_kind(WindowGetterKind::IsFocused);
        pub(crate) const IsDecorated: Self = Self::from_kind(WindowGetterKind::IsDecorated);
        pub(crate) const IsResizable: Self = Self::from_kind(WindowGetterKind::IsResizable);
        pub(crate) const IsMaximizable: Self = Self::from_kind(WindowGetterKind::IsMaximizable);
        pub(crate) const IsMinimizable: Self = Self::from_kind(WindowGetterKind::IsMinimizable);
        pub(crate) const IsClosable: Self = Self::from_kind(WindowGetterKind::IsClosable);
        pub(crate) const IsVisible: Self = Self::from_kind(WindowGetterKind::IsVisible);
        pub(crate) const IsEnabled: Self = Self::from_kind(WindowGetterKind::IsEnabled);
        pub(crate) const IsAlwaysOnTop: Self = Self::from_kind(WindowGetterKind::IsAlwaysOnTop);
    }
    impl WindowGetter<String> {
        pub(crate) const Title: Self = Self::from_kind(WindowGetterKind::Title);
    }
    impl WindowGetter<Option<tao::monitor::MonitorHandle>> {
        pub(crate) const CurrentMonitor: Self = Self::from_kind(WindowGetterKind::CurrentMonitor);
        pub(crate) const PrimaryMonitor: Self = Self::from_kind(WindowGetterKind::PrimaryMonitor);
    }
    impl WindowGetter<Vec<tao::monitor::MonitorHandle>> {
        pub(crate) const AvailableMonitors: Self =
            Self::from_kind(WindowGetterKind::AvailableMonitors);
    }
    #[cfg(target_os = "linux")]
    impl WindowGetter<GtkWindow> {
        pub(crate) const GtkWindow: Self = Self::from_kind(WindowGetterKind::GtkWindow);
    }
    #[cfg(target_os = "linux")]
    impl WindowGetter<GtkBox> {
        pub(crate) const GtkBox: Self = Self::from_kind(WindowGetterKind::GtkBox);
    }
    impl WindowGetter<std::result::Result<SendRawWindowHandle, raw_window_handle::HandleError>> {
        pub(crate) const RawWindowHandle: Self = Self::from_kind(WindowGetterKind::RawWindowHandle);
    }
    impl WindowGetter<Theme> {
        pub(crate) const Theme: Self = Self::from_kind(WindowGetterKind::Theme);
    }

    impl WebviewGetter<String> {
        pub(crate) const Url: Self = Self::from_kind(WebviewGetterKind::Url);
    }
    impl WebviewGetter<PhysicalSize<u32>> {
        pub(crate) const Size: Self = Self::from_kind(WebviewGetterKind::Size);
    }
    impl WebviewGetter<bool> {
        pub(crate) const DevToolsOpen: Self = Self::from_kind(WebviewGetterKind::DevToolsOpen);
    }

    impl<T: UserEvent> RuntimeEventLoopProxy<T> for CefEventLoopProxy<T> {
        /// 把 Tauri 用户事件包装成 runtime 内部消息并投递给 runtime 队列。
        fn send_event(&self, event: T) -> Result<()> {
            self.context.send(Message::UserEvent(event))
        }
    }

    impl<T: UserEvent> RuntimeHandle<T> for CefHandle<T> {
        type Runtime = Cef<T>;

        /// 从 handle 派生一个用户事件代理。
        fn create_proxy(&self) -> CefEventLoopProxy<T> {
            CefEventLoopProxy {
                context: self.context.clone(),
            }
        }

        #[cfg(target_os = "macos")]
        fn set_activation_policy(
            &self,
            activation_policy: tauri_runtime::ActivationPolicy,
        ) -> Result<()> {
            self.context.send(Message::Task(Box::new(move || {
                crate::app_mac::set_activation_policy(activation_policy)
            })))
        }

        #[cfg(target_os = "macos")]
        fn set_dock_visibility(&self, visible: bool) -> Result<()> {
            self.context.send(Message::Task(Box::new(move || {
                crate::app_mac::set_dock_visibility(visible)
            })))
        }

        /// 请求主循环退出。
        ///
        /// 实际退出前会触发 `RunEvent::ExitRequested`,上层仍可通过 tx 阻止退出。
        fn request_exit(&self, code: i32) -> Result<()> {
            self.context.send(Message::RequestExit(code))
        }

        /// 从非主线程请求创建窗口。
        ///
        /// 请求通过 mpsc 回复结果；真正的 tao window 创建发生在主循环线程。
        fn create_window<F: Fn(RawWindow) + Send + 'static>(
            &self,
            pending: PendingWindow<T, Self::Runtime>,
            after_window_creation: Option<F>,
        ) -> Result<DetachedWindow<T, Self::Runtime>> {
            let window_id = self.context.next_window_id();
            let (tx, rx) = channel();
            self.context.send(Message::CreateWindow {
                window_id,
                pending,
                after_window_creation: after_window_creation
                    .map(|f| Box::new(f) as Box<dyn Fn(RawWindow) + Send>),
                tx,
            })?;
            rx.recv().map_err(|_| Error::FailedToReceiveMessage)?
        }

        /// 从非主线程请求在指定窗口上创建 CEF webview。
        fn create_webview(
            &self,
            window_id: WindowId,
            pending: PendingWebview<T, Self::Runtime>,
        ) -> Result<DetachedWebview<T, Self::Runtime>> {
            let webview_id = self.context.next_webview_id();
            let (tx, rx) = channel();
            self.context.send(Message::CreateWebview {
                window_id,
                webview_id,
                pending,
                tx,
            })?;
            rx.recv().map_err(|_| Error::FailedToReceiveMessage)?
        }

        /// 把任务转发到 runtime 主线程执行。
        fn run_on_main_thread<F: FnOnce() + Send + 'static>(&self, f: F) -> Result<()> {
            self.context.send(Message::Task(Box::new(f)))
        }

        fn display_handle(
            &self,
        ) -> std::result::Result<raw_window_handle::DisplayHandle<'_>, raw_window_handle::HandleError>
        {
            Err(raw_window_handle::HandleError::Unavailable)
        }

        fn primary_monitor(&self) -> Option<Monitor> {
            self.context.monitors.lock().ok()?.primary.clone()
        }

        fn monitor_from_point(&self, x: f64, y: f64) -> Option<Monitor> {
            let snapshot = self.context.monitors.lock().ok()?;
            snapshot
                .all
                .iter()
                .find(|m| {
                    let pos = m.position;
                    let size = m.size;
                    let (mx, my) = (pos.x as f64, pos.y as f64);
                    x >= mx && y >= my && x < mx + size.width as f64 && y < my + size.height as f64
                })
                .or(snapshot.primary.as_ref())
                .cloned()
        }

        fn available_monitors(&self) -> Vec<Monitor> {
            self.context
                .monitors
                .lock()
                .map(|snapshot| snapshot.all.clone())
                .unwrap_or_default()
        }

        fn cursor_position(&self) -> Result<PhysicalPosition<f64>> {
            Err(Error::FailedToGetCursorPosition)
        }

        fn set_theme(&self, theme: Option<Theme>) {
            let _ = self.context.send(Message::Window(
                0.into(),
                WindowMessage::Set(WindowSet::Theme(theme)),
            ));
        }

        #[cfg(target_os = "macos")]
        fn show(&self) -> Result<()> {
            self.context
                .send(Message::Task(Box::new(crate::app_mac::show)))
        }

        #[cfg(target_os = "macos")]
        fn hide(&self) -> Result<()> {
            self.context
                .send(Message::Task(Box::new(crate::app_mac::hide)))
        }

        fn set_device_event_filter(&self, _filter: DeviceEventFilter) {}

        #[cfg(target_os = "macos")]
        fn fetch_data_store_identifiers<F: FnOnce(Vec<[u8; 16]>) + Send + 'static>(
            &self,
            cb: F,
        ) -> Result<()> {
            self.context
                .send(Message::Task(Box::new(move || cb(Vec::new()))))
        }

        #[cfg(target_os = "macos")]
        fn remove_data_store<F: FnOnce(Result<()>) + Send + 'static>(
            &self,
            _uuid: [u8; 16],
            cb: F,
        ) -> Result<()> {
            self.context
                .send(Message::Task(Box::new(move || cb(Ok(())))))
        }
    }

    fn create_cef_runtime<T: UserEvent>(args: RuntimeInitArgs, any_thread: bool) -> Result<Cef<T>> {
        #[cfg(target_os = "linux")]
        unsafe {
            std::env::set_var("GDK_BACKEND", "x11");
        }
        eprintln!(
            "[cef-runtime] runtime init backend=windowed initialized={}",
            CEF_INITIALIZED.with(Cell::get)
        );
        if !CEF_INITIALIZED.with(Cell::get) {
            // 兜底：调用方未先 dispatch 时，仍先做子进程分流再 initialize。
            let mut app = create_cef_app();
            maybe_exit_as_cef_subprocess(&mut app);
            initialize_cef(&mut app)?;
            PREPARED_CEF_APP.with(|prepared| prepared.replace(Some(app)));
            CEF_INITIALIZED.with(|initialized| initialized.set(true));
        }

        let mut builder = EventLoopBuilder::<Message<T>>::with_user_event();
        #[cfg(any(target_os = "linux", target_os = "windows"))]
        if any_thread {
            builder.with_any_thread(true);
        }
        #[cfg(target_os = "macos")]
        let _ = any_thread;
        #[cfg(target_os = "linux")]
        if let Some(app_id) = args.app_id {
            builder.with_app_id(app_id);
        }
        #[cfg(not(target_os = "linux"))]
        let _ = &args;
        let event_loop = builder.build();
        let monitors = cef_monitor_snapshot().unwrap_or_else(|| tao_monitor_snapshot(&event_loop));
        eprintln!(
            "[cef-runtime] monitor snapshot source={} primary={:?}",
            if monitors.primary.is_some() {
                "cef"
            } else {
                "tao"
            },
            monitors.primary.as_ref().map(|monitor| (
                monitor.size,
                monitor.scale_factor,
                monitor.work_area,
            )),
        );
        let monitors = Arc::new(Mutex::new(monitors));
        let messages = Arc::new(CefMessageQueue::new());
        let windows = Arc::new(CefWindows(RefCell::new(BTreeMap::new())));
        let webviews = Arc::new(CefWebviews(RefCell::new(BTreeMap::new())));
        let context = CefContext {
            tao_proxy: event_loop.create_proxy(),
            messages,
            main_thread_id: current_thread().id(),
            windows: windows.clone(),
            webviews: webviews.clone(),
            main_runtime: Arc::new(AtomicPtr::new(std::ptr::null_mut())),
            next_window_id: Arc::new(AtomicU32::new(1)),
            next_webview_id: Arc::new(AtomicU32::new(1)),
            next_window_event_id: Arc::new(AtomicU32::new(1)),
            next_webview_event_id: Arc::new(AtomicU32::new(1)),
            monitors,
        };

        Ok(Cef {
            inner: CefRuntime {
                context,
                event_loop,
                windows,
                webviews,
                exit_code: Cell::new(0),
            },
        })
    }

    impl<T: UserEvent> Runtime<T> for Cef<T> {
        type WindowDispatcher = window::CefWindowDispatcher<T>;
        type WebviewDispatcher = webview::CefWebviewDispatcher<T>;
        type Handle = CefHandle<T>;
        type EventLoopProxy = CefEventLoopProxy<T>;

        /// 创建 runtime。
        ///
        fn new(args: RuntimeInitArgs) -> Result<Self> {
            create_cef_runtime(args, false)
        }

        /// 初始化 CEF、创建 tao event loop,并准备 runtime 状态表。
        #[cfg(any(target_os = "linux", target_os = "windows"))]
        fn new_any_thread(args: RuntimeInitArgs) -> Result<Self> {
            create_cef_runtime(args, true)
        }

        /// 创建可用于投递 Tauri 用户事件的代理。
        fn create_proxy(&self) -> Self::EventLoopProxy {
            CefEventLoopProxy {
                context: self.inner.context.clone(),
            }
        }

        /// 获取 runtime handle,供 Tauri 在运行期创建窗口/webview 或退出。
        fn handle(&self) -> Self::Handle {
            CefHandle {
                context: self.inner.context.clone(),
            }
        }

        /// 同步创建窗口。
        ///
        /// 这是 Tauri `Builder::build` 阶段的主路径；因为已经在主线程,可以直接
        /// 调 `create_window_now`。
        fn create_window<F: Fn(RawWindow) + Send + 'static>(
            &self,
            pending: PendingWindow<T, Self>,
            after_window_creation: Option<F>,
        ) -> Result<DetachedWindow<T, Self>> {
            let window_id = self.inner.context.next_window_id();
            self.inner.create_window_now(
                &self.inner.event_loop,
                window_id,
                pending,
                after_window_creation.map(|f| Box::new(f) as Box<dyn Fn(RawWindow) + Send>),
            )
        }

        /// 同步创建 webview。
        fn create_webview(
            &self,
            window_id: WindowId,
            pending: PendingWebview<T, Self>,
        ) -> Result<DetachedWebview<T, Self>> {
            let webview_id = self.inner.context.next_webview_id();
            self.inner
                .create_webview_now(window_id, webview_id, pending)
        }

        fn primary_monitor(&self) -> Option<Monitor> {
            self.inner.context.monitors.lock().ok()?.primary.clone()
        }

        fn monitor_from_point(&self, x: f64, y: f64) -> Option<Monitor> {
            let snapshot = self.inner.context.monitors.lock().ok()?;
            snapshot
                .all
                .iter()
                .find(|monitor| {
                    let position = monitor.position;
                    let size = monitor.size;
                    x >= position.x as f64
                        && y >= position.y as f64
                        && x < position.x as f64 + size.width as f64
                        && y < position.y as f64 + size.height as f64
                })
                .or(snapshot.primary.as_ref())
                .cloned()
        }

        fn available_monitors(&self) -> Vec<Monitor> {
            self.inner
                .context
                .monitors
                .lock()
                .map(|snapshot| snapshot.all.clone())
                .unwrap_or_default()
        }

        fn cursor_position(&self) -> Result<PhysicalPosition<f64>> {
            self.inner
                .event_loop
                .cursor_position()
                .map_err(|_| Error::FailedToGetCursorPosition)
        }

        fn set_theme(&self, theme: Option<Theme>) {
            self.inner
                .event_loop
                .set_theme(theme.map(window::to_tao_theme));
        }

        #[cfg(target_os = "macos")]
        fn set_activation_policy(&mut self, activation_policy: tauri_runtime::ActivationPolicy) {
            crate::app_mac::set_activation_policy(activation_policy);
        }

        #[cfg(target_os = "macos")]
        fn set_dock_visibility(&mut self, visible: bool) {
            crate::app_mac::set_dock_visibility(visible);
        }

        #[cfg(target_os = "macos")]
        fn show(&self) {
            crate::app_mac::show();
        }

        #[cfg(target_os = "macos")]
        fn hide(&self) {
            crate::app_mac::hide();
        }

        fn set_device_event_filter(&mut self, _filter: DeviceEventFilter) {}

        /// 单步驱动 CEF Views 与当前平台消息泵。
        fn run_iteration<F: FnMut(RunEvent<T>) + 'static>(&mut self, callback: F) {
            let mut callback = callback;
            pump_platform_messages();
            do_message_loop_work();
            callback(RunEvent::MainEventsCleared);
        }

        /// 运行 tao 主循环,返回应用退出码。
        fn run_return<F: FnMut(RunEvent<T>) + 'static>(self, callback: F) -> i32 {
            self.inner.run_loop(callback, false)
        }

        /// 运行 tao 主循环并以返回码结束进程。
        fn run<F: FnMut(RunEvent<T>) + 'static>(self, callback: F) {
            let code = self.run_return(callback);
            std::process::exit(code);
        }
    }

    impl<T: UserEvent> CefRuntime<T> {
        /// 在 CEF UI 线程立即创建 Views 窗口,并在需要时同步创建首个 webview。
        fn create_window_now(
            &self,
            event_loop: &tao::event_loop::EventLoopWindowTarget<Message<T>>,
            window_id: WindowId,
            pending: PendingWindow<T, Cef<T>>,
            after_window_creation: Option<Box<dyn Fn(RawWindow) + Send>>,
        ) -> Result<DetachedWindow<T, Cef<T>>> {
            let _ = event_loop;
            self.create_windowed_window_now(window_id, pending, after_window_creation)
        }

        fn create_windowed_window_now(
            &self,
            window_id: WindowId,
            pending: PendingWindow<T, Cef<T>>,
            after_window_creation: Option<Box<dyn Fn(RawWindow) + Send>>,
        ) -> Result<DetachedWindow<T, Cef<T>>> {
            let context = self.context.clone();
            let windows = self.windows.clone();
            let webviews = self.webviews.clone();
            post_cef_ui_task(move || {
                Self::create_windowed_window_on_cef_ui(
                    context,
                    windows,
                    webviews,
                    window_id,
                    pending,
                    after_window_creation,
                )
            })
        }

        fn create_windowed_window_on_cef_ui(
            context: CefContext<T>,
            windows: Arc<CefWindows>,
            webviews: Arc<CefWebviews>,
            window_id: WindowId,
            pending: PendingWindow<T, Cef<T>>,
            after_window_creation: Option<Box<dyn Fn(RawWindow) + Send>>,
        ) -> Result<DetachedWindow<T, Cef<T>>> {
            if after_window_creation.is_some() {
                eprintln!(
                    "[cef-runtime] windowed mode cannot expose a tao RawWindow during create_window"
                );
            }

            let label = pending.label.clone();
            let mut pending_webview = pending.webview;
            let use_https_scheme = pending_webview
                .as_ref()
                .map(|w| w.webview_attributes.use_https_scheme)
                .unwrap_or(false);
            let attrs = pending.window_builder.inner.window.clone();
            // Tauri `center: true` 与应用图标:windowed(CEF Views)路径不建 tao 窗口,
            // 需在 delegate 里显式应用(见 on_window_created)。
            let center = pending.window_builder.center;
            let icon = pending.window_builder.icon_rgba.clone().map(Arc::new);
            #[cfg(target_os = "windows")]
            let native_options = WindowsNativeWindowOptions {
                owner_hwnd: pending.window_builder.owner_hwnd,
                parent_hwnd: pending.window_builder.parent_hwnd,
                drag_and_drop: pending.window_builder.drag_and_drop,
                shadow: pending.window_builder.shadow,
            };
            let size = tao_size_to_physical(attrs.inner_size, 1024, 768);
            let position = attrs
                .position
                .map(|position| position.to_physical::<i32>(1.0));
            let shared = Arc::new(Mutex::new(WindowedWindowShared {
                window: None,
                browser_view: None,
                browser_view_attached: false,
                chrome_view: None,
                chrome_view_attached: false,
                quit: windowed_quit(),
                close_requested: false,
                close_confirmed: false,
            }));

            let mut detached_webview = None;
            let mut webview_id = None;
            if let Some(webview) = pending_webview.take() {
                let id = context.next_webview_id();
                let label = webview.label.clone();
                let (state, browser_view) =
                    webview::create_cef_browser_view(window_id, id, context.clone(), webview)?;
                shared
                    .lock()
                    .expect("windowed state mutex poisoned")
                    .browser_view = Some(webview::CefBrowserView {
                    inner: browser_view,
                });
                webviews.0.borrow_mut().insert(id, state);
                detached_webview = Some(DetachedWindowWebview {
                    webview: webview::detached_webview(label, window_id, id, context.clone()),
                    use_https_scheme,
                });
                webview_id = Some(id);
            }

            // 窗口事件回流发射器:delegate 在 CEF UI 线程回调里调用,把事件
            // enqueue 成 `Message::CefWindowEvent`,由主循环分发到该窗口 listeners。
            let emitter: WindowEventEmitter = {
                let context = context.clone();
                Arc::new(move |event| {
                    let _ = context.enqueue(Message::CefWindowEvent(window_id, event));
                })
            };
            // 关闭请求投递器:can_close 首次被调用时,向主循环投递
            // `WindowCloseRequested(window_id)`,主循环再发 CloseRequested 给上层裁决。
            let close_requester: Arc<dyn Fn() + Send + Sync> = {
                let context = context.clone();
                Arc::new(move || {
                    let _ = context.enqueue(Message::WindowCloseRequested(window_id));
                })
            };
            let mut delegate = WindowedTopLevelWindowDelegate::new(
                shared.clone(),
                cef::Rect {
                    x: position.map(|p| p.x).unwrap_or(0),
                    y: position.map(|p| p.y).unwrap_or(0),
                    width: size.width as i32,
                    height: size.height as i32,
                },
                initial_show_state(attrs.visible, attrs.maximized, attrs.fullscreen.is_some()),
                !attrs.decorations,
                attrs.resizable,
                attrs.maximizable,
                attrs.minimizable,
                attrs.closable,
                emitter,
                center,
                icon,
                // 真实 Tauri 窗口:销毁时上报 Destroyed,退出由主循环决定。
                false,
                // 真实 Tauri 窗口:关闭时先发 CloseRequested 询问上层。
                Some(close_requester),
            );
            let window = window_create_top_level(Some(&mut delegate)).ok_or_else(|| {
                eprintln!("[cef-runtime] CEF failed to create a top-level Views window");
                Error::CreateWindow
            })?;
            if attrs.always_on_top {
                window.set_always_on_top(1);
            }
            #[cfg(target_os = "windows")]
            apply_windows_native_window_options(&window, native_options);
            window.set_title(Some(&CefString::from(attrs.title.as_str())));
            {
                let mut shared = shared.lock().expect("windowed state mutex poisoned");
                shared.window = Some(CefWindow {
                    inner: window.clone(),
                });
                attach_windowed_browser_views(&mut shared, &window);
                layout_windowed_browser_view(&shared, &window);
            }
            if attrs.visible {
                window.show();
            }
            eprintln!("[cef-runtime] windowed top-level CEF window created and attached");

            let mut webviews = Vec::new();
            if let Some(id) = webview_id {
                webviews.push(id);
            }
            windows.0.borrow_mut().insert(
                window_id,
                CefWindowState {
                    label: label.clone(),
                    kind: CefWindowKind::Windowed(WindowedWindowState {
                        shared,
                        title: attrs.title,
                        size,
                        position,
                        resizable: attrs.resizable,
                        maximizable: attrs.maximizable,
                        minimizable: attrs.minimizable,
                        closable: attrs.closable,
                        decorated: attrs.decorations,
                        visible: attrs.visible,
                        fullscreen: attrs.fullscreen.is_some(),
                        maximized: attrs.maximized,
                        minimized: false,
                        focused: attrs.focused,
                        always_on_top: attrs.always_on_top,
                        #[cfg(target_os = "windows")]
                        native_options,
                    }),
                    listeners: Vec::new(),
                    webviews,
                },
            );

            Ok(DetachedWindow {
                id: window_id,
                label,
                dispatcher: window::CefWindowDispatcher { window_id, context },
                webview: detached_webview,
            })
        }

        /// 在已存在的 CEF Views 窗口上创建 BrowserView。
        fn create_webview_now(
            &self,
            window_id: WindowId,
            webview_id: WebviewId,
            pending: PendingWebview<T, Cef<T>>,
        ) -> Result<DetachedWebview<T, Cef<T>>> {
            self.create_windowed_webview_now(window_id, webview_id, pending)
        }

        fn create_windowed_webview_now(
            &self,
            window_id: WindowId,
            webview_id: WebviewId,
            pending: PendingWebview<T, Cef<T>>,
        ) -> Result<DetachedWebview<T, Cef<T>>> {
            let context = self.context.clone();
            let windows = self.windows.clone();
            let webviews = self.webviews.clone();
            post_cef_ui_task(move || {
                Self::create_windowed_webview_on_cef_ui(
                    context, windows, webviews, window_id, webview_id, pending,
                )
            })
        }

        fn create_windowed_webview_on_cef_ui(
            context: CefContext<T>,
            windows: Arc<CefWindows>,
            webviews: Arc<CefWebviews>,
            window_id: WindowId,
            webview_id: WebviewId,
            pending: PendingWebview<T, Cef<T>>,
        ) -> Result<DetachedWebview<T, Cef<T>>> {
            let label = pending.label.clone();
            let (state, browser_view) =
                webview::create_cef_browser_view(window_id, webview_id, context.clone(), pending)?;
            let mut window_states = windows.0.borrow_mut();
            let Some(window) = window_states.get_mut(&window_id) else {
                return Err(Error::WindowNotFound);
            };
            let CefWindowKind::Windowed(windowed) = &mut window.kind;
            let mut view = View::from(&browser_view);
            {
                let mut shared = windowed
                    .shared
                    .lock()
                    .expect("windowed state mutex poisoned");
                let is_chrome = label.ends_with("-navbar");
                if is_chrome {
                    shared.chrome_view = Some(webview::CefBrowserView {
                        inner: browser_view.clone(),
                    });
                    shared.chrome_view_attached = false;
                } else {
                    shared.browser_view = Some(webview::CefBrowserView {
                        inner: browser_view.clone(),
                    });
                    shared.browser_view_attached = false;
                }
                if let Some(window) = shared.window.as_ref() {
                    if is_chrome {
                        // 导航栏插到最上方(index 0),内容在其下方;随后切换为垂直
                        // BoxLayout 接管布局(取代默认 fill,否则两个 BrowserView 都会
                        // 铺满、导航栏盖住内容并居中显示)。
                        window.inner.add_child_view_at(Some(&mut view), 0);
                        apply_surf_chrome_layout(&shared, &window.inner);
                        shared.chrome_view_attached = true;
                    } else {
                        window.inner.add_child_view(Some(&mut view));
                        layout_windowed_browser_view(&shared, &window.inner);
                        shared.browser_view_attached = true;
                    }
                }
            }
            window.webviews.push(webview_id);
            drop(window_states);
            webviews.0.borrow_mut().insert(webview_id, state);

            Ok(webview::detached_webview(
                label, window_id, webview_id, context,
            ))
        }

        /// CEF Views 的外部消息泵。
        ///
        /// 这条路径不进入 tao `run_return`:CEF Views 自己创建真实窗口,并且
        /// Linux 上必须持续泵 GLib/X11；Windows 上必须持续泵 Win32 messages。
        /// Tauri runtime 消息从 `CefContext` 队列 drain。
        fn run_loop<F: FnMut(RunEvent<T>) + 'static>(mut self, mut callback: F, once: bool) -> i32 {
            eprintln!("[cef-runtime] windowed pure CEF platform pump started");
            let runtime_ptr = &mut self as *mut Self;
            self.context
                .main_runtime
                .store(runtime_ptr, Ordering::Release);
            callback(RunEvent::Ready);

            let quit = windowed_quit();
            loop {
                let mut control_flow = ControlFlow::WaitUntil(
                    Instant::now() + Duration::from_millis(if once { 0 } else { 1 }),
                );
                self.drain_messages(&self.event_loop, &mut callback, &mut control_flow);
                callback(RunEvent::MainEventsCleared);
                let did_platform_work = pump_platform_messages();
                do_message_loop_work();

                if matches!(control_flow, ControlFlow::Exit) || once || quit.load(Ordering::Acquire)
                {
                    eprintln!(
                        "[cef-runtime] run loop exiting (control_flow_exit={} once={once} quit={})",
                        matches!(control_flow, ControlFlow::Exit),
                        quit.load(Ordering::Acquire),
                    );
                    break;
                }
                if !did_platform_work {
                    std::thread::sleep(Duration::from_millis(1));
                }
            }

            callback(RunEvent::Exit);
            eprintln!("[cef-runtime] RunEvent::Exit dispatched; closing remaining CEF windows");

            // `cef_shutdown()` 前必须先销毁所有 CEF 窗口/浏览器,否则 CEF 内部的
            // ObserverList 仍挂着 observer,shutdown 时 CHECK `observers_.empty()`
            // 崩溃(实测:托盘退出 / app.exit() 直接 break 出主循环时,壁纸窗口等
            // 仍存活)。协议:对每个存活窗口置 `close_confirmed` 绕过 CloseRequested
            // 裁决 → 锁外 `close()` 走 CEF 销毁握手 → 泵消息直到全部
            // `on_window_destroyed`,再短暂排空 browser/子系统 teardown。
            let remaining: Vec<_> = self
                .windows
                .0
                .borrow()
                .values()
                .map(|state| {
                    let CefWindowKind::Windowed(w) = &state.kind;
                    w.shared.clone()
                })
                .collect();
            for shared in &remaining {
                let cef_window = {
                    let mut s = shared.lock().expect("windowed state mutex poisoned");
                    s.close_confirmed = true;
                    s.window.as_ref().map(|w| w.inner.clone())
                };
                if let Some(window) = cef_window {
                    window.close();
                }
            }
            let close_deadline = Instant::now() + Duration::from_secs(3);
            while Instant::now() < close_deadline {
                let all_destroyed = remaining
                    .iter()
                    .all(|shared| shared.lock().map(|s| s.window.is_none()).unwrap_or(true));
                if all_destroyed {
                    break;
                }
                pump_platform_messages();
                do_message_loop_work();
                std::thread::sleep(Duration::from_millis(1));
            }
            // 窗口销毁后 browser/IO 线程的 teardown 仍在飞行,继续泵到连续 idle。
            let drain_deadline = Instant::now() + Duration::from_secs(1);
            let mut idle_streak = 0u32;
            while Instant::now() < drain_deadline {
                let did_platform_work = pump_platform_messages();
                do_message_loop_work();
                if did_platform_work {
                    idle_streak = 0;
                } else {
                    idle_streak += 1;
                    if idle_streak >= 50 {
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(1));
                }
            }
            eprintln!("[cef-runtime] windows destroyed; calling cef shutdown");

            shutdown();
            eprintln!("[cef-runtime] CEF shutdown complete");
            self.context
                .main_runtime
                .store(std::ptr::null_mut(), Ordering::Release);
            self.exit_code.get()
        }

        /// 主线程上的同步 runtime 调用必须立即执行。
        ///
        /// Tauri 会在 `RunEvent::Ready` 回调里通过 `RuntimeHandle` 创建配置窗口；
        /// 如果这时仍把消息投回同一个 tao loop 并等待回复，会造成主线程自锁。
        fn handle_main_thread_message(&self, message: Message<T>) -> Result<()> {
            match message {
                Message::Task(task) => task(),
                Message::CreateWindow {
                    window_id,
                    pending,
                    after_window_creation,
                    tx,
                } => {
                    let _ = tx.send(self.create_window_now(
                        &self.event_loop,
                        window_id,
                        pending,
                        after_window_creation,
                    ));
                }
                Message::CreateWebview {
                    window_id,
                    webview_id,
                    pending,
                    tx,
                } => {
                    let _ = tx.send(self.create_webview_now(window_id, webview_id, pending));
                }
                Message::Window(window_id, message) => {
                    self.handle_window_message(window_id, message, &self.event_loop);
                }
                Message::Webview(webview_id, message) => {
                    self.handle_webview_message(webview_id, message);
                }
                message @ (Message::UserEvent(_)
                | Message::RequestExit(_)
                | Message::CefWindowEvent(..)
                | Message::WindowCloseRequested(_)) => {
                    self.context.enqueue(message)?;
                }
                Message::Wake => {}
            }
            Ok(())
        }

        /// 处理 runtime 内部消息。
        ///
        /// 这是跨线程请求进入主线程后的统一入口。
        fn drain_messages<F: FnMut(RunEvent<T>) + 'static>(
            &self,
            target: &tao::event_loop::EventLoopWindowTarget<Message<T>>,
            callback: &mut F,
            control_flow: &mut ControlFlow,
        ) {
            while let Some(message) = self.context.pop_message() {
                self.handle_message(target, message, callback, control_flow);
                if matches!(*control_flow, ControlFlow::Exit) {
                    break;
                }
            }
        }

        fn handle_message<F: FnMut(RunEvent<T>) + 'static>(
            &self,
            target: &tao::event_loop::EventLoopWindowTarget<Message<T>>,
            message: Message<T>,
            callback: &mut F,
            control_flow: &mut ControlFlow,
        ) {
            match message {
                Message::UserEvent(event) => callback(RunEvent::UserEvent(event)),
                Message::Wake => {}
                Message::Task(task) => task(),
                Message::RequestExit(code) => {
                    let (tx, rx) = channel();
                    callback(RunEvent::ExitRequested {
                        code: Some(code),
                        tx,
                    });
                    if !matches!(rx.try_recv(), Ok(ExitRequestedEventAction::Prevent)) {
                        self.exit_code.set(code);
                        *control_flow = ControlFlow::Exit;
                    }
                }
                Message::CreateWindow {
                    window_id,
                    pending,
                    after_window_creation,
                    tx,
                } => {
                    let _ = tx.send(self.create_window_now(
                        target,
                        window_id,
                        pending,
                        after_window_creation,
                    ));
                }
                Message::CreateWebview {
                    window_id,
                    webview_id,
                    pending,
                    tx,
                } => {
                    let _ = tx.send(self.create_webview_now(window_id, webview_id, pending));
                }
                Message::Window(window_id, message) => {
                    self.handle_window_message(window_id, message, target)
                }
                Message::Webview(webview_id, message) => {
                    self.handle_webview_message(webview_id, message)
                }
                Message::CefWindowEvent(window_id, event) => {
                    let destroyed = matches!(event, WindowEvent::Destroyed);
                    self.emit_mapped_window_event(window_id, event, callback);
                    if destroyed {
                        self.handle_window_destroyed(window_id, callback, control_flow);
                    }
                }
                Message::WindowCloseRequested(window_id) => {
                    self.handle_window_close_requested(window_id, callback);
                }
            }
        }

        /// 某个 CEF Views 窗口已销毁(用户点 X 或 `window.close()` 都汇聚到
        /// `on_window_destroyed`)。按 `tauri-runtime-wry` 语义处理:从注册表移除
        /// 该窗口及其 webview;仅当已无任何窗口时才发 `RunEvent::ExitRequested`,
        /// 未被上层拦截才真正退出消息循环。这样关闭单个子窗口/主窗口都不会无条件
        /// 终止进程,是否退出交由 Tauri 应用层(可 `prevent_exit`)决定。
        fn handle_window_destroyed<F: FnMut(RunEvent<T>) + 'static>(
            &self,
            window_id: WindowId,
            callback: &mut F,
            control_flow: &mut ControlFlow,
        ) {
            let Some(state) = self.windows.0.borrow_mut().remove(&window_id) else {
                return;
            };
            // 连带回收该窗口的 webview 状态(协议表由 on_browser_destroyed 自清)。
            {
                let mut webviews = self.webviews.0.borrow_mut();
                for webview_id in &state.webviews {
                    webviews.remove(webview_id);
                }
            }
            if self.windows.0.borrow().is_empty() {
                let (tx, rx) = channel();
                callback(RunEvent::ExitRequested { code: None, tx });
                if !matches!(rx.try_recv(), Ok(ExitRequestedEventAction::Prevent)) {
                    *control_flow = ControlFlow::Exit;
                }
            }
        }

        /// 按 `tauri-runtime-wry` 语义处理关窗请求:
        ///
        /// 1. 调用该窗口的所有 per-window listeners + `RunEvent::WindowEvent::CloseRequested`
        /// 2. 读取 `signal_tx` 裁决:被拦截则复位状态(窗口留存);未被拦截则置
        ///    `close_confirmed=true` 并调 `cef_window.close()` 重进 `can_close`
        ///    的「已确认」分支,完成真正的 CEF 销毁握手。
        ///
        /// **锁序安全**:在调用 `cef_window.close()` 前已释放 `shared` mutex,
        /// 避免 `close()` 同步回调 `can_close` 时再次锁定同一 Mutex 造成死锁。
        fn handle_window_close_requested<F: FnMut(RunEvent<T>) + 'static>(
            &self,
            window_id: WindowId,
            callback: &mut F,
        ) {
            let (tx, rx) = channel::<bool>();
            // 取出 label / shared,并把 listeners **临时 move 出**(置空),以便在
            // **不持有 self.windows 借用**的情况下调用它们。
            //
            // 必须如此:Tauri 注册的 per-window listener 里含 crawler 的
            // `window.hide()` —— 它在主线程上同步走 `send` → `handle_window_message`
            // → `self.windows.0.borrow_mut()`。若我们调用 listener 时仍持有 windows
            // 的不可变借用,就会 RefCell 双借用 panic。wry 因 listeners 是
            // `Arc<Mutex<_>>` 可 clone 句柄后丢借用;此处 listeners 非 Arc,故改用
            // mem::take。
            let (label, shared, listeners) = {
                let mut windows = self.windows.0.borrow_mut();
                let Some(state) = windows.get_mut(&window_id) else {
                    return;
                };
                let CefWindowKind::Windowed(ref w) = state.kind;
                let shared = w.shared.clone();
                let label = state.label.clone();
                let listeners = std::mem::take(&mut state.listeners);
                (label, shared, listeners)
                // windows 借用在此块结束时释放
            };

            // 不持 windows 借用地分发 CloseRequested
            for (_, listener) in &listeners {
                listener(&WindowEvent::CloseRequested {
                    signal_tx: tx.clone(),
                });
            }

            // 放回 listeners:其间若有 AddEventListener 追加到(已被清空的)列表,
            // 合并保留,避免丢失。
            {
                let mut windows = self.windows.0.borrow_mut();
                if let Some(state) = windows.get_mut(&window_id) {
                    let added = std::mem::replace(&mut state.listeners, listeners);
                    state.listeners.extend(added);
                }
            }

            // callback 同样在无 windows 借用下调用
            callback(RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { signal_tx: tx },
            });

            let prevented = matches!(rx.try_recv(), Ok(true));

            let cef_window_opt = {
                let mut s = shared.lock().expect("windowed state mutex poisoned");
                if prevented {
                    // 上层拦截:复位状态,窗口留存,下次关闭仍走完整流程
                    s.close_requested = false;
                    None
                } else {
                    // 未被拦截:确认销毁
                    s.close_confirmed = true;
                    s.window.as_ref().map(|w| w.inner.clone())
                }
                // mutex guard 在此块结束时释放
            };

            if let Some(cef_window) = cef_window_opt {
                // 锁已释放,再调 close() 不会与 can_close 形成死锁
                cef_window.close();
            }
        }

        /// 把一个已映射好的 Tauri `WindowEvent` 分发给该窗口的 listeners +
        /// `RunEvent::WindowEvent`。事件由 CEF Views 回流到消息队列。
        fn emit_mapped_window_event<F: FnMut(RunEvent<T>) + 'static>(
            &self,
            window_id: WindowId,
            mapped: WindowEvent,
            callback: &mut F,
        ) {
            if let Some(window) = self.windows.0.borrow().get(&window_id) {
                for (_, listener) in &window.listeners {
                    listener(&mapped);
                }
                callback(RunEvent::WindowEvent {
                    label: window.label.clone(),
                    event: mapped,
                });
            }
        }

        /// 处理某个窗口的 getter/setter/listener 消息。
        fn handle_window_message(
            &self,
            window_id: WindowId,
            message: WindowMessage,
            target: &tao::event_loop::EventLoopWindowTarget<Message<T>>,
        ) {
            let mut windows = self.windows.0.borrow_mut();
            let Some(state) = windows.get_mut(&window_id) else {
                return;
            };
            match message {
                WindowMessage::AddEventListener(id, listener) => {
                    state.listeners.push((id, listener));
                }
                WindowMessage::Get(kind, tx) => {
                    let _ = tx.send(self.window_get(state, kind, target));
                }
                WindowMessage::MonitorFromPoint(tx, x, y) => {
                    let _ = tx.send(target.monitor_from_point(x, y));
                }
                WindowMessage::Set(set) => apply_window_set(&mut state.kind, set),
                WindowMessage::Center => {
                    let CefWindowKind::Windowed(window) = &state.kind;
                    window.with_cef_window(|w| w.center_window(None));
                }
                WindowMessage::RequestUserAttention(_) => {}
            }
        }

        /// 执行窗口 getter,返回装箱结果供 dispatcher downcast。
        fn window_get(
            &self,
            state: &CefWindowState,
            kind: WindowGetterKind,
            target: &tao::event_loop::EventLoopWindowTarget<Message<T>>,
        ) -> Result<Box<dyn Any + Send>> {
            let CefWindowKind::Windowed(window) = &state.kind;
            let value: Box<dyn Any + Send> = match kind {
                WindowGetterKind::ScaleFactor => Box::new(
                    window
                        .with_cef_window(|w| w.display().map(|d| d.device_scale_factor() as f64))
                        .flatten()
                        .unwrap_or(1.0),
                ),
                WindowGetterKind::InnerPosition | WindowGetterKind::OuterPosition => Box::new(
                    window
                        .with_cef_window(|w| {
                            let p = w.position();
                            PhysicalPosition::new(p.x, p.y)
                        })
                        .or(window.position)
                        .unwrap_or(PhysicalPosition::new(0, 0)),
                ),
                WindowGetterKind::InnerSize | WindowGetterKind::OuterSize => Box::new(
                    window
                        .with_cef_window(|w| {
                            let s = w.size();
                            PhysicalSize::new(s.width.max(0) as u32, s.height.max(0) as u32)
                        })
                        .unwrap_or(window.size),
                ),
                WindowGetterKind::IsFullscreen => Box::new(
                    window
                        .with_cef_window(|w| w.is_fullscreen() != 0)
                        .unwrap_or(window.fullscreen),
                ),
                WindowGetterKind::IsMinimized => Box::new(
                    window
                        .with_cef_window(|w| w.is_minimized() != 0)
                        .unwrap_or(window.minimized),
                ),
                WindowGetterKind::IsMaximized => Box::new(
                    window
                        .with_cef_window(|w| w.is_maximized() != 0)
                        .unwrap_or(window.maximized),
                ),
                WindowGetterKind::IsFocused => Box::new(
                    window
                        .with_cef_window(|w| w.is_active() != 0)
                        .unwrap_or(window.focused),
                ),
                WindowGetterKind::IsDecorated => Box::new(window.decorated),
                WindowGetterKind::IsResizable => Box::new(window.resizable),
                WindowGetterKind::IsMaximizable => Box::new(window.maximizable),
                WindowGetterKind::IsMinimizable => Box::new(window.minimizable),
                WindowGetterKind::IsClosable => Box::new(window.closable),
                WindowGetterKind::IsVisible => Box::new(
                    window
                        .with_cef_window(|w| w.is_visible() != 0)
                        .unwrap_or(window.visible),
                ),
                WindowGetterKind::IsEnabled => Box::new(true),
                WindowGetterKind::IsAlwaysOnTop => Box::new(
                    window
                        .with_cef_window(|w| w.is_always_on_top() != 0)
                        .unwrap_or(window.always_on_top),
                ),
                WindowGetterKind::Title => Box::new(window.title.clone()),
                WindowGetterKind::CurrentMonitor => {
                    Box::new(current_monitor_for_cef_window(window, target))
                }
                WindowGetterKind::PrimaryMonitor => Box::new(target.primary_monitor()),
                WindowGetterKind::AvailableMonitors => {
                    Box::new(target.available_monitors().collect::<Vec<_>>())
                }
                #[cfg(target_os = "linux")]
                WindowGetterKind::GtkWindow | WindowGetterKind::GtkBox => {
                    // CEF windowed runtime owns a top-level CEF Views window,
                    // so there is no GTK ApplicationWindow/default vbox to expose.
                    return Err(Error::CreateWindow);
                }
                WindowGetterKind::RawWindowHandle => {
                    Box::new(raw_window_handle_for_cef_window(window))
                }
                WindowGetterKind::Theme => Box::new(Theme::Light),
            };
            Ok(value)
        }

        /// 处理某个 CEF webview 的运行期操作。
        fn handle_webview_message(&self, webview_id: WebviewId, message: WebviewMessage) {
            let mut webviews = self.webviews.0.borrow_mut();
            let Some(state) = webviews.get_mut(&webview_id) else {
                return;
            };
            match message {
                WebviewMessage::AddEventListener(id, listener) => {
                    state.listeners.push((id, listener))
                }
                WebviewMessage::Get(kind, tx) => {
                    let _ = tx.send(webview_get(state, kind));
                }
                WebviewMessage::WithWebview(f) => f(Box::new(())),
                WebviewMessage::OpenDevTools => {
                    if let Some(host) = state.resolve_browser().and_then(|b| b.host()) {
                        host.show_dev_tools(
                            Some(&WindowInfo::default()),
                            None,
                            Some(&BrowserSettings::default()),
                            None,
                        );
                    }
                }
                WebviewMessage::CloseDevTools => {
                    if let Some(host) = state.resolve_browser().and_then(|b| b.host()) {
                        host.close_dev_tools();
                    }
                }
                WebviewMessage::Navigate(url) => {
                    if let Some(frame) = state.resolve_browser().and_then(|b| b.main_frame()) {
                        frame.load_url(Some(&CefString::from(url.as_str())));
                        state.url = url;
                    }
                }
                WebviewMessage::Reload => {
                    if let Some(browser) = state.resolve_browser() {
                        browser.reload();
                    }
                }
                WebviewMessage::Close => {
                    if let Some(host) = state.resolve_browser().and_then(|b| b.host()) {
                        host.close_browser(1);
                    }
                }
                WebviewMessage::SetSize(size) => {
                    let (w, h) = match size {
                        Size::Physical(s) => (s.width, s.height),
                        Size::Logical(s) => (s.width as u32, s.height as u32),
                    };
                    if let Some(browser_view) = &state.browser_view {
                        browser_view.inner.set_bounds(Some(&cef::Rect {
                            x: 0,
                            y: 0,
                            width: w as i32,
                            height: h as i32,
                        }));
                    }
                }
                WebviewMessage::SetFocus => {
                    if let Some(host) = state.resolve_browser().and_then(|b| b.host()) {
                        host.set_focus(1);
                    }
                }
                WebviewMessage::SetVisible(visible) => {
                    if let Some(browser_view) = &state.browser_view {
                        browser_view.inner.set_visible(i32::from(visible));
                    }
                    state.visible = visible;
                }
                WebviewMessage::Eval(script) => {
                    if let Some(frame) = state.resolve_browser().and_then(|b| b.main_frame()) {
                        frame.execute_java_script(
                            Some(&CefString::from(script.as_str())),
                            Some(&CefString::from(state.url.as_str())),
                            0,
                        );
                    }
                }
                WebviewMessage::SetAutoResize(auto_resize) => state.auto_resize = auto_resize,
                WebviewMessage::SetZoom(scale_factor) => {
                    if let Some(host) = state.resolve_browser().and_then(|b| b.host()) {
                        host.set_zoom_level(scale_factor);
                    }
                }
            }
        }
    }

    /// 执行 webview getter,返回装箱结果供 dispatcher downcast。
    fn webview_get(
        state: &webview::CefWebviewState,
        kind: WebviewGetterKind,
    ) -> Result<Box<dyn Any + Send>> {
        let value: Box<dyn Any + Send> = match kind {
            WebviewGetterKind::Url => Box::new(state.url.clone()),
            WebviewGetterKind::Size => {
                if let Some(browser_view) = &state.browser_view {
                    let size = browser_view.inner.size();
                    Box::new(PhysicalSize::new(
                        size.width.max(1) as u32,
                        size.height.max(1) as u32,
                    ))
                } else {
                    Box::new(PhysicalSize::new(1, 1))
                }
            }
            WebviewGetterKind::DevToolsOpen => Box::new(
                state
                    .resolve_browser()
                    .and_then(|browser| browser.host())
                    .is_some_and(|host| host.has_dev_tools() == 1),
            ),
        };
        Ok(value)
    }

    #[cfg(target_os = "linux")]
    fn pump_glib(main_context: &MainContext) -> bool {
        let mut did_glib_work = false;
        while main_context.pending() {
            did_glib_work |= main_context.iteration(false);
        }
        did_glib_work
    }

    fn pump_platform_messages() -> bool {
        #[cfg(target_os = "linux")]
        {
            return pump_glib(&MainContext::default());
        }

        #[cfg(target_os = "windows")]
        {
            return pump_windows_messages();
        }

        #[cfg(target_os = "macos")]
        {
            return crate::app_mac::pump_events();
        }

        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            false
        }
    }

    #[cfg(target_os = "windows")]
    fn pump_windows_messages() -> bool {
        use windows_sys::Win32::Foundation::HWND;
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            DispatchMessageW, PeekMessageW, TranslateMessage, MSG, PM_REMOVE,
        };

        let mut did_work = false;
        unsafe {
            let mut msg = std::mem::zeroed::<MSG>();
            while PeekMessageW(&mut msg, 0 as HWND, 0, 0, PM_REMOVE) != 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
                did_work = true;
            }
        }
        did_work
    }

    fn post_cef_ui_task<R, F>(task: F) -> Result<R>
    where
        R: Send + 'static,
        F: FnOnce() -> Result<R> + Send + 'static,
    {
        // 必须先等 CEF browser-process 上下文初始化完成,否则在 `on_context_initialized`
        // 之前发起的 `browser_view_create` / `window_create_top_level` 会因上下文未就绪
        // 而卡死(post 的任务在 do_message_loop_work 里 FIFO 执行,可能排在
        // on_context_initialized 之前)。在 UI 线程上同步 pump 直到 flag 置位。
        {
            let deadline = Instant::now() + Duration::from_secs(10);
            while !WINDOWED_CONTEXT_INITIALIZED.load(Ordering::Acquire) {
                if Instant::now() >= deadline {
                    eprintln!(
                        "[cef-runtime] timed out waiting for windowed CEF context initialization"
                    );
                    return Err(Error::CreateWindow);
                }
                pump_platform_messages();
                do_message_loop_work();
                std::thread::sleep(Duration::from_millis(1));
            }
        }

        let (tx, rx) = channel();
        let callback: CefUiTaskCallback = Box::new(move || {
            let _ = tx.send(task());
        });
        let mut task = CefUiTask::new(Arc::new(Mutex::new(Some(callback))));
        if post_task(ThreadId::UI, Some(&mut task)) == 0 {
            return Err(Error::CreateWindow);
        }

        let deadline = Instant::now() + Duration::from_secs(10);
        while Instant::now() < deadline {
            match rx.try_recv() {
                Ok(result) => return result,
                Err(std::sync::mpsc::TryRecvError::Empty) => {}
                Err(std::sync::mpsc::TryRecvError::Disconnected) => {
                    return Err(Error::FailedToReceiveMessage);
                }
            }
            pump_platform_messages();
            do_message_loop_work();
            std::thread::sleep(Duration::from_millis(1));
        }

        Err(Error::CreateWindow)
    }

    fn tao_size_to_physical(
        size: Option<tao::dpi::Size>,
        default_w: u32,
        default_h: u32,
    ) -> PhysicalSize<u32> {
        size.map(|size| size.to_physical::<u32>(1.0))
            .unwrap_or_else(|| PhysicalSize::new(default_w, default_h))
    }

    fn runtime_size_to_physical(size: Size) -> PhysicalSize<u32> {
        match size {
            Size::Physical(size) => size,
            Size::Logical(size) => PhysicalSize::new(size.width as u32, size.height as u32),
        }
    }

    fn runtime_position_to_physical(position: Position) -> PhysicalPosition<i32> {
        match position {
            Position::Physical(position) => position,
            Position::Logical(position) => {
                PhysicalPosition::new(position.x as i32, position.y as i32)
            }
        }
    }

    fn initial_show_state(visible: bool, maximized: bool, fullscreen: bool) -> ShowState {
        if !visible {
            ShowState::HIDDEN
        } else if fullscreen {
            ShowState::FULLSCREEN
        } else if maximized {
            ShowState::MAXIMIZED
        } else {
            ShowState::NORMAL
        }
    }

    fn current_monitor_for_cef_window<T: UserEvent>(
        window: &WindowedWindowState,
        target: &tao::event_loop::EventLoopWindowTarget<Message<T>>,
    ) -> Option<tao::monitor::MonitorHandle> {
        let (x, y) = window.with_cef_window(|w| {
            let bounds = w
                .display()
                .map(|display| display.bounds())
                .unwrap_or_else(|| w.bounds());
            (
                bounds.x as f64 + (bounds.width.max(0) as f64 / 2.0),
                bounds.y as f64 + (bounds.height.max(0) as f64 / 2.0),
            )
        })?;
        target.monitor_from_point(x, y)
    }

    fn raw_window_handle_for_cef_window(
        window: &WindowedWindowState,
    ) -> std::result::Result<SendRawWindowHandle, raw_window_handle::HandleError> {
        window
            .with_cef_window(raw_window_handle_from_cef_window)
            .unwrap_or(Err(raw_window_handle::HandleError::Unavailable))
    }

    #[cfg(target_os = "windows")]
    fn raw_window_handle_from_cef_window(
        window: &cef::Window,
    ) -> std::result::Result<SendRawWindowHandle, raw_window_handle::HandleError> {
        use std::num::NonZeroIsize;
        use windows_sys::Win32::UI::WindowsAndMessaging::{GetWindowLongPtrW, GWLP_HINSTANCE};

        let hwnd = window.window_handle().0 as isize;
        let Some(hwnd) = NonZeroIsize::new(hwnd) else {
            return Err(raw_window_handle::HandleError::Unavailable);
        };

        let mut handle = raw_window_handle::Win32WindowHandle::new(hwnd);
        let hinstance = unsafe {
            GetWindowLongPtrW(
                hwnd.get() as windows_sys::Win32::Foundation::HWND,
                GWLP_HINSTANCE,
            )
        };
        handle.hinstance = NonZeroIsize::new(hinstance);
        Ok(SendRawWindowHandle(
            raw_window_handle::RawWindowHandle::Win32(handle),
        ))
    }

    #[cfg(target_os = "linux")]
    fn raw_window_handle_from_cef_window(
        window: &cef::Window,
    ) -> std::result::Result<SendRawWindowHandle, raw_window_handle::HandleError> {
        let window = window.window_handle();
        if window == 0 {
            return Err(raw_window_handle::HandleError::Unavailable);
        }
        Ok(SendRawWindowHandle(
            raw_window_handle::RawWindowHandle::Xlib(raw_window_handle::XlibWindowHandle::new(
                window,
            )),
        ))
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    fn raw_window_handle_from_cef_window(
        _window: &cef::Window,
    ) -> std::result::Result<SendRawWindowHandle, raw_window_handle::HandleError> {
        Err(raw_window_handle::HandleError::Unavailable)
    }

    #[cfg(target_os = "windows")]
    fn apply_windows_native_window_options(
        window: &cef::Window,
        options: WindowsNativeWindowOptions,
    ) {
        use windows_sys::Win32::{
            Foundation::HWND,
            UI::{
                Shell::DragAcceptFiles,
                WindowsAndMessaging::{SetParent, SetWindowLongPtrW, GWLP_HWNDPARENT},
            },
        };

        let hwnd = window.window_handle().0 as HWND;
        if hwnd == 0 as HWND {
            return;
        }

        unsafe {
            if let Some(parent) = options.parent_hwnd.filter(|hwnd| *hwnd != 0) {
                SetParent(hwnd, parent as HWND);
            } else if let Some(owner) = options.owner_hwnd.filter(|hwnd| *hwnd != 0) {
                SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, owner);
            }

            DragAcceptFiles(hwnd, i32::from(options.drag_and_drop));
        }

        if let Some(_enabled) = options.shadow {
            // CEF Views does not expose a runtime shadow toggle. Decorated
            // top-level windows keep the OS default shadow; frameless shadow
            // policy is decided by CEF when the native HWND is created.
        }
    }

    /// 把 runtime 的窗口命令映射到 CEF Views API。
    fn apply_window_set(kind: &mut CefWindowKind, set: WindowSet) {
        let CefWindowKind::Windowed(window) = kind;
        apply_windowed_window_set(window, set);
    }

    fn apply_windowed_window_set(window: &mut WindowedWindowState, set: WindowSet) {
        // 取出 owned `cef::Window`(引用计数 clone)后**立即释放 `shared` 锁**:
        // 后续所有 CEF 窗口操作(hide/show/maximize/close…)都不持锁调用,避免它们
        // 同步回调(如 on_window_bounds_changed / on_window_destroyed,均要 shared.lock())
        // 时在同一线程对非可重入 Mutex 二次加锁而死锁。需要写 shared 的分支(Destroy)
        // 在分支内用一次性短锁。
        let cef_window = {
            let shared = window.shared.lock().expect("windowed state mutex poisoned");
            shared.window.as_ref().map(|w| w.inner.clone())
        };
        match set {
            WindowSet::Resizable(v) => window.resizable = v,
            WindowSet::Enabled(_) => {}
            WindowSet::Maximizable(v) => window.maximizable = v,
            WindowSet::Minimizable(v) => window.minimizable = v,
            WindowSet::Closable(v) => window.closable = v,
            WindowSet::Title(v) => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.set_title(Some(&CefString::from(v.as_str())));
                }
                window.title = v;
            }
            WindowSet::Maximize => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.maximize();
                }
                window.maximized = true;
                window.minimized = false;
            }
            WindowSet::Unmaximize => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.restore();
                }
                window.maximized = false;
            }
            WindowSet::Minimize => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.minimize();
                }
                window.minimized = true;
            }
            WindowSet::Unminimize => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.restore();
                }
                window.minimized = false;
            }
            WindowSet::Show => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.show();
                }
                window.visible = true;
            }
            WindowSet::Hide => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.hide();
                }
                window.visible = false;
            }
            WindowSet::Close => {
                // 可拦截关闭:不强制设 close_confirmed,走 CloseRequested 门。
                // 锁已在上方释放,close() 不持锁调用。
                if let Some(cef_window) = cef_window {
                    cef_window.close();
                }
                window.visible = false;
            }
            WindowSet::Destroy => {
                // 强制销毁(不可拦截):用一次性短锁置 close_confirmed 跳过
                // CloseRequested,随后不持锁调用 close()。
                window
                    .shared
                    .lock()
                    .expect("windowed state mutex poisoned")
                    .close_confirmed = true;
                if let Some(cef_window) = cef_window {
                    cef_window.close();
                }
                window.visible = false;
            }
            WindowSet::Decorations(v) => window.decorated = v,
            WindowSet::AlwaysOnBottom(_) => {}
            WindowSet::AlwaysOnTop(v) => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.set_always_on_top(i32::from(v));
                }
                window.always_on_top = v;
            }
            WindowSet::VisibleOnAllWorkspaces(_) => {}
            WindowSet::ContentProtected(_) => {}
            WindowSet::Size(v) => {
                let size = runtime_size_to_physical(v);
                if let Some(ref cef_window) = cef_window {
                    cef_window.set_bounds(Some(&cef::Rect {
                        x: window.position.map(|p| p.x).unwrap_or(0),
                        y: window.position.map(|p| p.y).unwrap_or(0),
                        width: size.width as i32,
                        height: size.height as i32,
                    }));
                }
                window.size = size;
            }
            WindowSet::MinSize(_) | WindowSet::MaxSize(_) | WindowSet::SizeConstraints(_) => {}
            WindowSet::Position(v) => {
                let position = runtime_position_to_physical(v);
                if let Some(ref cef_window) = cef_window {
                    cef_window.set_bounds(Some(&cef::Rect {
                        x: position.x,
                        y: position.y,
                        width: window.size.width as i32,
                        height: window.size.height as i32,
                    }));
                }
                window.position = Some(position);
            }
            WindowSet::Fullscreen(v) => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.set_fullscreen(i32::from(v));
                }
                window.fullscreen = v;
            }
            WindowSet::Focus => {
                if let Some(ref cef_window) = cef_window {
                    cef_window.activate();
                }
                window.focused = true;
            }
            WindowSet::Focusable(_) => {}
            WindowSet::Icon(_) => {}
            WindowSet::SkipTaskbar(_) => {}
            WindowSet::CursorGrab(_) => {}
            WindowSet::CursorVisible(_) => {}
            WindowSet::CursorIcon(_) => {}
            WindowSet::CursorPosition(_) => {}
            WindowSet::IgnoreCursorEvents(_) => {}
            WindowSet::StartDragging => {}
            WindowSet::StartResizeDragging(_) => {}
            WindowSet::Theme(_) => {}
        }
    }
}

pub use imp::*;
