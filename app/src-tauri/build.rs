fn main() {
    tauri_build::build();

    #[cfg(target_os = "linux")]
    {
        println!("cargo:rustc-link-arg-bin=project-graph=-Wl,-rpath,$ORIGIN/../lib/project-graph");
    }
}
