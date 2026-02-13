#[cfg(android)]
pub fn set_soft_input_visible(visible: bool) {
    if let Err(err) = rust_set_soft_input_visible(visible) {
        log::error!("Failed to set soft input visible ({}): {:?}", visible, err);
    }
}

#[cfg(android)]
fn rust_set_soft_input_visible(visible: bool) -> jni::errors::Result<()> {
    use jni::JavaVM;
    use jni::objects::JObject;

    let ctx = ndk_context::android_context();
    let vm = unsafe { JavaVM::from_raw(ctx.vm().cast()) }?;
    let mut env = vm.attach_current_thread()?;
    let activity = unsafe { JObject::from_raw(ctx.context().cast()) };

    // 获取 InputMethodManager
    let imm_service_name = env.new_string("input_method")?;
    let imm = env
        .call_method(
            &activity,
            "getSystemService",
            "(Ljava/lang/String;)Ljava/lang/Object;",
            &[(&imm_service_name).into()],
        )?
        .l()?;

    // 获取当前 View (DecorView)
    let window = env
        .call_method(&activity, "getWindow", "()Landroid/view/Window;", &[])?
        .l()?;
    let view = env
        .call_method(&window, "getDecorView", "()Landroid/view/View;", &[])?
        .l()?;

    if visible {
        // 请求显示键盘，通常需要 View 已获得焦点
        env.call_method(
            &imm,
            "showSoftInput",
            "(Landroid/view/View;I)Z",
            &[(&view).into(), 0.into()],
        )?;
    } else {
        // 请求隐藏键盘
        let window_token = env
            .call_method(&view, "getWindowToken", "()Landroid/os/IBinder;", &[])?
            .l()?;
        env.call_method(
            &imm,
            "hideSoftInputFromWindow",
            "(Landroid/os/IBinder;I)Z",
            &[(&window_token).into(), 0.into()],
        )?;
    }

    Ok(())
}
