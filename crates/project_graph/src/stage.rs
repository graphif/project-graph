mod camera;

use camera::Camera;
use eframe::egui::{self};
use egui::{Pos2, Vec2};
use nanoid::nanoid;
use rand::Rng;

use crate::structs::{StageObject, TextNode};

/// egui和画布之间的桥梁
/// 负责坐标系转换、事件处理等
pub struct Stage {
    camera: Camera,
    items: Vec<Box<dyn StageObject>>,
}

impl Stage {
    pub fn new() -> Self {
        let mut rng = rand::rng();
        let mut items = Vec::<Box<dyn StageObject>>::new();
        for _ in 0..5 {
            let pos = Pos2::new(
                rng.random_range(-500.0..500.0),
                rng.random_range(-500.0..500.0),
            );

            items.push(Box::new(TextNode {
                id: nanoid!(),
                position: pos,
                content: "Hello, World!".to_string(),
            }))
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
            let painter = ui.painter().clone();
            let screen_center = rect.center();
            let mut visible_count = 0;

            for item in &self.items {
                let screen_pos = self.camera.world_to_screen(
                    item.as_any().downcast_ref::<TextNode>().unwrap().position,
                    screen_center,
                );

                // 简单的视锥剔除 (Frustum Culling)
                // 扩大一点范围以免边缘物体突然消失
                // if !ui.clip_rect().expand(100.0).contains(screen_pos_egui) {
                //     continue;
                // }

                visible_count += 1;

                ui.push_id(item.id(), |ui| {
                    ui.with_visual_transform(
                        egui::emath::TSTransform {
                            translation: screen_pos.to_vec2(),
                            scaling: self.camera.zoom(),
                        },
                        |ui| {
                            item.render(ui);
                        },
                    );
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
            let zoom_factor = (1.0 + scroll_delta.y * 0.01).clamp(0.9, 1.1);

            if let Some(mouse_pos) = ui.input(|i| i.pointer.hover_pos()) {
                let old_zoom = self.camera.zoom();
                let new_zoom = old_zoom * zoom_factor;
                let offset = mouse_pos - rect.center();
                let delta = offset * (1.0 / old_zoom - 1.0 / new_zoom);
                self.camera.pan_by_immediate(delta);
            }

            self.camera.zoom_by_immediate(zoom_factor);
        }

        // 中键拖拽平移
        if response.dragged_by(egui::PointerButton::Middle) {
            let drag_delta = ui.input(|i| i.pointer.delta()) / self.camera.zoom();
            self.camera.pan_by_immediate(-drag_delta);
        }
    }
}
