#![cfg(target_os = "linux")]

#[cxx_qt::bridge]
pub mod qobject {
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        include!("cxx-qt-lib/qbytearray.h");
        include!("qt_app.h");

        type QString = cxx_qt_lib::QString;
        type QByteArray = cxx_qt_lib::QByteArray;
        fn run_qt_app() -> i32;
        fn qt_evaluate_js(js: &QString);
        fn init_qt_app(app_data_path: &QString);
        unsafe fn tick_qt_app() -> bool;
        // Convert a QString to QByteArray preserving all byte values (Latin-1).
        // Used to recover binary data sent from JS via String.fromCharCode().
        fn qt_qstring_to_latin1(s: &QString) -> QByteArray;
        // Convert a QByteArray to compact JSON array string "[0,1,255,…]".
        fn qt_qbytearray_to_json_array(data: &QByteArray) -> QString;
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
            headers: QString,
        );

        // Same as invoke_tauri but args is a Latin-1 encoded QString containing
        // raw binary bytes. Use qt_qstring_to_latin1 to recover the bytes.
        #[qinvokable]
        fn invoke_tauri_binary(
            self: Pin<&mut TauriIpcBridge>,
            req_id: QString,
            command: QString,
            args: QString,
            headers: QString,
        );

        #[qinvokable]
        fn get_tauri_asset(self: Pin<&mut TauriIpcBridge>, path: QString) -> QByteArray;
    }
}

use core::pin::Pin;
use cxx_qt_lib::{QByteArray, QString};
use tauri::Manager;

#[derive(Default)]
pub struct TauriIpcBridgeRust {}

fn emit_tauri_request(
    req_id_str: String,
    cmd: String,
    args_str: String,
    headers_str: String,
    is_binary_args: bool,
) {
    if let Some(app) = crate::APP_HANDLE.get() {
        use tauri::{Emitter, Manager};

        #[derive(serde::Serialize, Clone)]
        struct QtIpcRequest {
            req_id: String,
            cmd: String,
            args: String,
            headers: String,
            is_binary_args: bool,
        }

        app.emit(
            "qt-ipc-request",
            QtIpcRequest {
                req_id: req_id_str,
                cmd,
                args: args_str,
                headers: headers_str,
                is_binary_args,
            },
        )
        .ok();
    }
}

impl qobject::TauriIpcBridge {
    pub fn invoke_tauri(
        mut self: Pin<&mut Self>,
        req_id: QString,
        command: QString,
        args: QString,
        headers: QString,
    ) {
        let req_id_str = req_id.to_string();
        let cmd = command.to_string();
        let args_str = args.to_string();
        let headers_str = headers.to_string();

        emit_tauri_request(req_id_str, cmd, args_str, headers_str, false);
    }

    /// Binary variant: args is a Latin-1 encoded QString containing raw binary bytes.
    /// Recover bytes via qt_qstring_to_latin1 and serialize as JSON array for the event.
    pub fn invoke_tauri_binary(
        self: Pin<&mut Self>,
        req_id: QString,
        command: QString,
        args: QString,
        headers: QString,
    ) {
        let req_id_str = req_id.to_string();
        let cmd = command.to_string();
        let headers_str = headers.to_string();

        // Convert the Latin-1 QString back to raw bytes
        let bytes = qobject::qt_qstring_to_latin1(&args);
        // Serialize as JSON array via C++ for the Tauri event
        let args_json = qobject::qt_qbytearray_to_json_array(&bytes).to_string();

        emit_tauri_request(req_id_str, cmd, args_json, headers_str, true);
    }

    pub fn get_tauri_asset(self: Pin<&mut Self>, path: QString) -> QByteArray {
        let mut path_str = path.to_string();
        if path_str.starts_with("/") {
            path_str = path_str[1..].to_string();
        }
        if path_str.is_empty() {
            path_str = "index.html".to_string();
        }
        if let Some(app) = crate::APP_HANDLE.get() {
            println!("DEBUG: Requesting asset: {}", path_str);
            for (k, _) in app.asset_resolver().iter() {
                // println!("Available asset: {}", k);
                if path_str == k || path_str == format!("/{}", k) || format!("/{}", path_str) == k {
                    println!("DEBUG: Found matching asset key: {}", k);
                }
            }
            if let Some(asset) = app.asset_resolver().get(path_str.clone().into()) {
                return QByteArray::from(asset.bytes.as_slice());
            }
            // Fallback for SPA routing if path has no extension
            if !path_str.contains(".") {
                if let Some(asset) = app.asset_resolver().get("index.html".into()) {
                    return QByteArray::from(asset.bytes.as_slice());
                }
            }
        }
        QByteArray::default()
    }
}
