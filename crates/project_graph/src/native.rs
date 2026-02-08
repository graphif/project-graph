/// 通过 JNI 设置 Android 软键盘的显示状态
#[cfg(android)]
pub fn set_soft_input_visible(visible: bool) {
    use jni::JavaVM;
    use jni::objects::JObject;

    let ctx = ndk_context::android_context();
    let vm = match unsafe { JavaVM::from_raw(ctx.vm().cast()) } {
        Ok(vm) => vm,
        Err(err) => {
            eprintln!("Failed to get JavaVM: {err}");
            return;
        }
    };
    let mut env = match vm.attach_current_thread() {
        Ok(env) => env,
        Err(err) => {
            eprintln!("Failed to attach thread: {err}");
            return;
        }
    };
    let activity = unsafe { JObject::from_raw(ctx.context().cast()) };

    // InputMethodManager
    let imm_service_name = match env.new_string("input_method") {
        Ok(value) => value,
        Err(err) => {
            eprintln!("Failed to create IMM service name: {err}");
            return;
        }
    };
    let imm = match env.call_method(
        &activity,
        "getSystemService",
        "(Ljava/lang/String;)Ljava/lang/Object;",
        &[(&imm_service_name).into()],
    ) {
        Ok(value) => match value.l() {
            Ok(obj) => obj,
            Err(err) => {
                eprintln!("IMM is not an object: {err}");
                return;
            }
        },
        Err(err) => {
            eprintln!("Failed to get IMM: {err}");
            return;
        }
    };

    // DecorView
    let window = match env.call_method(&activity, "getWindow", "()Landroid/view/Window;", &[]) {
        Ok(value) => match value.l() {
            Ok(obj) => obj,
            Err(err) => {
                eprintln!("Window is not an object: {err}");
                return;
            }
        },
        Err(err) => {
            eprintln!("Failed to get Window: {err}");
            return;
        }
    };
    let view = match env.call_method(&window, "getDecorView", "()Landroid/view/View;", &[]) {
        Ok(value) => match value.l() {
            Ok(obj) => obj,
            Err(err) => {
                eprintln!("DecorView is not an object: {err}");
                return;
            }
        },
        Err(err) => {
            eprintln!("Failed to get DecorView: {err}");
            return;
        }
    };

    if visible {
        // 0 代表隐式请求
        if let Err(err) = env.call_method(
            &imm,
            "showSoftInput",
            "(Landroid/view/View;I)Z",
            &[(&view).into(), 0.into()],
        ) {
            eprintln!("Failed to show input: {err}");
        }
    } else {
        let window_token =
            match env.call_method(&view, "getWindowToken", "()Landroid/os/IBinder;", &[]) {
                Ok(value) => match value.l() {
                    Ok(obj) => obj,
                    Err(err) => {
                        eprintln!("Window token is not an object: {err}");
                        return;
                    }
                },
                Err(err) => {
                    eprintln!("Failed to get window token: {err}");
                    return;
                }
            };
        if let Err(err) = env.call_method(
            &imm,
            "hideSoftInputFromWindow",
            "(Landroid/os/IBinder;I)Z",
            &[(&window_token).into(), 0.into()],
        ) {
            eprintln!("Failed to hide input: {err}");
        }
    }
}
