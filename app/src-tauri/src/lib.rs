mod cmd;

use std::sync::Mutex;

use tauri::{Emitter, Manager, State};

// 这两行可能不能去掉，否则会导致linux打包软件报错
#[cfg(target_os = "linux")]
use std::path::Path;

/// 非 macOS 平台：用于跨进程单实例检测的 TCP listener
/// 在 run() 中 bind，在 setup() 中取出启动监听线程
#[cfg(not(target_os = "macos"))]
static IPC_LISTENER: Mutex<Option<std::net::TcpListener>> = Mutex::new(None);

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

    // 非 macOS 平台：TCP 端口检测实现单实例
    // 第二个实例将文件路径通过 TCP 传给第一个实例后自动退出
    #[cfg(not(target_os = "macos"))]
    {
        const SINGLE_INSTANCE_PORT: u16 = 49152;
        let addr =
            std::net::SocketAddrV4::new(std::net::Ipv4Addr::LOCALHOST, SINGLE_INSTANCE_PORT);

        match std::net::TcpListener::bind(addr) {
            Ok(listener) => {
                // 第一个实例：保存 listener，稍后在 setup 中启动监听线程
                *IPC_LISTENER.lock().unwrap() = Some(listener);
            }
            Err(_) => {
                // 端口被占用 → 第二个实例：发送文件路径后退出
                if let Ok(mut stream) = std::net::TcpStream::connect(addr) {
                    use std::io::Write;
                    let path = std::env::args().nth(1).unwrap_or_default();
                    let _ = stream.write_all(path.as_bytes());
                }
                std::process::exit(0);
            }
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

            // 非 macOS 平台：启动 IPC 监听线程，接收第二实例发送的文件路径
            #[cfg(not(target_os = "macos"))]
            {
                if let Some(listener) = IPC_LISTENER.lock().unwrap().take() {
                    let handle = app.handle().clone();
                    std::thread::spawn(move || {
                        for stream in listener.incoming().flatten() {
                            use std::io::Read;
                            let mut buf = Vec::new();
                            if stream.take(65536).read_to_end(&mut buf).is_ok() {
                                let path = String::from_utf8_lossy(&buf).trim().to_string();
                                if !path.is_empty() {
                                    if let Some(state) = handle.try_state::<PendingOpenFiles>() {
                                        let mut guard = state.0.lock().unwrap();
                                        guard.push(path.clone());
                                    }
                                    let _ = handle.emit("open-file-from-os", path);
                                }
                            }
                        }
                    });
                }
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
