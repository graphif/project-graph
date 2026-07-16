#[cfg(target_os = "macos")]
fn main() {
    use std::{env, fs, path::PathBuf, process::Command};

    let cef_dir = PathBuf::from(
        env::var_os("DEP_CEF_DLL_WRAPPER_CEF_DIR")
            .expect("cef-dll-sys did not provide the CEF runtime directory"),
    );
    let framework = cef_dir.join("Chromium Embedded Framework.framework");
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("missing OUT_DIR"));
    let target_dir = out_dir
        .ancestors()
        .nth(4)
        .expect("unexpected Cargo target directory layout");
    let destination = target_dir
        .join("Frameworks")
        .join("Chromium Embedded Framework.framework");

    println!("cargo::rerun-if-changed={}", framework.display());
    if destination.exists() {
        fs::remove_dir_all(&destination).expect("failed to replace the CEF framework");
    }
    fs::create_dir_all(destination.parent().expect("framework destination has no parent"))
        .expect("failed to create the Frameworks directory");
    let status = Command::new("ditto")
        .arg(&framework)
        .arg(&destination)
        .status()
        .expect("failed to run ditto for the CEF framework");
    assert!(status.success(), "failed to copy the CEF framework");
}

#[cfg(not(target_os = "macos"))]
fn main() {}
