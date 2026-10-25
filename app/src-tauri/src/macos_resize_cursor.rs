use objc2::{define_class, msg_send, rc::Retained, MainThreadOnly};
use objc2_app_kit::{
    NSAutoresizingMaskOptions, NSCursor, NSCursorFrameResizeDirections,
    NSCursorFrameResizePosition as Position, NSView, NSWindow,
};
use objc2_foundation::{NSPoint, NSRect, NSSize};

define_class!(
    #[unsafe(super(NSView))]
    #[thread_kind = MainThreadOnly]
    struct ResizeCursorView;

    impl ResizeCursorView {
        // Cursor rectangles must not intercept AppKit's native edge dragging.
        #[unsafe(method_id(hitTest:))]
        fn hit_test(&self, _point: NSPoint) -> Option<Retained<NSView>> {
            None
        }

        #[allow(deprecated)]
        #[unsafe(method(resetCursorRects))]
        fn reset_cursor_rects(&self) {
            let Some(window) = self.window() else { return };
            if window.styleMask().contains(objc2_app_kit::NSWindowStyleMask::FullScreen)
                || window.isZoomed()
            {
                return;
            }
            let size = self.bounds().size;
            let edge = 4.0;
            let corner = 12.0;
            let regions = [
                (Position::Left, 0.0, corner, edge, size.height - corner * 2.0),
                (Position::Right, size.width - edge, corner, edge, size.height - corner * 2.0),
                (Position::Bottom, corner, 0.0, size.width - corner * 2.0, edge),
                (Position::Top, corner, size.height - edge, size.width - corner * 2.0, edge),
                (Position::BottomLeft, 0.0, 0.0, corner, corner),
                (Position::BottomRight, size.width - corner, 0.0, corner, corner),
                (Position::TopLeft, 0.0, size.height - corner, corner, corner),
                (Position::TopRight, size.width - corner, size.height - corner, corner, corner),
            ];
            for (position, x, y, width, height) in regions {
                let cursor = if objc2::available!(macos = 15.0) {
                    NSCursor::frameResizeCursorFromPosition_inDirections(
                        position,
                        NSCursorFrameResizeDirections::All,
                    )
                } else {
                    // Older macOS supplies diagonal cursors through its native window frame.
                    match position {
                        Position::Left | Position::Right => NSCursor::resizeLeftRightCursor(),
                        Position::Top | Position::Bottom => NSCursor::resizeUpDownCursor(),
                        _ => continue,
                    }
                };
                self.addCursorRect_cursor(
                    NSRect::new(NSPoint::new(x, y), NSSize::new(width.max(0.0), height.max(0.0))),
                    &cursor,
                );
            }
        }
    }
);

pub fn install(window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    let native = window.ns_window()?;
    // Tauri setup runs on the main thread and the content view retains its subviews.
    unsafe {
        let window = &*(native as *const NSWindow);
        let content = window
            .contentView()
            .ok_or("Window content view is unavailable")?;
        let overlay: Retained<ResizeCursorView> = msg_send![
            ResizeCursorView::alloc(content.mtm()), initWithFrame: content.bounds()
        ];
        overlay.setAutoresizingMask(
            NSAutoresizingMaskOptions::ViewWidthSizable
                | NSAutoresizingMaskOptions::ViewHeightSizable,
        );
        content.addSubview(&overlay);
        window.invalidateCursorRectsForView(&overlay);
    }
    Ok(())
}
