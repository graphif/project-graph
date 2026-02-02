use lucide_icons::Icon;

use crate::{fonts::ic, settings::Settings};

pub struct SettingsWindow {
    selected_minor: &'static str,
}

impl SettingsWindow {
    pub fn new() -> Self {
        Self {
            selected_minor: "account",
        }
    }

    pub fn ui(&mut self, ctx: &egui::Context, open: &mut bool) {
        egui::Window::new(format!("{} 设置", ic(Icon::Settings)))
            .open(open)
            .default_size(egui::Vec2::new(700.0, 500.0))
            .show(ctx, |ui| {
                let mut settings = Settings::get();
                let mut changed = false;

                let major_categories = Settings::major_categories();
                let minor_categories = Settings::minor_categories();
                let metadata = Settings::field_metadata();

                let available_height = ui.available_height();

                ui.horizontal(|ui| {
                    // 左侧导航栏 (树状结构)
                    ui.vertical(|ui| {
                        ui.set_width(200.0);
                        ui.set_min_height(available_height);
                        ui.add_space(8.0);

                        let width = ui.available_width();

                        egui::ScrollArea::vertical()
                            .id_salt("settings_nav_scroll")
                            .show(ui, |ui| {
                                for major in &major_categories {
                                    let major_id = ui.make_persistent_id(major.key);
                                    egui::collapsing_header::CollapsingState::load_with_default_open(
                                        ui.ctx(),
                                        major_id,
                                        true,
                                    )
                                    .show_header(ui, |ui| {
                                        ui.label(format!(
                                            "{} {}",
                                            ic(major.icon),
                                            major.label
                                        ));
                                    })
                                    .body(|ui| {
                                        ui.set_width(width);

                                        for minor in minor_categories
                                            .iter()
                                            .filter(|m| m.major_key == major.key)
                                        {
                                            let is_selected = self.selected_minor == minor.key;
                                            let text =
                                                format!("{} {}", ic(minor.icon), minor.label);

                                            if ui
                                                .selectable_label(is_selected, text)
                                                .clicked()
                                            {
                                                self.selected_minor = minor.key;
                                            }
                                        }
                                    });
                                }
                            });
                    });

                    ui.separator();

                    // 右侧内容区
                    ui.vertical(|ui| {
                        ui.set_min_height(available_height);
                        egui::ScrollArea::vertical()
                            .auto_shrink([false, false])
                            .id_salt("settings_content_scroll")
                            .show(ui, |ui| {
                                ui.add_space(8.0);

                                if let Some(minor) = minor_categories
                                    .iter()
                                    .find(|m| m.key == self.selected_minor)
                                {
                                    let fields = metadata
                                        .iter()
                                        .filter(|f| f.minor_key == minor.key);

                                    for item in fields {
                                        render_setting_item(
                                            ui,
                                            item.icon,
                                            item.label,
                                            item.description.unwrap_or(""),
                                            |ui| {
                                                if settings.render_control(item.key, ui) {
                                                    changed = true;
                                                }
                                            },
                                        );
                                    }
                                }
                                ui.add_space(16.0);
                            });
                    });
                });

                if changed {
                    Settings::modify(|s| *s = settings);
                }
            });
    }
}

/// 渲染统一样式的设置行
fn render_setting_item(
    ui: &mut egui::Ui,
    icon: Icon,
    name: &str,
    desc: &str,
    add_controls: impl FnOnce(&mut egui::Ui),
) {
    egui::Frame::new().inner_margin(8.0).show(ui, |ui| {
        ui.horizontal(|ui| {
            // 1. 图标
            ui.add_space(4.0);
            ui.label(egui::RichText::new(ic(icon)).size(24.0));
            ui.add_space(2.0);

            // 2. 名称和描述
            ui.vertical(|ui| {
                ui.label(egui::RichText::new(name).strong());
                ui.label(egui::RichText::new(desc).small().weak());
            });

            // 3. 右对齐的操作控件
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                ui.add_space(4.0);
                add_controls(ui);
            });
        });
    });
    ui.separator();
}
