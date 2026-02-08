//! # Project Graph
//!
//! 无限画布上的思维操作系统。融合笔记、思维导图与系统分析，用图论拓扑重构你的知识网络。

pub mod app;
pub mod fonts;
pub mod native;
pub mod settings;
pub mod settings_window;
pub mod smooth_value;
pub mod stage;
pub mod structs;
pub mod themes;

/// Android 平台入口点
/// 将会编译为 libproject_graph.so，作为一个 Native Activity
#[cfg(android)]
#[unsafe(no_mangle)]
fn android_main(app: android_activity::AndroidApp) {
    use eframe::NativeOptions;

    android_logger::init_once(
        android_logger::Config::default()
            .with_max_level(log::LevelFilter::Debug)
            .with_tag("project_graph"),
    );
    log::info!("Project Graph (android) v{}", env!("CARGO_PKG_VERSION"));

    let options = NativeOptions {
        android_app: Some(app),
        ..Default::default()
    };

    eframe::run_native(
        "project_graph",
        options,
        Box::new(|cc| Ok(Box::new(app::MyApp::new(cc)))),
    )
    .unwrap();
}
