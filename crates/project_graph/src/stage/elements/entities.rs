pub mod text;

use egui::Pos2;
use enum_dispatch::enum_dispatch;

use crate::stage::elements::ElementTrait;

/// 实体，有位置以及零个或多个端口且可以独立存在的物体
#[enum_dispatch]
pub trait EntityTrait: ElementTrait {
    /// 位置
    fn position(&self) -> Pos2;
}

#[enum_dispatch(ElementTrait, EntityTrait)]
#[derive(knus::Decode, Debug, Clone)]
pub enum Entity {
    Text(text::Text),
}
