pub mod camera;
pub mod context;
pub mod elements;
pub mod render_context;

use camera::Camera;
use context::StageContext;
use egui::{Vec2, vec2};

use crate::stage::{
    elements::{Element, ElementTrait, entities::EntityTrait},
    render_context::RenderContext,
};

/// egui 和画布之间的桥梁
/// 负责坐标系转换、事件处理等
pub struct Stage {
    pub camera: Camera,
    pub context: StageContext,
    pub selection: Vec<String>,
}

impl Stage {
    pub fn new() -> Self {
        Stage {
            camera: Camera::new(),
            context: StageContext::random(),
            selection: Vec::new(),
        }
    }

    pub fn ui(&mut self, ui: &mut egui::Ui) {
        let available_size = ui.available_size();
        let (rect, response) = ui.allocate_exact_size(available_size, egui::Sense::all());

        ui.scope_builder(egui::UiBuilder::new().max_rect(rect), |ui| {
            let painter = ui.painter().clone();
            let screen_center = rect.center();
            let mut visible_count = 0;

            for element in self.context.elements().values() {
                let entity = match element {
                    Element::Entity(e) => e,
                };
                // 剔除
                if !rect.contains(entity.position()) {
                    continue;
                }

                visible_count += 1;

                let selected = self.selection.contains(&entity.id().to_string());

                let screen_pos = self
                    .camera
                    .world_to_screen(entity.position(), screen_center)
                    - if selected {
                        vec2(4.0, 4.0) * self.camera.zoom()
                    } else {
                        Vec2::ZERO
                    };

                egui::Area::new(ui.make_persistent_id(entity.id()))
                    .order(egui::Order::Background)
                    .fixed_pos(screen_pos)
                    .show(ui.ctx(), |ui| {
                        let response = egui::Frame::new()
                            .inner_margin(4.0 * self.camera.zoom())
                            .corner_radius(24.0 * self.camera.zoom())
                            .stroke(if selected {
                                egui::Stroke::new(
                                    4.0 * self.camera.zoom(),
                                    egui::Color32::LIGHT_BLUE,
                                )
                            } else {
                                egui::Stroke::NONE
                            })
                            .show(ui, |ui| {
                                entity.ui(
                                    ui,
                                    &mut RenderContext {
                                        zoom: self.camera.zoom(),
                                        selected: selected,
                                    },
                                );
                            })
                            .response
                            .interact(egui::Sense::click());

                        if response.clicked() {
                            log::info!("Entity {} clicked", entity.id());
                            self.selection.clear();
                            self.selection.push(entity.id().to_string());
                        }
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

        ui.input(|i| {
            let zoom = i.zoom_delta();
            if zoom != 1.0 {
                if let Some(mouse_pos) = i.pointer.hover_pos() {
                    let old_zoom = self.camera.zoom();
                    self.camera.zoom_by(zoom);

                    // 修正缩放中心
                    let offset = mouse_pos - rect.center();
                    let delta = offset * (self.camera.zoom() / old_zoom - 1.0);
                    self.camera.pan_by(delta);
                }
            }

            let scroll_delta = -i.smooth_scroll_delta;
            if scroll_delta != egui::Vec2::ZERO && zoom == 1.0 {
                self.camera.pan_by(scroll_delta);
            }
        });

        // 中键拖拽平移
        if response.dragged_by(egui::PointerButton::Middle) {
            let drag_delta = ui.input(|i| i.pointer.delta());
            self.camera.pan_by(-drag_delta);
        }
    }
}
