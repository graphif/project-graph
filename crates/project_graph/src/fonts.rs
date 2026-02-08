/// 为指定的 egui 上下文配置字体
pub fn setup_custom_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();

    // 在桌面平台上尝试加载系统字体
    #[cfg(desktop)]
    {
        use font_kit::family_name::FamilyName;
        use font_kit::handle::Handle;
        use font_kit::properties::Properties;
        use font_kit::source::SystemSource;

        let source = SystemSource::new();
        if let Ok(handle) = source.select_best_match(
            &[FamilyName::SansSerif, FamilyName::Title("system-ui".into())],
            &Properties::new(),
        ) {
            let font_data = match handle {
                Handle::Path { path, .. } => std::fs::read(path).ok(),
                Handle::Memory { bytes, .. } => Some(bytes.to_vec()),
            };

            if let Some(data) = font_data {
                fonts.font_data.insert(
                    "system_ui".to_owned(),
                    egui::FontData::from_owned(data).into(),
                );
                // 插入到首位：最高优先级
                fonts
                    .families
                    .get_mut(&egui::FontFamily::Proportional)
                    .unwrap()
                    .insert(0, "system_ui".to_owned());
            }
        }
    }
    // 在不支持使用 font-kit 的平台上，使用内置的 MiSans 字体作为替代
    #[cfg(any(wasm, android))]
    {
        // Web 平台使用内置字体
        let mut system_ui_data =
            egui::FontData::from_static(include_bytes!("../assets/fonts/MiSans.ttf"));
        system_ui_data.tweak.y_offset_factor = 0.05;
        fonts
            .font_data
            .insert("system_ui".to_owned(), system_ui_data.into());
        fonts
            .families
            .get_mut(&egui::FontFamily::Proportional)
            .unwrap()
            .insert(0, "system_ui".to_owned());
    }

    // Lucide Icons 字体
    let mut lucide_data = egui::FontData::from_static(lucide_icons::LUCIDE_FONT_BYTES);
    lucide_data.tweak.y_offset_factor = 0.05;
    fonts
        .font_data
        .insert("lucide_icons".to_owned(), lucide_data.into());

    fonts
        .families
        .get_mut(&egui::FontFamily::Proportional)
        .unwrap()
        .push("lucide_icons".to_owned());

    ctx.set_fonts(fonts);
}

/// 获取 Lucide 图标的 Unicode 字符串
///
/// # Examples
///
/// ```
/// # use lucide_icons::Icon;
/// # use project_graph::fonts::ic;
/// let settings_icon = ic(Icon::Settings);
/// assert_eq!(settings_icon, "\u{e154}");
/// ```
pub fn ic(icon: lucide_icons::Icon) -> String {
    char::from(icon).to_string()
}
