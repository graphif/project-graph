use cfg_aliases::cfg_aliases;

fn main() {
    cfg_aliases! {
        android: { target_os = "android" },
        wasm: { target_arch = "wasm32" },
        desktop: { all(not(target_os = "android"), not(target_arch = "wasm32")) },
        linux: { target_os = "linux" },
        windows: { target_os = "windows" },
        macos: { target_os = "macos" },
    }

    println!("cargo::rustc-check-cfg=cfg(android)");
    println!("cargo::rustc-check-cfg=cfg(wasm)");
    println!("cargo::rustc-check-cfg=cfg(desktop)");
    println!("cargo::rustc-check-cfg=cfg(linux)");
    println!("cargo::rustc-check-cfg=cfg(windows)");
    println!("cargo::rustc-check-cfg=cfg(macos)");
}
