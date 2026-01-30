pub fn glam2egui(v: glam::Vec2) -> egui::Vec2 {
    egui::vec2(v.x, v.y)
}
pub fn egui2glam(v: egui::Vec2) -> glam::Vec2 {
    glam::Vec2::new(v.x, v.y)
}
