mod fonts;
mod smooth_value;
mod stage;
mod themes;
mod utils;

use lucide_icons::Icon;

use crate::{
    fonts::{ic, setup_custom_fonts},
    stage::Stage,
    themes::visuals_dark,
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
}

impl MyApp {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        cc.egui_ctx.set_visuals(visuals_dark());
        setup_custom_fonts(&cc.egui_ctx);
        Self {
            stage: Stage::new(),
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
                    ui.label("🦀");

                    // 菜单栏
                    egui::MenuBar::new().ui(ui, |ui| {
                        ui.menu_button("文件", |ui| {
                            if ui.button("退出").clicked() {
                                ui.ctx().send_viewport_cmd(egui::ViewportCommand::Close);
                            }
                        });
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
    }
}
