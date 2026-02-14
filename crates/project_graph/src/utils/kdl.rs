#[derive(knus::Decode, serde::Serialize, serde::Deserialize, Debug, Clone, Copy)]
pub struct KdlPos2 {
    #[knus(property)]
    pub x: f32,
    #[knus(property)]
    pub y: f32,
}

impl From<KdlPos2> for egui::Pos2 {
    fn from(p: KdlPos2) -> Self {
        egui::pos2(p.x, p.y)
    }
}
impl From<egui::Pos2> for KdlPos2 {
    fn from(p: egui::Pos2) -> Self {
        KdlPos2 { x: p.x, y: p.y }
    }
}
