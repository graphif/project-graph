#[cfg(desktop)]
fn main() {
    env_logger::init();
    log::info!("Project Graph v{}", env!("CARGO_PKG_VERSION"));

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_decorations(false),
        // multisampling: 0,
        ..Default::default()
    };
    eframe::run_native(
        "project_graph",
        options,
        Box::new(|cc| Ok(Box::new(project_graph::app::MyApp::new(cc)))),
    )
    .expect("Failed to start eframe");
}

#[cfg(wasm)]
fn main() {
    use eframe::wasm_bindgen::JsCast;

    eframe::WebLogger::init(log::LevelFilter::Debug).ok();
    log::info!("Project Graph (wasm) v{}", env!("CARGO_PKG_VERSION"));

    let web_options = eframe::WebOptions::default();

    wasm_bindgen_futures::spawn_local(async {
        // 获取浏览器窗口和文档对象
        let document = web_sys::window()
            .expect("No window")
            .document()
            .expect("No document");

        let loader = document
            .get_element_by_id("loading")
            .expect("Failed to find loading element");
        loader.remove();

        // 找到 Canvas 元素
        let canvas = document
            .get_element_by_id("c")
            .expect("Failed to find canvas")
            .dyn_into::<web_sys::HtmlCanvasElement>()
            .expect("Element is not a Canvas");

        eframe::WebRunner::new()
            .start(
                canvas,
                web_options,
                Box::new(|cc| Ok(Box::new(project_graph::app::MyApp::new(cc)))),
            )
            .await
            .expect("failed to start eframe");
    });
}

#[cfg(android)]
fn main() {}
