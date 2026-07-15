//! CEF runtime 的窗口半边。
//!
//! 这一层适配 Tauri 的窗口 trait 到 CEF Views。tao 仅提供 Tauri 通用的
//! builder、事件循环和 monitor 类型，不承载原生应用窗口。

mod imp {
    use std::sync::mpsc::channel;

    use raw_window_handle::WindowHandle;
    #[cfg(target_os = "linux")]
    use tao::platform::unix::WindowBuilderExtUnix;
    #[cfg(target_os = "windows")]
    use tao::platform::windows::WindowBuilderExtWindows;
    use tao::{
        dpi::{
            LogicalPosition as TaoLogicalPosition, LogicalSize as TaoLogicalSize,
            PhysicalPosition as TaoPhysicalPosition, PhysicalSize as TaoPhysicalSize,
            Position as TaoPosition, Size as TaoSize,
        },
        window::{
            CursorIcon as TaoCursorIcon, Fullscreen, Icon as TaoIcon,
            ResizeDirection as TaoResizeDirection, Theme as TaoTheme,
            UserAttentionType as TaoUserAttentionType, WindowBuilder as TaoWindowBuilder,
        },
    };
    use tauri_runtime::window::WindowId;
    use tauri_runtime::{
        dpi::{LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize, Position, Size},
        monitor::Monitor,
        window::{
            CursorIcon, DetachedWindow, PendingWindow, RawWindow, WebviewEvent, WindowBuilder,
            WindowBuilderBase, WindowEvent, WindowSizeConstraints,
        },
        Error, Icon, ProgressBarState, ResizeDirection, Result, UserAttentionType, UserEvent,
        WebviewEventId, WindowDispatch, WindowEventId,
    };
    use tauri_utils::{config::Color, Theme};
    #[cfg(windows)]
    use windows::Win32::Foundation::HWND;

    use crate::{runtime, Cef, CefHandle};

    /// Tauri 窗口 dispatcher 的 CEF 实现。
    ///
    /// 它不直接保存平台窗口对象，而是保存 `window_id + CefContext`。所有操作
    /// 都通过 runtime 内部消息转回主线程,避免跨线程操作 tao/GTK 对象。
    #[derive(Clone)]
    pub struct CefWindowDispatcher<T: UserEvent> {
        pub(crate) window_id: WindowId,
        pub(crate) context: runtime::CefContext<T>,
    }

    impl<T: UserEvent> std::fmt::Debug for CefWindowDispatcher<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.debug_struct("CefWindowDispatcher")
                .field("window_id", &self.window_id)
                .finish()
        }
    }

    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl<T: UserEvent> Sync for CefWindowDispatcher<T> {}

    /// Tauri window builder 到 tao window builder 的适配器。
    ///
    /// `tauri_runtime::window::WindowBuilder` 是 runtime 抽象层的 builder trait；
    /// 这里把它的配置逐项映射到 tao `WindowBuilder`。
    #[derive(Debug, Clone)]
    pub struct CefWindowBuilder {
        pub(crate) inner: TaoWindowBuilder,
        pub(crate) center: bool,
        /// 原始 RGBA 图标(宽、高)。tao 的 `window_icon` 在 windowed(CEF Views)
        /// 路径下用不上(不建 tao 窗口),故额外保留 RGBA,供 runtime 给 CEF
        /// `Window::set_window_icon` / `set_window_app_icon` 用。
        pub(crate) icon_rgba: Option<(Vec<u8>, u32, u32)>,
        #[cfg(windows)]
        pub(crate) owner_hwnd: Option<isize>,
        #[cfg(windows)]
        pub(crate) parent_hwnd: Option<isize>,
        #[cfg(windows)]
        pub(crate) drag_and_drop: bool,
        #[cfg(windows)]
        pub(crate) shadow: Option<bool>,
    }

    #[allow(clippy::non_send_fields_in_send_ty)]
    unsafe impl Send for CefWindowBuilder {}

    impl Default for CefWindowBuilder {
        fn default() -> Self {
            Self {
                inner: TaoWindowBuilder::new(),
                center: false,
                icon_rgba: None,
                #[cfg(windows)]
                owner_hwnd: None,
                #[cfg(windows)]
                parent_hwnd: None,
                #[cfg(windows)]
                drag_and_drop: true,
                #[cfg(windows)]
                shadow: None,
            }
            .title("Tauri App")
            .focused(true)
        }
    }

    impl WindowBuilderBase for CefWindowBuilder {}

    impl WindowBuilder for CefWindowBuilder {
        /// 创建带 Tauri 默认标题和 focus 配置的 builder。
        fn new() -> Self {
            Self::default()
        }

        /// 从 Tauri 配置文件里的 `WindowConfig` 构造 tao builder。
        fn with_config(config: &tauri_utils::config::WindowConfig) -> Self {
            let mut window = Self::new()
                .title(config.title.to_string())
                .inner_size(config.width, config.height)
                .focused(config.focus)
                .focusable(config.focusable)
                .visible(config.visible)
                .resizable(config.resizable)
                .fullscreen(config.fullscreen)
                .decorations(config.decorations)
                .maximized(config.maximized)
                .always_on_bottom(config.always_on_bottom)
                .always_on_top(config.always_on_top)
                .visible_on_all_workspaces(config.visible_on_all_workspaces)
                .content_protected(config.content_protected)
                .skip_taskbar(config.skip_taskbar)
                .theme(config.theme)
                .closable(config.closable)
                .maximizable(config.maximizable)
                .minimizable(config.minimizable)
                .shadow(config.shadow);

            let mut constraints = WindowSizeConstraints::default();
            if let Some(min_width) = config.min_width {
                constraints.min_width = Some(tao::dpi::LogicalUnit::new(min_width).into());
            }
            if let Some(min_height) = config.min_height {
                constraints.min_height = Some(tao::dpi::LogicalUnit::new(min_height).into());
            }
            if let Some(max_width) = config.max_width {
                constraints.max_width = Some(tao::dpi::LogicalUnit::new(max_width).into());
            }
            if let Some(max_height) = config.max_height {
                constraints.max_height = Some(tao::dpi::LogicalUnit::new(max_height).into());
            }
            window = window.inner_size_constraints(constraints);

            if let (Some(x), Some(y)) = (config.x, config.y) {
                window = window.position(x, y);
            }
            if config.center {
                window = window.center();
            }
            if let Some(color) = config.background_color {
                window = window.background_color(color);
            }
            window
        }

        fn center(mut self) -> Self {
            self.center = true;
            self
        }

        fn position(mut self, x: f64, y: f64) -> Self {
            self.inner = self.inner.with_position(TaoLogicalPosition::new(x, y));
            self
        }

        fn inner_size(mut self, width: f64, height: f64) -> Self {
            self.inner = self
                .inner
                .with_inner_size(TaoLogicalSize::new(width, height));
            self
        }

        fn min_inner_size(mut self, min_width: f64, min_height: f64) -> Self {
            self.inner = self
                .inner
                .with_min_inner_size(TaoLogicalSize::new(min_width, min_height));
            self
        }

        fn max_inner_size(mut self, max_width: f64, max_height: f64) -> Self {
            self.inner = self
                .inner
                .with_max_inner_size(TaoLogicalSize::new(max_width, max_height));
            self
        }

        fn inner_size_constraints(mut self, constraints: WindowSizeConstraints) -> Self {
            self.inner.window.inner_size_constraints = tao::window::WindowSizeConstraints {
                min_width: constraints.min_width,
                min_height: constraints.min_height,
                max_width: constraints.max_width,
                max_height: constraints.max_height,
            };
            self
        }

        fn prevent_overflow(self) -> Self {
            self
        }

        fn prevent_overflow_with_margin(self, _margin: Size) -> Self {
            self
        }

        fn resizable(mut self, resizable: bool) -> Self {
            self.inner = self.inner.with_resizable(resizable);
            self
        }

        fn maximizable(mut self, maximizable: bool) -> Self {
            self.inner = self.inner.with_maximizable(maximizable);
            self
        }

        fn minimizable(mut self, minimizable: bool) -> Self {
            self.inner = self.inner.with_minimizable(minimizable);
            self
        }

        fn closable(mut self, closable: bool) -> Self {
            self.inner = self.inner.with_closable(closable);
            self
        }

        fn title<S: Into<String>>(mut self, title: S) -> Self {
            self.inner = self.inner.with_title(title.into());
            self
        }

        fn fullscreen(mut self, fullscreen: bool) -> Self {
            self.inner = self
                .inner
                .with_fullscreen(fullscreen.then_some(Fullscreen::Borderless(None)));
            self
        }

        fn focused(mut self, focused: bool) -> Self {
            self.inner = self.inner.with_focused(focused);
            self
        }

        fn focusable(mut self, focusable: bool) -> Self {
            self.inner = self.inner.with_focusable(focusable);
            self
        }

        fn maximized(mut self, maximized: bool) -> Self {
            self.inner = self.inner.with_maximized(maximized);
            self
        }

        fn visible(mut self, visible: bool) -> Self {
            self.inner = self.inner.with_visible(visible);
            self
        }

        // Mirror the trait gate: `WindowBuilder::transparent` only exists on
        // macOS when the `macos-private-api` feature is enabled, which this
        // crate never enables. Providing it unconditionally under
        // `target_os = "macos"` breaks the trait impl (E0407).
        #[cfg(not(target_os = "macos"))]
        fn transparent(mut self, transparent: bool) -> Self {
            self.inner = self.inner.with_transparent(transparent);
            self
        }

        fn decorations(mut self, decorations: bool) -> Self {
            self.inner = self.inner.with_decorations(decorations);
            self
        }

        fn always_on_bottom(mut self, always_on_bottom: bool) -> Self {
            self.inner = self.inner.with_always_on_bottom(always_on_bottom);
            self
        }

        fn always_on_top(mut self, always_on_top: bool) -> Self {
            self.inner = self.inner.with_always_on_top(always_on_top);
            self
        }

        fn visible_on_all_workspaces(mut self, visible_on_all_workspaces: bool) -> Self {
            self.inner = self
                .inner
                .with_visible_on_all_workspaces(visible_on_all_workspaces);
            self
        }

        fn content_protected(mut self, protected: bool) -> Self {
            self.inner = self.inner.with_content_protection(protected);
            self
        }

        fn icon(mut self, icon: Icon) -> Result<Self> {
            let (width, height) = (icon.width, icon.height);
            let rgba = icon.rgba.into_owned();
            // 保留 RGBA 供 windowed(CEF Views)路径设置窗口/任务栏图标。
            self.icon_rgba = Some((rgba.clone(), width, height));
            let tao_icon = TaoIcon::from_rgba(rgba, width, height)
                .map_err(|e| Error::InvalidIcon(Box::new(e)))?;
            self.inner = self.inner.with_window_icon(Some(tao_icon));
            Ok(self)
        }

        #[allow(unused_mut)]
        fn skip_taskbar(mut self, skip: bool) -> Self {
            #[cfg(any(target_os = "linux", target_os = "windows"))]
            {
                self.inner = self.inner.with_skip_taskbar(skip);
            }
            #[cfg(not(any(target_os = "linux", target_os = "windows")))]
            {
                // Unsupported target for this runtime crate; keep the builder
                // chain inert if the crate is type-checked there.
                let _ = skip;
            }
            self
        }

        fn background_color(mut self, color: Color) -> Self {
            self.inner.window.background_color = Some(color.into());
            self
        }

        #[allow(unused_mut)]
        fn shadow(mut self, enable: bool) -> Self {
            #[cfg(windows)]
            {
                self.shadow = Some(enable);
            }
            #[cfg(not(windows))]
            {
                let _ = enable;
            }
            self
        }

        #[cfg(windows)]
        fn owner(mut self, owner: HWND) -> Self {
            self.owner_hwnd = Some(owner.0 as isize);
            self.parent_hwnd = None;
            self.inner = self.inner.with_owner_window(owner.0 as isize);
            self
        }

        #[cfg(windows)]
        fn parent(mut self, parent: HWND) -> Self {
            self.parent_hwnd = Some(parent.0 as isize);
            self.owner_hwnd = None;
            self.inner = self.inner.with_parent_window(parent.0 as isize);
            self
        }

        #[cfg(target_os = "macos")]
        fn parent(self, _parent: *mut std::ffi::c_void) -> Self {
            self
        }

        #[cfg(target_os = "macos")]
        fn title_bar_style(self, _style: tauri_utils::TitleBarStyle) -> Self {
            self
        }

        #[cfg(target_os = "macos")]
        fn traffic_light_position<P: Into<Position>>(self, _position: P) -> Self {
            self
        }

        #[cfg(target_os = "macos")]
        fn hidden_title(self, _hidden: bool) -> Self {
            self
        }

        #[cfg(target_os = "macos")]
        fn tabbing_identifier(self, _identifier: &str) -> Self {
            self
        }

        #[cfg(windows)]
        fn drag_and_drop(mut self, enabled: bool) -> Self {
            self.drag_and_drop = enabled;
            self.inner = self.inner.with_drag_and_drop(enabled);
            self
        }

        #[cfg(any(
            target_os = "linux",
            target_os = "dragonfly",
            target_os = "freebsd",
            target_os = "netbsd",
            target_os = "openbsd"
        ))]
        fn transient_for(self, parent: &impl gtk::glib::IsA<gtk::Window>) -> Self {
            use tao::platform::unix::WindowBuilderExtUnix;
            Self {
                inner: self.inner.with_transient_for(parent),
                center: self.center,
                icon_rgba: self.icon_rgba,
            }
        }

        fn theme(mut self, theme: Option<Theme>) -> Self {
            self.inner = self.inner.with_theme(theme.map(to_tao_theme));
            self
        }

        fn has_icon(&self) -> bool {
            self.inner.window.window_icon.is_some()
        }

        fn get_theme(&self) -> Option<Theme> {
            self.inner.window.preferred_theme.map(from_tao_theme)
        }

        fn window_classname<S: Into<String>>(self, _window_classname: S) -> Self {
            self
        }
    }

    impl<T: UserEvent> WindowDispatch<T> for CefWindowDispatcher<T> {
        type Runtime = Cef<T>;
        type WindowBuilder = CefWindowBuilder;

        /// 把任务转发到 runtime 主线程执行。
        fn run_on_main_thread<F: FnOnce() + Send + 'static>(&self, f: F) -> Result<()> {
            self.context.send(runtime::Message::Task(Box::new(f)))
        }

        /// 注册窗口事件监听器。
        ///
        /// tao 原生事件会在 runtime 主循环里转换成 Tauri `WindowEvent`,
        /// 然后按这里注册的 listener id 分发。
        fn on_window_event<F: Fn(&WindowEvent) + Send + 'static>(&self, f: F) -> WindowEventId {
            let id = self.context.next_window_event_id();
            let _ = self.context.send(runtime::Message::Window(
                self.window_id,
                runtime::WindowMessage::AddEventListener(id, Box::new(f)),
            ));
            id
        }

        fn scale_factor(&self) -> Result<f64> {
            window_getter(self, runtime::WindowGetter::ScaleFactor)
        }

        fn inner_position(&self) -> Result<PhysicalPosition<i32>> {
            window_getter(self, runtime::WindowGetter::InnerPosition)
        }

        fn outer_position(&self) -> Result<PhysicalPosition<i32>> {
            window_getter(self, runtime::WindowGetter::OuterPosition)
        }

        fn inner_size(&self) -> Result<PhysicalSize<u32>> {
            window_getter(self, runtime::WindowGetter::InnerSize)
        }

        fn outer_size(&self) -> Result<PhysicalSize<u32>> {
            window_getter(self, runtime::WindowGetter::OuterSize)
        }

        fn is_fullscreen(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsFullscreen)
        }

        fn is_minimized(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsMinimized)
        }

        fn is_maximized(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsMaximized)
        }

        fn is_focused(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsFocused)
        }

        fn is_decorated(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsDecorated)
        }

        fn is_resizable(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsResizable)
        }

        fn is_maximizable(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsMaximizable)
        }

        fn is_minimizable(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsMinimizable)
        }

        fn is_closable(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsClosable)
        }

        fn is_visible(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsVisible)
        }

        fn is_enabled(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsEnabled)
        }

        fn is_always_on_top(&self) -> Result<bool> {
            window_getter(self, runtime::WindowGetter::IsAlwaysOnTop)
        }

        fn title(&self) -> Result<String> {
            window_getter(self, runtime::WindowGetter::Title)
        }

        fn current_monitor(&self) -> Result<Option<Monitor>> {
            Ok(window_getter::<_, Option<tao::monitor::MonitorHandle>>(
                self,
                runtime::WindowGetter::CurrentMonitor,
            )?
            .map(monitor_from_tao))
        }

        fn primary_monitor(&self) -> Result<Option<Monitor>> {
            Ok(window_getter::<_, Option<tao::monitor::MonitorHandle>>(
                self,
                runtime::WindowGetter::PrimaryMonitor,
            )?
            .map(monitor_from_tao))
        }

        fn monitor_from_point(&self, x: f64, y: f64) -> Result<Option<Monitor>> {
            let (tx, rx) = channel();
            self.context.send(runtime::Message::Window(
                self.window_id,
                runtime::WindowMessage::MonitorFromPoint(tx, x, y),
            ))?;
            Ok(rx
                .recv()
                .map_err(|_| Error::FailedToReceiveMessage)?
                .map(monitor_from_tao))
        }

        fn available_monitors(&self) -> Result<Vec<Monitor>> {
            let monitors: Vec<tao::monitor::MonitorHandle> =
                window_getter(self, runtime::WindowGetter::AvailableMonitors)?;
            Ok(monitors.into_iter().map(monitor_from_tao).collect())
        }

        #[cfg(target_os = "linux")]
        fn gtk_window(&self) -> Result<gtk::ApplicationWindow> {
            window_getter::<_, runtime::GtkWindow>(self, runtime::WindowGetter::GtkWindow)
                .map(|w| w.0)
        }

        #[cfg(target_os = "linux")]
        fn default_vbox(&self) -> Result<gtk::Box> {
            window_getter::<_, runtime::GtkBox>(self, runtime::WindowGetter::GtkBox).map(|w| w.0)
        }

        fn window_handle(
            &self,
        ) -> std::result::Result<WindowHandle<'_>, raw_window_handle::HandleError> {
            let raw: std::result::Result<
                runtime::SendRawWindowHandle,
                raw_window_handle::HandleError,
            > = window_getter(self, runtime::WindowGetter::RawWindowHandle)
                .map_err(|_| raw_window_handle::HandleError::Unavailable)?;
            raw.map(|h| unsafe { WindowHandle::borrow_raw(h.0) })
        }

        fn theme(&self) -> Result<Theme> {
            window_getter(self, runtime::WindowGetter::Theme)
        }

        fn center(&self) -> Result<()> {
            self.context.send(runtime::Message::Window(
                self.window_id,
                runtime::WindowMessage::Center,
            ))
        }

        fn request_user_attention(&self, request_type: Option<UserAttentionType>) -> Result<()> {
            self.context.send(runtime::Message::Window(
                self.window_id,
                runtime::WindowMessage::RequestUserAttention(request_type.map(to_tao_attention)),
            ))
        }

        fn create_window<F: Fn(RawWindow) + Send + 'static>(
            &mut self,
            pending: PendingWindow<T, Self::Runtime>,
            after_window_creation: Option<F>,
        ) -> Result<DetachedWindow<T, Self::Runtime>> {
            let handle = CefHandle {
                context: self.context.clone(),
            };
            tauri_runtime::RuntimeHandle::create_window(&handle, pending, after_window_creation)
        }

        /// 在当前窗口 dispatcher 所属窗口上追加 webview。
        fn create_webview(
            &mut self,
            pending: tauri_runtime::webview::PendingWebview<T, Self::Runtime>,
        ) -> Result<tauri_runtime::webview::DetachedWebview<T, Self::Runtime>> {
            let handle = CefHandle {
                context: self.context.clone(),
            };
            tauri_runtime::RuntimeHandle::create_webview(&handle, self.window_id, pending)
        }

        fn set_resizable(&self, resizable: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::Resizable(resizable))
        }
        fn set_enabled(&self, enabled: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::Enabled(enabled))
        }
        fn set_maximizable(&self, maximizable: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::Maximizable(maximizable))
        }
        fn set_minimizable(&self, minimizable: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::Minimizable(minimizable))
        }
        fn set_closable(&self, closable: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::Closable(closable))
        }
        fn set_title<S: Into<String>>(&self, title: S) -> Result<()> {
            self.send_set(runtime::WindowSet::Title(title.into()))
        }
        fn maximize(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Maximize)
        }
        fn unmaximize(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Unmaximize)
        }
        fn minimize(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Minimize)
        }
        fn unminimize(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Unminimize)
        }
        fn show(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Show)
        }
        fn hide(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Hide)
        }
        fn close(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Close)
        }
        fn destroy(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Destroy)
        }
        fn set_decorations(&self, decorations: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::Decorations(decorations))
        }
        fn set_shadow(&self, _enable: bool) -> Result<()> {
            Ok(())
        }
        fn set_always_on_bottom(&self, always_on_bottom: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::AlwaysOnBottom(always_on_bottom))
        }
        fn set_always_on_top(&self, always_on_top: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::AlwaysOnTop(always_on_top))
        }
        fn set_visible_on_all_workspaces(&self, visible_on_all_workspaces: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::VisibleOnAllWorkspaces(
                visible_on_all_workspaces,
            ))
        }
        fn set_background_color(&self, _color: Option<Color>) -> Result<()> {
            Ok(())
        }
        fn set_content_protected(&self, protected: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::ContentProtected(protected))
        }
        fn set_size(&self, size: Size) -> Result<()> {
            self.send_set(runtime::WindowSet::Size(size))
        }
        fn set_min_size(&self, size: Option<Size>) -> Result<()> {
            self.send_set(runtime::WindowSet::MinSize(size))
        }
        fn set_max_size(&self, size: Option<Size>) -> Result<()> {
            self.send_set(runtime::WindowSet::MaxSize(size))
        }
        fn set_size_constraints(&self, constraints: WindowSizeConstraints) -> Result<()> {
            self.send_set(runtime::WindowSet::SizeConstraints(constraints))
        }
        fn set_position(&self, position: Position) -> Result<()> {
            self.send_set(runtime::WindowSet::Position(position))
        }
        fn set_fullscreen(&self, fullscreen: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::Fullscreen(fullscreen))
        }
        #[cfg(target_os = "macos")]
        fn set_simple_fullscreen(&self, enable: bool) -> Result<()> {
            self.set_fullscreen(enable)
        }
        fn set_focus(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::Focus)
        }
        fn set_focusable(&self, focusable: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::Focusable(focusable))
        }
        fn set_icon(&self, icon: Icon) -> Result<()> {
            let icon = TaoIcon::from_rgba(icon.rgba.into_owned(), icon.width, icon.height)
                .map_err(|e| Error::InvalidIcon(Box::new(e)))?;
            self.send_set(runtime::WindowSet::Icon(icon))
        }
        fn set_skip_taskbar(&self, skip: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::SkipTaskbar(skip))
        }
        fn set_cursor_grab(&self, grab: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::CursorGrab(grab))
        }
        fn set_cursor_visible(&self, visible: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::CursorVisible(visible))
        }
        fn set_cursor_icon(&self, icon: CursorIcon) -> Result<()> {
            self.send_set(runtime::WindowSet::CursorIcon(to_tao_cursor(icon)))
        }
        fn set_cursor_position<Pos: Into<Position>>(&self, position: Pos) -> Result<()> {
            self.send_set(runtime::WindowSet::CursorPosition(position.into()))
        }
        fn set_ignore_cursor_events(&self, ignore: bool) -> Result<()> {
            self.send_set(runtime::WindowSet::IgnoreCursorEvents(ignore))
        }
        fn start_dragging(&self) -> Result<()> {
            self.send_set(runtime::WindowSet::StartDragging)
        }
        fn start_resize_dragging(&self, direction: ResizeDirection) -> Result<()> {
            self.send_set(runtime::WindowSet::StartResizeDragging(to_tao_resize(
                direction,
            )))
        }
        fn set_badge_count(
            &self,
            _count: Option<i64>,
            _desktop_filename: Option<String>,
        ) -> Result<()> {
            Ok(())
        }
        fn set_badge_label(&self, _label: Option<String>) -> Result<()> {
            Ok(())
        }
        fn set_overlay_icon(&self, _icon: Option<Icon>) -> Result<()> {
            Ok(())
        }
        fn set_progress_bar(&self, _progress_state: ProgressBarState) -> Result<()> {
            Ok(())
        }
        fn set_title_bar_style(&self, _style: tauri_utils::TitleBarStyle) -> Result<()> {
            Ok(())
        }
        fn set_traffic_light_position(&self, _position: Position) -> Result<()> {
            Ok(())
        }
        fn set_theme(&self, theme: Option<Theme>) -> Result<()> {
            self.send_set(runtime::WindowSet::Theme(theme))
        }
    }

    impl<T: UserEvent> CefWindowDispatcher<T> {
        /// 发送一个窗口 setter/命令到 runtime 主线程。
        fn send_set(&self, set: runtime::WindowSet) -> Result<()> {
            self.context.send(runtime::Message::Window(
                self.window_id,
                runtime::WindowMessage::Set(set),
            ))
        }
    }

    /// 执行同步窗口 getter。
    ///
    /// 请求会被发送到 runtime 主线程；响应使用 `Any` 装箱,这里按调用点的
    /// 类型参数 `R` downcast 回具体值。
    fn window_getter<T: UserEvent, R: Send + 'static>(
        dispatcher: &CefWindowDispatcher<T>,
        getter: runtime::WindowGetter<R>,
    ) -> Result<R> {
        let (tx, rx) = channel();
        dispatcher.context.send(runtime::Message::Window(
            dispatcher.window_id,
            runtime::WindowMessage::Get(getter.kind, tx),
        ))?;
        let boxed = rx.recv().map_err(|_| Error::FailedToReceiveMessage)??;
        boxed
            .downcast::<R>()
            .map(|v| *v)
            .map_err(|_| Error::FailedToReceiveMessage)
    }

    /// 把 tao monitor 描述转换为 Tauri runtime monitor 描述。
    pub(crate) fn monitor_from_tao(monitor: tao::monitor::MonitorHandle) -> Monitor {
        let position = PhysicalPosition::new(monitor.position().x, monitor.position().y);
        let size = PhysicalSize::new(monitor.size().width, monitor.size().height);
        Monitor {
            name: monitor.name(),
            position,
            size,
            work_area: tauri_runtime::dpi::PhysicalRect { position, size },
            scale_factor: monitor.scale_factor(),
        }
    }

    /// 把 Tauri theme 转换为 tao theme。
    pub(crate) fn to_tao_theme(theme: Theme) -> TaoTheme {
        match theme {
            Theme::Dark => TaoTheme::Dark,
            _ => TaoTheme::Light,
        }
    }

    /// 把 tao theme 转换为 Tauri theme。
    pub(crate) fn from_tao_theme(theme: TaoTheme) -> Theme {
        match theme {
            TaoTheme::Dark => Theme::Dark,
            _ => Theme::Light,
        }
    }

    /// 把 Tauri runtime 的逻辑/物理尺寸转换为 tao 尺寸。
    pub(crate) fn to_tao_size(size: Size) -> TaoSize {
        match size {
            Size::Logical(LogicalSize { width, height }) => {
                TaoSize::Logical(TaoLogicalSize::new(width, height))
            }
            Size::Physical(PhysicalSize { width, height }) => {
                TaoSize::Physical(TaoPhysicalSize::new(width, height))
            }
        }
    }

    /// 把 Tauri runtime 的逻辑/物理位置转换为 tao 位置。
    pub(crate) fn to_tao_position(position: Position) -> TaoPosition {
        match position {
            Position::Logical(LogicalPosition { x, y }) => {
                TaoPosition::Logical(TaoLogicalPosition::new(x, y))
            }
            Position::Physical(PhysicalPosition { x, y }) => {
                TaoPosition::Physical(TaoPhysicalPosition::new(x, y))
            }
        }
    }

    fn to_tao_attention(request_type: UserAttentionType) -> TaoUserAttentionType {
        match request_type {
            UserAttentionType::Critical => TaoUserAttentionType::Critical,
            UserAttentionType::Informational => TaoUserAttentionType::Informational,
        }
    }

    fn to_tao_cursor(icon: CursorIcon) -> TaoCursorIcon {
        match icon {
            CursorIcon::Crosshair => TaoCursorIcon::Crosshair,
            CursorIcon::Hand => TaoCursorIcon::Hand,
            CursorIcon::Arrow => TaoCursorIcon::Arrow,
            CursorIcon::Move => TaoCursorIcon::Move,
            CursorIcon::Text => TaoCursorIcon::Text,
            CursorIcon::Wait => TaoCursorIcon::Wait,
            CursorIcon::Help => TaoCursorIcon::Help,
            CursorIcon::Progress => TaoCursorIcon::Progress,
            CursorIcon::NotAllowed => TaoCursorIcon::NotAllowed,
            CursorIcon::ContextMenu => TaoCursorIcon::ContextMenu,
            CursorIcon::Cell => TaoCursorIcon::Cell,
            CursorIcon::VerticalText => TaoCursorIcon::VerticalText,
            CursorIcon::Alias => TaoCursorIcon::Alias,
            CursorIcon::Copy => TaoCursorIcon::Copy,
            CursorIcon::NoDrop => TaoCursorIcon::NoDrop,
            CursorIcon::Grab => TaoCursorIcon::Grab,
            CursorIcon::Grabbing => TaoCursorIcon::Grabbing,
            CursorIcon::AllScroll => TaoCursorIcon::AllScroll,
            CursorIcon::ZoomIn => TaoCursorIcon::ZoomIn,
            CursorIcon::ZoomOut => TaoCursorIcon::ZoomOut,
            CursorIcon::EResize => TaoCursorIcon::EResize,
            CursorIcon::NResize => TaoCursorIcon::NResize,
            CursorIcon::NeResize => TaoCursorIcon::NeResize,
            CursorIcon::NwResize => TaoCursorIcon::NwResize,
            CursorIcon::SResize => TaoCursorIcon::SResize,
            CursorIcon::SeResize => TaoCursorIcon::SeResize,
            CursorIcon::SwResize => TaoCursorIcon::SwResize,
            CursorIcon::WResize => TaoCursorIcon::WResize,
            CursorIcon::EwResize => TaoCursorIcon::EwResize,
            CursorIcon::NsResize => TaoCursorIcon::NsResize,
            CursorIcon::NeswResize => TaoCursorIcon::NeswResize,
            CursorIcon::NwseResize => TaoCursorIcon::NwseResize,
            CursorIcon::ColResize => TaoCursorIcon::ColResize,
            CursorIcon::RowResize => TaoCursorIcon::RowResize,
            _ => TaoCursorIcon::Default,
        }
    }

    fn to_tao_resize(direction: ResizeDirection) -> TaoResizeDirection {
        match direction {
            ResizeDirection::East => TaoResizeDirection::East,
            ResizeDirection::North => TaoResizeDirection::North,
            ResizeDirection::NorthEast => TaoResizeDirection::NorthEast,
            ResizeDirection::NorthWest => TaoResizeDirection::NorthWest,
            ResizeDirection::South => TaoResizeDirection::South,
            ResizeDirection::SouthEast => TaoResizeDirection::SouthEast,
            ResizeDirection::SouthWest => TaoResizeDirection::SouthWest,
            ResizeDirection::West => TaoResizeDirection::West,
        }
    }

    pub(crate) fn dispatch_window_event<T: UserEvent>(
        listeners: &[Box<dyn Fn(&WindowEvent) + Send>],
        event: &WindowEvent,
    ) {
        for listener in listeners {
            listener(event);
        }
    }

    pub(crate) type WindowListeners = Vec<(WindowEventId, Box<dyn Fn(&WindowEvent) + Send>)>;
    pub(crate) type WebviewListeners = Vec<(WebviewEventId, Box<dyn Fn(&WebviewEvent) + Send>)>;
}

pub(crate) use imp::*;
