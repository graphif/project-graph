#[cfg(feature = "cpp")]
fn configure_static_crt(builder: &mut cc::Build) {
    if std::env::var("CARGO_CFG_TARGET_FEATURE")
        .unwrap_or_default()
        .contains("crt-static")
    {
        builder.static_crt(true);
    } else {
        builder.static_crt(false);
    }
}

#[cfg(feature = "cpp")]
#[cfg(not(target_os = "macos"))]
fn main() {
    let mut builder = cc::Build::new();
    builder.cpp(true).flag("-std=c++11");
    configure_static_crt(&mut builder);
    builder.file("src/esaxx.cpp").include("src").compile("esaxx");
}

#[cfg(feature = "cpp")]
#[cfg(target_os = "macos")]
fn main() {
    let mut builder = cc::Build::new();
    builder.cpp(true).flag("-std=c++11").flag("-stdlib=libc++");
    configure_static_crt(&mut builder);
    builder.file("src/esaxx.cpp").include("src").compile("esaxx");
}

#[cfg(not(feature = "cpp"))]
fn main() {}
