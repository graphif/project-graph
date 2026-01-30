use glam::Vec2;

use crate::smooth_value::SmoothValue;

pub struct Camera {
    /// 视野中心位置
    position: SmoothValue<Vec2>,
    /// 缩放
    zoom: SmoothValue<f32>,
}

impl Camera {
    pub fn new() -> Self {
        Self {
            position: SmoothValue::new(Vec2::ZERO),
            zoom: SmoothValue::new(1.0),
        }
    }

    pub fn tick(&mut self, dt: f32) {
        self.position.tick(dt);
        self.zoom.tick(dt);
    }

    pub fn position(&self) -> Vec2 {
        self.position.get()
    }
    pub fn position_target(&self) -> Vec2 {
        self.position.target()
    }
    pub fn move_to(&mut self, target: Vec2) {
        self.position.set(target);
    }
    pub fn move_to_immediate(&mut self, target: Vec2) {
        self.position.snap(target);
    }
    pub fn pan_by(&mut self, delta: Vec2) {
        let new_target = self.position.target() + delta;
        self.position.set(new_target);
    }
    pub fn pan_by_immediate(&mut self, delta: Vec2) {
        let new_target = self.position.get() + delta;
        self.position.snap(new_target);
    }

    pub fn zoom(&self) -> f32 {
        self.zoom.get()
    }
    pub fn zoom_target(&self) -> f32 {
        self.zoom.target()
    }
    pub fn zoom_to(&mut self, target_zoom: f32) {
        self.zoom.set(target_zoom);
    }
    pub fn zoom_to_immediate(&mut self, target_zoom: f32) {
        self.zoom.snap(target_zoom);
    }
    pub fn zoom_by(&mut self, factor: f32) {
        let new_target_zoom = self.zoom.target() * factor;
        self.zoom.set(new_target_zoom);
    }
    pub fn zoom_by_immediate(&mut self, factor: f32) {
        let new_target_zoom = self.zoom.get() * factor;
        self.zoom.snap(new_target_zoom);
    }

    pub fn screen_to_world(&self, screen_pos: Vec2, screen_center: Vec2) -> Vec2 {
        let offset = screen_pos - screen_center;
        self.position() + offset / self.zoom()
    }
    pub fn world_to_screen(&self, world_pos: Vec2, screen_center: Vec2) -> Vec2 {
        let offset = (world_pos - self.position()) * self.zoom();
        screen_center + offset
    }
}
