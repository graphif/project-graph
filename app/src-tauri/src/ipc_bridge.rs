#[cxx_qt::bridge]
pub mod qobject {
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        include!("qt_app.h");

        type QString = cxx_qt_lib::QString;
        fn run_qt_app() -> i32;
        fn qt_evaluate_js(js: &QString);
        fn init_qt_app(app_data_path: &QString);
        unsafe fn tick_qt_app() -> bool;
    }

    unsafe extern "RustQt" {
        #[qobject]
        type TauriIpcBridge = super::TauriIpcBridgeRust;

        #[qinvokable]
        fn invoke_tauri(
            self: Pin<&mut TauriIpcBridge>,
            req_id: QString,
            command: QString,
            args: QString,
        );
    }
}

use core::pin::Pin;
use cxx_qt_lib::QString;
use tauri::Manager;

#[derive(Default)]
pub struct TauriIpcBridgeRust {}

impl qobject::TauriIpcBridge {
    pub fn invoke_tauri(
        mut self: Pin<&mut Self>,
        req_id: QString,
        command: QString,
        args: QString,
    ) {
        let req_id_str = req_id.to_string();
        let cmd = command.to_string();
        let args_str = args.to_string();
        // println!("Tauri IPC command: {}, args: {}", cmd, args_str);

        if let Some(app) = crate::APP_HANDLE.get() {
            use tauri::{Emitter, Manager};

            #[derive(serde::Serialize, Clone)]
            struct QtIpcRequest {
                req_id: String,
                cmd: String,
                args: String,
            }

            app.emit(
                "qt-ipc-request",
                QtIpcRequest {
                    req_id: req_id_str,
                    cmd,
                    args: args_str,
                },
            )
            .ok();
        } else {
            println!("CRITICAL: APP_HANDLE not set when invoking {}", cmd);
        }
    }
}
