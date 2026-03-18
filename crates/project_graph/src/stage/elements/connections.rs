pub mod edge;

use crate::stage::elements::ElementTrait;
pub use edge::Edge;
use enum_dispatch::enum_dispatch;

/// 连接关系，连接节点端口的线段
/// 不能被包含，不能被连接
#[enum_dispatch]
pub trait ConnectionTrait: ElementTrait {
    /// 起点端口 id
    fn from_port_id(&self) -> &str;
    /// 终点端口 id
    fn to_port_id(&self) -> &str;
}

#[enum_dispatch(ConnectionTrait, ElementTrait)]
#[derive(knus::Decode, Debug, Clone)]
pub enum Connection {
    Edge(Edge),
}
