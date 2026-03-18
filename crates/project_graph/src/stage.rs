pub mod camera;
pub mod context;
pub mod elements;
pub mod render_context;

use crate::stage::{elements::ElementTrait, render_context::RenderContext};
use camera::Camera;
use context::StageContext;

/// egui 和画布之间的桥梁
/// 负责坐标系转换、事件处理等
pub struct Stage {
    pub camera: Camera,
    pub context: StageContext,
    pub selection: std::collections::HashSet<String>,
}

impl Stage {
    pub fn new() -> Self {
        Stage {
            camera: Camera::new(),
            context: StageContext::random(),
            selection: std::collections::HashSet::new(),
        }
    }

    pub fn ui(&mut self, ui: &mut egui::Ui) {
        let available_size = ui.available_size();
        let (rect, response) = ui.allocate_exact_size(available_size, egui::Sense::all());

        ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
            let painter = ui.painter().clone();
            let screen_center = rect.center();
            let mut visible_count = 0;

            // 获取视野范围（世界坐标）
            let world_min = self.camera.screen_to_world(rect.min, screen_center);
            let world_max = self.camera.screen_to_world(rect.max, screen_center);
            let world_viewport = egui::Rect::from_two_pos(world_min, world_max);

            for element in self.context.elements().values() {
                // 剔除：检查元素的包围盒是否与视野范围相交
                if !world_viewport.intersects(element.world_rect().expand(20.0)) {
                    continue;
                }

                visible_count += 1;

                let selected = self.selection.contains(element.id());
                let screen_pos = self
                    .camera
                    .world_to_screen(element.world_rect().center(), screen_center);

                // 在屏幕坐标系下进行局部渲染，不再使用 egui::Area
                let mut rc = RenderContext {
                    zoom: self.camera.zoom(),
                    selected,
                    clicked: false,
                    painter: painter.clone(),
                    screen_center,
                };

                let element_size = element.world_rect().size() * self.camera.zoom();
                let element_rect = egui::Rect::from_center_size(screen_pos, element_size);

                // 显式限制裁剪区域，避免过度渲染
                ui.scope_builder(egui::UiBuilder::new().max_rect(element_rect), |ui| {
                    element.ui(ui, &mut rc);
                });

                if rc.clicked {
                    log::info!("Entity {} clicked", element.id());
                    if !ui.input(|i| i.modifiers.shift) {
                        self.selection.clear();
                    }
                    self.selection.insert(element.id().to_string());
                }
            }

            painter.text(
                rect.left_top() + egui::vec2(10.0, 10.0),
                egui::Align2::LEFT_TOP,
                format!("Visible Items: {}", visible_count),
                egui::FontId::proportional(20.0),
                egui::Color32::WHITE,
            );
        });

        // 处理手势和滚动
        let zoom_delta = ui.input(|i| i.zoom_delta());
        if zoom_delta != 1.0 {
            if let Some(mouse_pos) = ui.input(|i| i.pointer.hover_pos()) {
                let old_zoom = self.camera.zoom();
                self.camera.zoom_by(zoom_delta);

                let offset = mouse_pos - rect.center();
                let delta = offset * (self.camera.zoom() / old_zoom - 1.0);
                self.camera.pan_by(delta);
            }
        }

        let scroll_delta = ui.input(|i| i.smooth_scroll_delta);
        if scroll_delta != egui::Vec2::ZERO {
            if ui.input(|i| i.modifiers.command || i.modifiers.ctrl) {
                // Ctrl + 滚动 = 缩放
                if let Some(mouse_pos) = ui.input(|i| i.pointer.hover_pos()) {
                    let zoom_factor = (1.0 + scroll_delta.y * 0.01).clamp(0.9, 1.1);
                    let old_zoom = self.camera.zoom();
                    self.camera.zoom_by(zoom_factor);

                    let offset = mouse_pos - rect.center();
                    let delta = offset * (self.camera.zoom() / old_zoom - 1.0);
                    self.camera.pan_by(delta);
                }
            } else {
                // 普通滚动 = 平移
                self.camera.pan_by(-scroll_delta);
            }
        }

        // 中键拖拽平移
        if response.dragged_by(egui::PointerButton::Middle) {
            let drag_delta = ui.input(|i| i.pointer.delta());
            self.camera.pan_by(-drag_delta);
        }
    }
}
