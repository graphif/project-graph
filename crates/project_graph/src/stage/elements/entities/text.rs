use egui::Pos2;
use nanoid::nanoid;

use crate::{
    stage::{
        elements::{ElementTrait, entities::EntityTrait},
        render_context::RenderContext,
    },
    utils::kdl::KdlPos2,
};

#[derive(knus::Decode, Debug, Clone)]
pub struct Text {
    #[knus(argument, default = nanoid!())]
    id: String,
    #[knus(child, default = KdlPos2 { x: 0.0, y: 0.0 })]
    pos: KdlPos2,
    #[knus(child, unwrap(argument), default = String::new())]
    val: String,
}
impl Text {
    pub fn new(id: String, pos: Pos2, val: String) -> Self {
        Text {
            id,
            pos: pos.into(),
            val,
        }
    }
}
impl ElementTrait for Text {
    fn id(&self) -> &str {
        &self.id
    }
    fn ui(&self, ui: &mut egui::Ui, rc: &mut RenderContext) {
        // 预计算，避免在 egui 生命周期内做重算
        let zoom = rc.zoom;
        let font_id = egui::FontId::proportional(16.0 * zoom);

        // 使用更加紧凑的布局方式
        let frame = egui::Frame::new()
            .fill(if rc.selected {
                egui::Color32::from_rgba_unmultiplied(150, 150, 255, 75)
            } else {
                egui::Color32::from_rgba_unmultiplied(255, 255, 255, 25)
            })
            .corner_radius(16.0 * zoom)
            .inner_margin(egui::Margin::symmetric(12, 10) * zoom)
            .stroke(if rc.selected {
                egui::Stroke::new(2.0 * zoom, egui::Color32::LIGHT_BLUE)
            } else {
                egui::Stroke::NONE
            });

        let response = frame
            .show(ui, |ui| {
                // 极简渲染，避免 Label 的复杂逻辑
                ui.add(
                    egui::Label::new(egui::RichText::new(&self.val).font(font_id))
                        .wrap_mode(egui::TextWrapMode::Extend),
                );
            })
            .response;

        if response.interact(egui::Sense::click()).clicked() {
            rc.clicked = true;
        }
    }

    fn world_rect(&self) -> egui::Rect {
        // 假设基础大小为 80x40
        egui::Rect::from_center_size(self.position(), egui::vec2(80.0, 40.0))
    }
}
impl EntityTrait for Text {
    fn position(&self) -> Pos2 {
        self.pos.into()
    }
}
