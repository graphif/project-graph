pub mod app;
pub mod fonts;
pub mod settings;
pub mod settings_window;
pub mod smooth_value;
pub mod stage;
pub mod structs;
pub mod themes;

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
