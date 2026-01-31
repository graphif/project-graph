mod fonts;
mod smooth_value;
mod stage;
mod themes;
mod utils;

use lucide_icons::Icon;

use crate::{
    fonts::{ic, setup_custom_fonts},
    stage::Stage,
    themes::apply_custom_theme,
};

fn main() {
    env_logger::init();
    log::info!("Project Graph v{}", env!("CARGO_PKG_VERSION"));

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_decorations(false),
        ..Default::default()
    };
    eframe::run_native(
        "My Egui App",
        options,
        Box::new(|ctx| Ok(Box::new(MyApp::new(ctx)))),
    )
    .expect("Failed to start eframe");
}

struct MyApp {
    stage: Stage,
    show_settings: bool,
    show_about: bool,
}

impl MyApp {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        apply_custom_theme(&cc.egui_ctx);
        setup_custom_fonts(&cc.egui_ctx);
        egui_extras::install_image_loaders(&cc.egui_ctx);
        Self {
            stage: Stage::new(),
            show_settings: false,
            show_about: false,
        }
    }
}

impl eframe::App for MyApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        ctx.request_repaint();

        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            let panel_height = 32.0;
            let (rect, response) = ui.allocate_exact_size(
                egui::vec2(ui.available_width(), panel_height),
                egui::Sense::click_and_drag(), // 允许此区域捕获拖动
            );

            // 1. 处理窗口拖动逻辑
            // 如果用户点击并拖拽了标题栏背景（且不是在点按钮），则移动窗口
            if response.drag_started_by(egui::PointerButton::Primary) {
                ui.ctx().send_viewport_cmd(egui::ViewportCommand::StartDrag);
            }

            // 2. 在该矩形区域内绘制 UI 组件
            ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
                ui.horizontal_centered(|ui| {
                    ui.add_space(8.0);
                    ui.label("icon");

                    // 菜单栏
                    egui::MenuBar::new().ui(ui, |ui| {
                        ui.menu_button(format!("{} 文件", ic(Icon::File)), |ui| {
                            ui.button(format!("{} 新建", ic(Icon::FilePlus)));
                            ui.button(format!("{} 打开", ic(Icon::FolderOpen)));
                            ui.button(format!("{} 保存", ic(Icon::Save)));
                            ui.separator();
                            if ui.button(format!("{} 退出", ic(Icon::LogOut))).clicked() {
                                ui.ctx().send_viewport_cmd(egui::ViewportCommand::Close);
                            }
                        });
                        ui.menu_button(format!("{} 设置", ic(Icon::Settings)), |ui| {
                            if ui.button(format!("{} 设置", ic(Icon::Settings))).clicked() {
                                self.show_settings = true;
                            }
                            ui.separator();
                            if ui.button(format!("{} 关于", ic(Icon::Info))).clicked() {
                                self.show_about = true;
                            }
                        })
                    });

                    // 右侧控制按钮
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.add_space(8.0);

                        let close_res = ui.button("❌");
                        if close_res.clicked() {
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

        egui::SidePanel::left("left_panel")
            .resizable(true) // 允许拖动改变宽度
            .default_width(200.0)
            .width_range(100.0..=400.0) // 限制宽度范围
            .show(ctx, |ui| {
                ui.heading("侧边栏");
                ui.separator();
            });

        egui::CentralPanel::default().show(ctx, |ui| {
            self.stage.ui(ui);
        });

        egui::Window::new("设置")
            .open(&mut self.show_settings)
            .show(ctx, |ui| {
                ui.label("hello world");
            });

        egui::Window::new("关于")
            .open(&mut self.show_about)
            .show(ctx, |ui| {
                ui.columns(2, |columns| {
                    columns[0].add(egui::Image::new(egui::include_image!(
                        "../../../assets/icon.png"
                    )));
                    // columns[1].add_space(12.0);
                    // columns[1].heading("Project Graph");
                    // columns[1].label(format!("版本 {}", env!("CARGO_PKG_VERSION")));
                    // columns[1].label("图形化思维桌面工具和知识管理系统，支持节点连接、图形渲染和自动布局等功能，基于 Rust 构建。它旨在提供一个高效、直观的方式来组织和管理个人知识。");
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
                        });
                });
            });
    }
}
