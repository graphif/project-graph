//! egui 应用主入口

use lucide_icons::Icon;

use crate::{
    fonts::{ic, setup_custom_fonts},
    settings::Settings,
    settings_window::SettingsWindow,
    stage::Stage,
    terminal::Terminal,
    themes::apply_custom_theme,
};

pub struct MyApp {
    stage: Stage,
    show_settings: bool,
    show_about: bool,
    settings_window: SettingsWindow,
    terminal: Terminal,

    #[cfg(android)]
    last_ime_active: bool,
}

impl MyApp {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        Settings::load(cc.storage);
        apply_custom_theme(&cc.egui_ctx);
        setup_custom_fonts(&cc.egui_ctx);
        egui_extras::install_image_loaders(&cc.egui_ctx);

        #[cfg(android)]
        cc.egui_ctx.set_pixels_per_point(1.5);

        Self {
            stage: Stage::new(),
            show_settings: false,
            show_about: true,
            settings_window: SettingsWindow::new(),
            terminal: Terminal::new(),

            #[cfg(android)]
            last_ime_active: false,
        }
    }
}

impl eframe::App for MyApp {
    fn save(&mut self, storage: &mut dyn eframe::Storage) {
        Settings::save(storage);
    }

    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        // 因为是手动处理绘图逻辑的，所以需要持续请求重绘
        ui.ctx().request_repaint();

        egui::Panel::top("top_panel").show_inside(ui, |ui| {
            let panel_height = 32.0;
            let (rect, response) = ui.allocate_exact_size(
                egui::vec2(ui.available_width(), panel_height),
                egui::Sense::click_and_drag(),
            );

            if response.drag_started_by(egui::PointerButton::Primary) {
                ui.ctx().send_viewport_cmd(egui::ViewportCommand::StartDrag);
            }

            ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
                ui.horizontal_centered(|ui| {
                    ui.add_space(8.0);
                    ui.label(ic(Icon::Box));

                    egui::MenuBar::new().ui(ui, |ui| {
                        ui.menu_button(format!("{} 文件", ic(Icon::File)), |ui| {
                            let _ = ui.button(format!("{} 新建", ic(Icon::FilePlus)));
                            let _ = ui.button(format!("{} 打开", ic(Icon::FolderOpen)));
                            let _ = ui.button(format!("{} 保存", ic(Icon::Save)));
                        });
                        ui.menu_button(format!("{} 设置", ic(Icon::Settings)), |ui| {
                            if ui.button(format!("{} 设置", ic(Icon::Settings))).clicked() {
                                self.show_settings = true;
                                ui.close();
                            }
                            ui.separator();
                            if ui.button(format!("{} 关于", ic(Icon::Info))).clicked() {
                                self.show_about = true;
                                ui.close();
                            }
                        })
                    });

                    #[cfg(desktop)]
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.add_space(8.0);
                        if ui.button("❌").clicked() {
                            ui.ctx().send_viewport_cmd(egui::ViewportCommand::Close);
                        }
                        if ui.button("🔳").clicked() {
                            let is_max = ui.input(|i| i.viewport().maximized.unwrap_or(false));
                            ui.ctx()
                                .send_viewport_cmd(egui::ViewportCommand::Maximized(!is_max));
                        }
                        if ui.button("➖").clicked() {
                            ui.ctx()
                                .send_viewport_cmd(egui::ViewportCommand::Minimized(true));
                        }
                    });
                });
            });
        });

        egui::Panel::left("left_panel")
            .resizable(true)
            .default_size(200.0)
            .size_range(100.0..=400.0)
            .show_inside(ui, |ui| {
                ui.heading("侧边栏");
                ui.separator();
            });

        egui::Panel::bottom("bottom_panel")
            .resizable(true)
            .default_size(200.0)
            .size_range(150.0..=500.0)
            .show_inside(ui, |ui| {
                self.terminal.ui(ui, &mut self.stage);
            });

        egui::CentralPanel::default().show_inside(ui, |ui| {
            self.stage.ui(ui);
        });

        // --- 设置窗口 ---
        self.settings_window.ui(ui.ctx(), &mut self.show_settings);

        egui::Window::new("关于")
            .open(&mut self.show_about)
            .show(ui.ctx(), |ui| {
                ui.label("这是 Project Graph 3.0 的雏形，基于 Rust 和 egui 构建，性能和内存占用将会得到显著提升");
                ui.label("目前处于早期开发阶段，功能还非常基础，但未来会逐步完善");
                ui.separator();
                ui.columns(2, |columns| {
                    columns[0].add(egui::Image::new(egui::include_image!(
                        "../assets/icon.png"
                    )));
                    egui::Frame::new()
                        .inner_margin(egui::Margin {
                            top: 12,
                            right: 12,
                            bottom: 12,
                            left: 0,
                        })
                        .show(&mut columns[1], |ui| {
                            ui.heading("Project Graph");
                            ui.label(format!("v{}", env!("CARGO_PKG_VERSION")));
                            ui.separator();
                            ui.label("图形化思维桌面工具和知识管理系统，支持节点连接、图形渲染和自动布局等功能，基于Rust构建。它旨在提供一个高效、直观的方式来组织和管理个人知识。");
                            ui.separator();
                            #[cfg(not(linux))]
                            ui.weak("本软件采用 MiSans 字体渲染");
                        });
                });
            });

        egui::Window::new("debug").show(ui.ctx(), |ui_| {
            ui.ctx().settings_ui(ui_);
        });

        #[cfg(android)]
        {
            let current_ime_active = ctx.output(|o| o.ime.is_some());
            if current_ime_active != self.last_ime_active {
                crate::utils::jni::set_soft_input_visible(current_ime_active);
                self.last_ime_active = current_ime_active;
            }
        }
    }
}
