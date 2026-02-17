use crate::stage::elements::ElementTrait;

/// 连接关系，连接节点端口的线段
/// 不能被包含，不能被连接
pub trait ConnectionTrait: ElementTrait {
    /// 起点端口 id
    fn from_port_id(&self) -> &str;
    /// 终点端口 id
    fn to_port_id(&self) -> &str;
}
