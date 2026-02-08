use cfg_aliases::cfg_aliases;

fn main() {
    cfg_aliases! {
        android: { target_os = "android" },
        wasm: { target_arch = "wasm32" },
        pc: { all(not(target_os = "android"), not(target_arch = "wasm32")) },
    }

    println!("cargo::rustc-check-cfg=cfg(android)");
    println!("cargo::rustc-check-cfg=cfg(wasm)");
    println!("cargo::rustc-check-cfg=cfg(pc)");
}
