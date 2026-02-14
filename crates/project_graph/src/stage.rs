mod camera;
mod context;
mod render_context;
mod structs;

use camera::Camera;
use context::StageContext;
use eframe::egui::{self};
use structs::EntityTrait;

use crate::stage::render_context::RenderContext;

/// egui 和画布之间的桥梁
/// 负责坐标系转换、事件处理等
pub struct Stage {
    camera: Camera,
    context: StageContext,
}

impl Stage {
    pub fn new() -> Self {
        Stage {
            camera: Camera::new(),
            context: StageContext::random(),
        }
    }

    pub fn ui(&mut self, ui: &mut egui::Ui) {
        let dt = ui.input(|i| i.stable_dt);

        let available_size = ui.available_size();
        let (rect, response) = ui.allocate_exact_size(
            egui::vec2(available_size.x, available_size.y),
            egui::Sense::all(),
        );

        ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
            let painter = ui.painter().clone();
            let screen_center = rect.center();
            let mut visible_count = 0;

            for entity in self.context.entities().values() {
                visible_count += 1;
                let screen_pos = self
                    .camera
                    .world_to_screen(entity.position(), screen_center);

                entity.render(&mut RenderContext {
                    painter: painter.clone(),
                    position: screen_pos,
                    scale: self.camera.zoom(),
                });
            }

            painter.text(
                rect.left_top() + egui::vec2(10.0, 10.0),
                egui::Align2::LEFT_TOP,
                format!("Visible Items: {}", visible_count),
                egui::FontId::proportional(20.0),
                egui::Color32::WHITE,
            );
        });

        let scroll_delta = ui.input(|i| i.smooth_scroll_delta);
        if scroll_delta.y != 0.0 {
            if let Some(mouse_pos) = ui.input(|i| i.pointer.hover_pos()) {
                let zoom_factor = (1.0 + scroll_delta.y * 0.01).clamp(0.9, 1.1);
                let old_zoom = self.camera.zoom();
                self.camera.zoom_by(zoom_factor);

                let offset = mouse_pos - rect.center();
                let delta = offset * (self.camera.zoom() / old_zoom - 1.0);
                self.camera.pan_by(delta);
            }
        }

        // 中键拖拽平移
        if response.dragged_by(egui::PointerButton::Middle) {
            let drag_delta = ui.input(|i| i.pointer.delta());
            self.camera.pan_by(-drag_delta);
        }
    }
}
