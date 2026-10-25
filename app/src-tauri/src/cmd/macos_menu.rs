use objc2::MainThreadMarker;
use objc2_app_kit::NSApplication;
use objc2_foundation::NSSize;

#[derive(serde::Deserialize)]
pub struct MenuIconStyle {
    title: String,
    width: f64,
}

#[tauri::command]
pub async fn style_macos_menu_icons(
    app: tauri::AppHandle,
    icons: Vec<MenuIconStyle>,
) -> Result<(), String> {
    if icons
        .iter()
        .any(|icon| !icon.width.is_finite() || icon.width <= 0.0)
    {
        return Err("Invalid menu icon size".to_owned());
    }
    let (sender, receiver) = tokio::sync::oneshot::channel();
    app.run_on_main_thread(move || {
        let result = (|| {
            let mtm = MainThreadMarker::new().ok_or("Not on the main thread")?;
            let menu = NSApplication::sharedApplication(mtm)
                .mainMenu()
                .ok_or("Application menu is unavailable")?;
            for index in 0..menu.numberOfItems() {
                let Some(item) = menu.itemAtIndex(index) else {
                    continue;
                };
                let Some(style) = icons
                    .iter()
                    .find(|icon| icon.title == item.title().to_string())
                else {
                    continue;
                };
                let image = item.image().ok_or("Menu image is unavailable")?;
                image.setSize(NSSize::new(style.width, 18.0));
                image.setTemplate(false);
            }
            Ok::<(), &str>(())
        })();
        let _ = sender.send(result.map_err(str::to_owned));
    })
    .map_err(|error| error.to_string())?;
    receiver.await.map_err(|error| error.to_string())?
}
