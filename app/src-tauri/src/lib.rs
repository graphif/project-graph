#[cfg(target_os = "linux")]
mod ipc_bridge;

mod cmd;

use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager, State, Listener};

// 这两行可能不能去掉，否则会导致linux打包软件报错
use std::path::Path;

pub static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();
#[derive(Default)]
struct PendingOpenFiles(Mutex<Vec<String>>);

#[tauri::command]
fn take_pending_open_files(state: State<PendingOpenFiles>) -> Vec<String> {
    let mut guard = state.0.lock().unwrap();
    std::mem::take(&mut *guard)
}

#[tauri::command]
fn write_stdout(content: String) {
    println!("{}", content);
}

#[tauri::command]
fn write_stderr(content: String) {
    eprintln!("{}", content);
}

#[tauri::command]
fn exit(code: i32) {
    std::process::exit(code);
}

#[cfg(target_os = "linux")]
#[tauri::command]
fn qt_ipc_response(id: String, ok: bool, data: serde_json::Value) {
    do_qt_ipc_response(id, ok, data);
}

#[cfg(target_os = "linux")]
pub fn do_qt_ipc_response(id: String, ok: bool, data: serde_json::Value) {
    let data_str = serde_json::to_string(&data).unwrap_or_else(|_| "null".to_string());
    // println!("Forwarding response to Qt: id={}, ok={}, data={}", id, ok, data_str);
    
    let js = format!("window.__TAURI_IPC_RESOLVE__(\"{}\", {}, {});", id, ok, data_str);
    ipc_bridge::qobject::qt_evaluate_js(&cxx_qt_lib::QString::from(&js));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("Tauri run() function entry point reached");
    // 在 Linux 上禁用 DMA-BUF 渲染器
    // 否则无法在 Linux 上运行
    // 相同的bug: https://github.com/tauri-apps/tauri/issues/10702
    #[cfg(target_os = "linux")]
    {
        if Path::new("/proc/driver/nvidia/gpus").exists() {
            std::env::set_var("__GL_THREADED_OPTIMIZATIONS", "0");
            std::env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");
        }
    }

    println!("Starting Tauri builder setup...");
    let builder = tauri::Builder::default()
        .manage(PendingOpenFiles::default())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_system_info::init())
        .setup(|app| {
            println!("Tauri setup closure started");
            let _ = APP_HANDLE.set(app.handle().clone());

            println!("Available windows in setup:");
            for label in app.webview_windows().keys() {
                println!("  - {}", label);
            }

            #[cfg(target_os = "linux")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    println!("Tauri setup: Hiding main window");
                    let _ = window.hide();
                }
            }

            #[cfg(debug_assertions)]
            {
                // Disable devtools plugin on Linux to prevent extra windows
                #[cfg(not(target_os = "linux"))]
                app.handle().plugin(tauri_plugin_devtools::init())?;
            }
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_cli::init())?;
                app.handle().plugin(tauri_plugin_process::init())?;
                
                // On Linux Qt mode, we don't want window state to interfere with hidden windows
                #[cfg(not(target_os = "linux"))]
                app.handle()
                    .plugin(tauri_plugin_window_state::Builder::new().build())?;

                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::device::get_device_id,
            write_stdout,
            write_stderr,
            exit,
            #[cfg(target_os = "linux")]
            qt_ipc_response,
            take_pending_open_files,
        ]);

    #[cfg(target_os = "linux")]
    {
        let app = builder
            .build(tauri::generate_context!())
            .expect("error while building tauri application");
        println!("Linux headless Tauri built!");

        let handle = app.handle().clone();
        let _ = APP_HANDLE.set(handle.clone());

        // Initialize Qt on the main thread
        unsafe {
            let app_data_path = handle.path().app_data_dir().unwrap_or_else(|_| std::env::current_dir().unwrap());
            let qpa_file_path = app_data_path.join("QT_QPA_PLATFORM");

            let qpa_platform = if qpa_file_path.exists() {
                std::fs::read_to_string(&qpa_file_path)
                    .unwrap_or_else(|_| "xcb".to_string())
                    .trim()
                    .to_string()
            } else {
                // 默认使用 xcb
                let _ = std::fs::create_dir_all(&app_data_path);
                let _ = std::fs::write(&qpa_file_path, "xcb");
                "xcb".to_string()
            };

            println!("Setting QT_QPA_PLATFORM to: {}", qpa_platform);
            std::env::set_var("QT_QPA_PLATFORM", &qpa_platform);
            
            let path_str = app_data_path.to_string_lossy().to_string();
            println!("App data path: {}", path_str);
            
            ipc_bridge::qobject::init_qt_app(&cxx_qt_lib::QString::from(&path_str));
        }

        // Explicitly create the proxy window on Linux
        // This ensures it exists even in headless build mode
        use tauri::WebviewUrl;
        let proxy_window = tauri::webview::WebviewWindowBuilder::new(
            &handle,
            "proxy",
            WebviewUrl::App("/proxy.html".into())
        )
        .title("Project Graph Proxy")
        .visible(false)
        .build();

        match proxy_window {
            Ok(window) => {
                println!("Proxy window created successfully");
            }
            Err(e) => println!("Failed to create proxy window: {}", e),
        }

        // Listen to requests from Qt and forward to Tauri webview
        app.listen("qt-ipc-request", move |event| {
            let payload = event.payload();
            // println!("Received qt-ipc-request: {}", payload);
            #[derive(serde::Deserialize)]
            struct QtIpcRequest {
                req_id: String,
                cmd: String,
                args: String,
                headers: String,
            }
            
            if let Ok(req) = serde_json::from_str::<QtIpcRequest>(payload) {
                if let Some(window) = handle.get_webview_window("proxy") {
                    // println!("Forwarding IPC request to proxy window: cmd={}, args={}, headers={}", req.cmd, req.args, req.headers);
                    let js = format!(r#"
                        (async () => {{
                            try {{
                                if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {{
                                    const res = await window.__TAURI_INTERNALS__.invoke("{}", {}, {});
                                    await window.__TAURI_INTERNALS__.invoke('qt_ipc_response', {{ id: "{}", ok: true, data: res }});
                                }} else {{
                                    console.error("Tauri internals not ready in proxy window");
                                }}
                            }} catch (err) {{
                                let errorData = err;
                                if (err instanceof Error) {{
                                    errorData = err.message;
                                }}
                                try {{
                                    await window.__TAURI_INTERNALS__.invoke('qt_ipc_response', {{ id: "{}", ok: false, data: errorData }});
                                }} catch(e) {{
                                    console.error("Failed to send error back to Qt", e);
                                }}
                            }}
                        }})();
                    "#, req.cmd, req.args, req.headers, req.req_id, req.req_id);
                    
                    window.eval(&js).ok();
                } else {
                    println!("Proxy window NOT found during IPC request!");
                }
            }
        });

        println!("Starting Tauri event loop on main thread...");
        
        // Spawn a background timer to keep the main event loop alive for Qt
        let handle_clone = app.handle().clone();
        std::thread::spawn(move || {
            use tauri::Emitter;
            loop {
                // Trigger a dummy event to wake up the main loop
                let _ = handle_clone.emit("qt-tick", ());
                std::thread::sleep(std::time::Duration::from_millis(16));
            }
        });

        app.run(move |app_handle, event| {
            // Drive Qt events whenever anything happens
            let should_continue = unsafe {
                ipc_bridge::qobject::tick_qt_app()
            };

            if !should_continue {
                app_handle.exit(0);
            }

            match event {
                tauri::RunEvent::ExitRequested { api, .. } => {
                    // We handle exit via Qt's lastWindowClosed signal or similar
                    // api.prevent_exit();
                }
                _ => {}
            }
        });
    }

    #[cfg(not(target_os = "linux"))]
    {
        builder
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
