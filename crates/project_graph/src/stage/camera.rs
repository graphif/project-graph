use egui::{Pos2, Vec2};

pub struct Camera {
    /// 视野中心位置
    position: Pos2,
    /// 缩放
    zoom: f32,
}

impl Camera {
    pub fn new() -> Self {
        Self {
            position: Pos2::ZERO,
            zoom: 1.0,
        }
    }

    pub fn position(&self) -> Pos2 {
        self.position
    }
    pub fn move_to(&mut self, target: Pos2) {
        self.position = target;
    }
    pub fn pan_by(&mut self, delta: Vec2) {
        self.position += delta / self.zoom;
    }

    pub fn zoom(&self) -> f32 {
        self.zoom
    }
    pub fn zoom_to(&mut self, target_zoom: f32) {
        self.zoom = target_zoom;
    }
    pub fn zoom_by(&mut self, factor: f32) {
        self.zoom *= factor;
    }

    pub fn screen_to_world(&self, screen_pos: Pos2, screen_center: Pos2) -> Pos2 {
        let offset = screen_pos - screen_center;
        self.position() + offset / self.zoom()
    }
    pub fn world_to_screen(&self, world_pos: Pos2, screen_center: Pos2) -> Pos2 {
        let offset = (world_pos - self.position()) * self.zoom();
        screen_center + offset
    }
}
