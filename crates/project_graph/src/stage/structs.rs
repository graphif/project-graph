use egui::{Color32, Pos2, Rect, pos2};
use enum_dispatch::enum_dispatch;

use crate::{stage::render_context::RenderContext, utils::text::get_text_width};

#[enum_dispatch]
pub trait EntityTrait {
    fn id(&self) -> &str;
    fn position(&self) -> Pos2;
    fn render(&self, rc: &mut RenderContext);
}

pub struct TextNode {
    pub id: String,
    pub position: Pos2,
    pub content: String,
}
impl EntityTrait for TextNode {
    fn id(&self) -> &str {
        &self.id
    }
    fn position(&self) -> Pos2 {
        self.position
    }
    fn render(&self, rc: &mut RenderContext) {
        let padding = 8.0;

        rc.rect(
            Rect {
                min: Pos2::ZERO,
                max: Pos2 {
                    x: get_text_width(&self.content, 14.0, &rc.painter) + padding * 2.0,
                    y: 14.0 + padding * 2.0,
                },
            },
            Color32::WHITE,
        );
        rc.text(pos2(padding, padding), &self.content);
    }
}

#[enum_dispatch(EntityTrait)]
pub enum Entity {
    TextNode(TextNode),
}
