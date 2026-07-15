use cef::application_mac::{CefAppProtocol, CrAppControlProtocol, CrAppProtocol};
use objc2::rc::Retained;
use objc2::runtime::Bool;
use objc2::{define_class, msg_send, ClassType, MainThreadMarker, MainThreadOnly};
use objc2_app_kit::{NSApplication, NSApplicationActivationPolicy, NSEvent, NSEventMask};
use objc2_foundation::NSDefaultRunLoopMode;
use std::sync::atomic::{AtomicBool, Ordering};

static HANDLING_SEND_EVENT: AtomicBool = AtomicBool::new(false);

define_class!(
    #[unsafe(super(NSApplication))]
    #[thread_kind = MainThreadOnly]
    #[name = "KabegameCefApplication"]
    struct KabegameCefApplication;

    impl KabegameCefApplication {
        #[unsafe(method(sendEvent:))]
        fn send_event(&self, event: &NSEvent) {
            let was = HANDLING_SEND_EVENT.swap(true, Ordering::AcqRel);
            let _: () = unsafe { msg_send![super(self), sendEvent: event] };
            HANDLING_SEND_EVENT.store(was, Ordering::Release);
        }
    }

    unsafe impl CrAppProtocol for KabegameCefApplication {
        #[unsafe(method(isHandlingSendEvent))]
        unsafe fn is_handling_send_event(&self) -> Bool {
            Bool::new(HANDLING_SEND_EVENT.load(Ordering::Acquire))
        }
    }

    unsafe impl CrAppControlProtocol for KabegameCefApplication {
        #[unsafe(method(setHandlingSendEvent:))]
        unsafe fn set_handling_send_event(&self, handling_send_event: Bool) {
            HANDLING_SEND_EVENT.store(handling_send_event.as_bool(), Ordering::Release);
        }
    }

    unsafe impl CefAppProtocol for KabegameCefApplication {}
);

pub(crate) fn init_cef_app_mac() {
    let _mtm = MainThreadMarker::new().expect("CEF application must initialize on the main thread");
    let app: Retained<KabegameCefApplication> =
        unsafe { msg_send![KabegameCefApplication::class(), sharedApplication] };
    app.finishLaunching();
}

pub(crate) fn pump_events() -> bool {
    let mtm = MainThreadMarker::new().expect("CEF application events must run on the main thread");
    let app = NSApplication::sharedApplication(mtm);
    let mut did_work = false;
    while let Some(event) = unsafe {
        app.nextEventMatchingMask_untilDate_inMode_dequeue(
            NSEventMask::Any,
            None,
            NSDefaultRunLoopMode,
            true,
        )
    } {
        app.sendEvent(&event);
        did_work = true;
    }
    did_work
}

pub(crate) fn set_activation_policy(policy: tauri_runtime::ActivationPolicy) {
    let mtm = MainThreadMarker::new().expect("activation policy must change on the main thread");
    let policy = match policy {
        tauri_runtime::ActivationPolicy::Regular => NSApplicationActivationPolicy::Regular,
        tauri_runtime::ActivationPolicy::Accessory => NSApplicationActivationPolicy::Accessory,
        tauri_runtime::ActivationPolicy::Prohibited => NSApplicationActivationPolicy::Prohibited,
        _ => NSApplicationActivationPolicy::Regular,
    };
    NSApplication::sharedApplication(mtm).setActivationPolicy(policy);
}

pub(crate) fn set_dock_visibility(visible: bool) {
    set_activation_policy(if visible {
        tauri_runtime::ActivationPolicy::Regular
    } else {
        tauri_runtime::ActivationPolicy::Accessory
    });
}

pub(crate) fn show() {
    let mtm =
        MainThreadMarker::new().expect("application visibility must change on the main thread");
    NSApplication::sharedApplication(mtm).unhide(None);
}

pub(crate) fn hide() {
    let mtm =
        MainThreadMarker::new().expect("application visibility must change on the main thread");
    NSApplication::sharedApplication(mtm).hide(None);
}
