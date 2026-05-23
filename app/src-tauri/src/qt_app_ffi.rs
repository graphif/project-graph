#[cfg(target_os = "linux")]
#[cxx::bridge]
pub mod ffi {
    unsafe extern "C++" {
        include!("qt_app.h");
        fn run_qt_app() -> i32;
    }
}
