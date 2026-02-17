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
    fn ui(&self, ui: &mut egui::Ui, rc: &RenderContext) {
        let response = egui::Frame::new()
            .fill(egui::Color32::from_rgba_unmultiplied(255, 255, 255, 25))
            .corner_radius(16.0 * rc.zoom)
            .inner_margin(egui::Margin::symmetric(12, 10) * rc.zoom)
            .show(ui, |ui| {
                ui.add(
                    egui::Label::new(egui::RichText::new(&self.val).size(16.0 * rc.zoom))
                        .wrap_mode(egui::TextWrapMode::Extend),
                );
            })
            .response;
    }
}
impl EntityTrait for Text {
    fn position(&self) -> Pos2 {
        self.pos.into()
    }
}
