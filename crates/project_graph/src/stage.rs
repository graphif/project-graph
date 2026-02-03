mod camera;

use camera::Camera;
use eframe::egui::{self};

use crate::utils::{egui2glam, glam2egui};

/// egui和画布之间的桥梁
/// 负责坐标系转换、事件处理等
pub struct Stage {
    camera: Camera,
}

impl Stage {
    pub fn new() -> Self {
        Stage {
            camera: Camera::new(),
        }
    }

    pub fn ui(&mut self, ui: &mut egui::Ui) {
        let dt = ui.input(|i| i.stable_dt);
        self.camera.tick(dt);

        let available_size = ui.available_size();
        let (rect, response) = ui.allocate_exact_size(
            egui::vec2(available_size.x, available_size.y),
            egui::Sense::all(),
        );

        ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
            let painter = ui.painter();

            painter.text(
                rect.center() - glam2egui(self.camera.position() * self.camera.zoom()),
                egui::Align2::CENTER_CENTER,
                "Stage Area",
                egui::FontId::proportional(16.0 * self.camera.zoom()), // 缩放核心
                egui::Rgba::WHITE.into(),
            );
        });

        let scroll_delta = ui.input(|i| i.smooth_scroll_delta);
        if scroll_delta.y != 0.0 {
            let zoom_factor = (1.0 + scroll_delta.y * 0.01).clamp(0.9, 1.1);

            if let Some(mouse_pos) = ui.input(|i| i.pointer.hover_pos()) {
                let old_zoom = self.camera.zoom();
                let new_zoom = old_zoom * zoom_factor;
                let offset = egui2glam(mouse_pos - rect.center());
                let delta = offset * (1.0 / old_zoom - 1.0 / new_zoom);
                self.camera.pan_by_immediate(delta);
            }

            self.camera.zoom_by_immediate(zoom_factor);
        }

        // 中键拖拽平移
        if response.dragged_by(egui::PointerButton::Middle) {
            let drag_delta = ui.input(|i| i.pointer.delta()) / self.camera.zoom();
            self.camera.pan_by_immediate(egui2glam(-drag_delta));
        }
    }
}
