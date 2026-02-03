mod camera;

use camera::Camera;
use eframe::egui::{self};
use rand::Rng;

use crate::utils::{egui2glam, glam2egui};

enum BenchmarkContent {
    Text(String),
    Circle(f32),
    Rect(glam::Vec2),
}

struct BenchmarkItem {
    pos: glam::Vec2,
    color: egui::Color32,
    content: BenchmarkContent,
}

/// egui和画布之间的桥梁
/// 负责坐标系转换、事件处理等
pub struct Stage {
    camera: Camera,
    items: Vec<BenchmarkItem>,
}

impl Stage {
    pub fn new() -> Self {
        let mut rng = rand::rng();
        let mut items = Vec::with_capacity(5000);
        for _ in 0..5000 {
            let pos = glam::Vec2::new(
                rng.random_range(-5000.0..5000.0),
                rng.random_range(-5000.0..5000.0),
            );

            let color = egui::Color32::from_rgb(rng.random(), rng.random(), rng.random());

            let content = match rng.random_range(0..10) {
                0..=7 => BenchmarkContent::Text(format!("Node {}", rng.random_range(1000..9999))),
                8 => BenchmarkContent::Circle(rng.random_range(10.0..50.0)),
                _ => BenchmarkContent::Rect(glam::Vec2::new(
                    rng.random_range(20.0..100.0),
                    rng.random_range(20.0..100.0),
                )),
            };

            items.push(BenchmarkItem {
                pos,
                color,
                content,
            });
        }

        Stage {
            camera: Camera::new(),
            items,
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
            let screen_center = egui2glam(rect.center().to_vec2());
            let mut visible_count = 0;

            for item in &self.items {
                let screen_pos = self.camera.world_to_screen(item.pos, screen_center);
                let v = glam2egui(screen_pos);
                let screen_pos_egui = egui::pos2(v.x, v.y);

                // 简单的视锥剔除 (Frustum Culling)
                // 扩大一点范围以免边缘物体突然消失
                if !ui.clip_rect().expand(100.0).contains(screen_pos_egui) {
                    continue;
                }

                visible_count += 1;

                match &item.content {
                    BenchmarkContent::Text(text) => {
                        painter.text(
                            screen_pos_egui,
                            egui::Align2::CENTER_CENTER,
                            text,
                            egui::FontId::proportional(14.0 * self.camera.zoom()),
                            item.color,
                        );
                    }
                    BenchmarkContent::Circle(r) => {
                        painter.circle_filled(screen_pos_egui, r * self.camera.zoom(), item.color);
                    }
                    BenchmarkContent::Rect(size) => {
                        let scaled_size = *size * self.camera.zoom();
                        painter.rect_filled(
                            egui::Rect::from_center_size(screen_pos_egui, glam2egui(scaled_size)),
                            2.0,
                            item.color,
                        );
                    }
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
