use egui::Pos2;
use serde::{Deserialize, Serialize};

/// 1. 定义核心 Trait
/// 使用 #[typetag::serde] 允许动态类型序列化
#[typetag::serde(tag = "type")]
pub trait StageObject: std::fmt::Debug + dyn_clone::DynClone {
    fn id(&self) -> &str;
    fn render(&self, ui: &mut egui::Ui);
    fn as_any(&self) -> &dyn std::any::Any; // 用于高级场景下的类型转换
}

// 辅助：让 Trait 支持 Clone
dyn_clone::clone_trait_object!(StageObject);

/// 2. 实现具体的 TextNode
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TextNode {
    pub id: String,
    pub position: Pos2,
    pub content: String,
}

#[typetag::serde]
impl StageObject for TextNode {
    fn id(&self) -> &str {
        &self.id
    }

    fn render(&self, ui: &mut egui::Ui) {
        ui.label(format!("📝 TextNode [{}]", self.id));
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

/// 3. 实现具体的 LineEdge
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LineEdge {
    pub id: String,
    pub elements: Vec<String>,
}

#[typetag::serde]
impl StageObject for LineEdge {
    fn id(&self) -> &str {
        &self.id
    }

    fn render(&self, ui: &mut egui::Ui) {
        ui.colored_label(
            egui::Color32::LIGHT_BLUE,
            format!("🔗 Connection: {}", self.id),
        );
        ui.label(format!("Links: {:?}", self.elements));
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}
