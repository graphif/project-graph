use crate::stage::elements::ElementTrait;

/// 包含关系，包含多个节点的关系
/// 可以被包含，可以被连接
pub trait ContainerTrait: ElementTrait {
    /// 包含的节点 id 列表
    fn contained_node_ids(&self) -> Vec<&str>;
}
