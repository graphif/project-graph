mod cmd;

use std::sync::Mutex;

use tauri::{Emitter, Manager, State};

// 这两行可能不能去掉，否则会导致linux打包软件报错
#[cfg(target_os = "linux")]
use std::path::Path;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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

    let app = tauri::Builder::default()
        .manage(PendingOpenFiles::default())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_system_info::init())
        .setup(|app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                // let window = app.get_webview_window("main").unwrap();
                // window.open_devtools();
                app.handle().plugin(tauri_plugin_devtools::init())?;
            }
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_cli::init())?;
                app.handle().plugin(tauri_plugin_process::init())?;
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
            cmd::fs::read_folder_structure,
            cmd::fs::read_folder_recursive,
            cmd::shell::run_command,
            take_pending_open_files,
            write_stdout,
            write_stderr,
            exit,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // macos 双击打开prg文件时
    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = event {
            let mut paths = Vec::new();
            for url in urls {
                if url.scheme() == "file" {
                    if let Ok(path_buf) = url.to_file_path() {
                        let path = path_buf.to_string_lossy().to_string();
                        paths.push(path);
                    }
                }
            }
            if !paths.is_empty() {
                {
                    let state = app_handle.state::<PendingOpenFiles>();
                    let mut guard = state.0.lock().unwrap();
                    guard.extend(paths.iter().cloned());
                }
                for path in paths {
                    let _ = app_handle.emit("open-file-from-os", path);
                }
            }
        }
    });
}
