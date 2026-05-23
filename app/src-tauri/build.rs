fn main() {
    tauri_build::build();

    #[cfg(target_os = "linux")]
    {
        cxx_qt_build::CxxQtBuilder::new()
            .file("src/ipc_bridge.rs")
            .qt_module("Core")
            .qt_module("Widgets")
            .qt_module("WebEngineCore")
            .qt_module("WebEngineWidgets")
            .qt_module("WebChannel")
            .cc_builder(|builder| {
                builder.file("src/qt_app.cpp");
                builder.include("src");
            })
            .build();

        println!("cargo:rerun-if-changed=src/qt_app.cpp");
        println!("cargo:rerun-if-changed=src/qt_app.h");
        println!("cargo:rerun-if-changed=src/ipc_bridge.rs");
    }
}
