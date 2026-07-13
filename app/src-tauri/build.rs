fn main() {
    tauri_build::build();

    // 只在目标平台为 Linux 时编译 C++/Qt 部分，而不是检查宿主机
    // build.rs 中的 #[cfg] 检查的是宿主机，交叉编译时会有误
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    if target_os == "linux" {
        cxx_qt_build::CxxQtBuilder::new()
            .file("src/ipc_bridge.rs")
            .qt_module("Core")
            .qt_module("Widgets")
            .qt_module("WebEngineCore")
            .qt_module("WebEngineWidgets")
            .qt_module("WebChannel")
            .cc_builder(|builder| {
                #[cfg(not(debug_assertions))]
                builder.define("NDEBUG", None);
                builder.file("src/qt_app.cpp");
                builder.include("src");
            })
            .build();

        println!("cargo:rerun-if-changed=src/qt_app.cpp");
        println!("cargo:rerun-if-changed=src/qt_app.h");
        println!("cargo:rerun-if-changed=src/ipc_bridge.rs");
    }
}
