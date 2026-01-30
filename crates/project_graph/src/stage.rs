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

            // 在鼠标位置缩放：保持鼠标下的世界坐标不变
            let pointer_offset = ui
                .input(|i| i.pointer.hover_pos())
                .map(|p| egui2glam(p - rect.center()))
                .unwrap_or_default();

            let old_zoom = self.camera.zoom_target();
            let target_pos = self.camera.position_target()
                + (pointer_offset / old_zoom) * (1.0 - 1.0 / zoom_factor);

            self.camera.zoom_by(zoom_factor);
            self.camera.move_to(target_pos);
        }

        // 中键拖拽平移
        if response.dragged_by(egui::PointerButton::Middle) {
            let drag_delta = ui.input(|i| i.pointer.delta()) / self.camera.zoom();
            self.camera.pan_by(egui2glam(-drag_delta));
        }
    }
}
