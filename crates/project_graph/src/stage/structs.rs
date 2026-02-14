use egui::{Color32, FontId, Pos2, Rect, pos2};
use enum_dispatch::enum_dispatch;
use nanoid::nanoid;

use crate::{stage::render_context::RenderContext, utils::kdl::KdlPos2};

#[enum_dispatch]
pub trait EntityTrait {
    fn id(&self) -> &str;
    fn position(&self) -> Pos2;
    fn render(&self, rc: &mut RenderContext);
}

#[derive(knus::Decode, Debug, Clone)]
pub struct Text {
    #[knus(argument, default = nanoid!())]
    id: String,
    #[knus(child, default = KdlPos2 { x: 0.0, y: 0.0 })]
    pos: KdlPos2,
    #[knus(child, unwrap(argument), default = String::new())]
    val: String,

    text_width: std::sync::OnceLock<f32>,
}
impl Text {
    pub fn new(id: String, pos: Pos2, val: String) -> Self {
        Text {
            id,
            pos: pos.into(),
            val,
            text_width: std::sync::OnceLock::new(),
        }
    }
}
impl EntityTrait for Text {
    fn id(&self) -> &str {
        &self.id
    }
    fn position(&self) -> Pos2 {
        self.pos.into()
    }
    fn render(&self, rc: &mut RenderContext) {
        let padding = 8.0;

        let text_width = *self.text_width.get_or_init(|| {
            // 这里调用你的 get_text_width 或者直接计算
            rc.painter
                .layout_no_wrap(
                    self.val.clone(),
                    FontId::proportional(14.0),
                    Color32::TRANSPARENT,
                )
                .size()
                .x
        });

        rc.rect(
            Rect {
                min: Pos2::ZERO,
                max: Pos2 {
                    x: text_width + padding * 2.0,
                    y: 14.0 + padding * 2.0,
                },
            },
            Color32::WHITE,
        );
        rc.text(pos2(padding, padding), &self.val);
    }
}

#[derive(knus::Decode, Clone)]
#[enum_dispatch(EntityTrait)]
pub enum Entity {
    Text(Text),
}
