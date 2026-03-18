use nanoid::nanoid;
use crate::stage::{
    elements::{ElementTrait, connections::ConnectionTrait, entities::EntityTrait},
    render_context::RenderContext,
};

#[derive(knus::Decode, Debug, Clone)]
pub struct Edge {
    #[knus(argument, default = nanoid!())]
    id: String,
    #[knus(child, unwrap(argument))]
    from: String,
    #[knus(child, unwrap(argument))]
    to: String,
}

impl Edge {
    pub fn new(id: String, from: String, to: String) -> Self {
        Self { id, from, to }
    }
}

impl ElementTrait for Edge {
    fn id(&self) -> &str {
        &self.id
    }

    fn ui(&self, _ui: &mut egui::Ui, rc: &mut RenderContext) {
        // 暂存简单的线段和箭头绘制逻辑
        // 由于当前架构下 Element::ui 无法直接访问 StageContext 查找 from/to 节点的 Position
        // 我们这里先写好绘制逻辑，假设我们有了两个点
    }

    fn world_rect(&self) -> egui::Rect {
        egui::Rect::NOTHING
    }
}

impl Edge {
    /// 辅助函数：绘制带箭头的线段
    pub fn draw_arrow(painter: &egui::Painter, start: egui::Pos2, end: egui::Pos2, stroke: egui::Stroke) {
        painter.line_segment([start, end], stroke);
        
        let vec = end - start;
        let mag = vec.length();
        if mag > 0.0 {
            let dir = vec / mag;
            let tip_size = 10.0 * stroke.width / 2.0; // 随粗细缩放
            let side_dir = egui::vec2(dir.y, -dir.x);
            
            let p1 = end - dir * tip_size + side_dir * tip_size * 0.5;
            let p2 = end - dir * tip_size - side_dir * tip_size * 0.5;
            
            painter.add(egui::Shape::convex_polygon(
                vec![end, p1, p2],
                stroke.color,
                egui::Stroke::NONE,
            ));
        }
    }
}

impl ConnectionTrait for Edge {
    fn from_port_id(&self) -> &str {
        &self.from
    }

    fn to_port_id(&self) -> &str {
        &self.to
    }
}
