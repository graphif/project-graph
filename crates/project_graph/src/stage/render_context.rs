use egui::Pos2;

pub struct RenderContext {
    pub zoom: f32,
    pub selected: bool,
    pub clicked: bool,
    pub painter: egui::Painter,
    pub screen_center: Pos2,
}

impl RenderContext {}
