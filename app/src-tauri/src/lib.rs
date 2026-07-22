mod cmd;

use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Listener, Manager, State};

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

    // CEF 单 binary 自举：子进程 re-exec 本程序时必须在任何 Tauri 初始化前分流。
    #[cfg(target_os = "linux")]
    tauri_runtime_cef::dispatch_cef_subprocess();

    #[cfg(target_os = "linux")]
    let builder = tauri::Builder::<tauri_runtime_cef::Cef<tauri::EventLoopMessage>>::new();
    #[cfg(not(target_os = "linux"))]
    let builder = tauri::Builder::default();

    builder
        .manage(PendingOpenFiles::default())
        .manage(cmd::mcp::McpStdioManager::default())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                app.handle().plugin(tauri_plugin_devtools::init())?;
                if let Some(window) = app.handle().get_webview_window("main") {
                    let _ = window.show();
                }
            }
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_cli::init())?;
                app.handle().plugin(tauri_plugin_process::init())?;
                app.handle().plugin(tauri_plugin_system_info::init())?;
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
            take_pending_open_files,
            #[cfg(desktop)]
            cmd::paddle::get_aha_directory,
            #[cfg(desktop)]
            cmd::paddle::paddleocr_vl_1_6_model_exists,
            #[cfg(desktop)]
            cmd::paddle::paddleocr_vl_1_6_generate,
            cmd::fs::read_folder_structure,
            cmd::fs::exists,
            cmd::fs::read_folder,
            cmd::fs::read_folder_recursive,
            cmd::fs::delete_file,
            cmd::fs::read_text_file,
            cmd::fs::read_file_base64,
            cmd::fs::write_text_file,
            cmd::fs::write_file_base64,
            cmd::fs::create_folder,
            cmd::shell::run_command,
            cmd::device::get_distribution,
            #[cfg(desktop)]
            cmd::mcp::mcp_stdio_start,
            #[cfg(desktop)]
            cmd::mcp::mcp_stdio_list_tools,
            #[cfg(desktop)]
            cmd::mcp::mcp_stdio_call_tool,
            #[cfg(desktop)]
            cmd::mcp::mcp_stdio_stop,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
