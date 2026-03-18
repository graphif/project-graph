pub mod connections;
pub mod containers;
pub mod entities;

use enum_dispatch::enum_dispatch;

use crate::stage::{
    elements::{connections::Connection, entities::Entity},
    render_context::RenderContext,
};

/// 元素，以前称做舞台对象
/// 所有可以被渲染的东西都应该实现这个 trait
#[enum_dispatch]
pub trait ElementTrait {
    /// 原则上应该是一个 nanoid
    fn id(&self) -> &str;
    /// 渲染函数
    fn ui(&self, ui: &mut egui::Ui, rc: &mut RenderContext);
    /// 获取包围盒（世界坐标）
    fn world_rect(&self) -> egui::Rect;
}

#[enum_dispatch(ElementTrait)]
#[derive(knus::Decode, Debug, Clone)]
pub enum Element {
    Entity(Entity),
    Connection(Connection),
}
