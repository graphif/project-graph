use egui::{Painter, Pos2, Stroke, vec2};

pub struct RenderContext {
    pub painter: Painter,
    pub position: Pos2,
    pub scale: f32,
}

impl RenderContext {
    pub fn local_to_screen(&self, local_pos: Pos2) -> Pos2 {
        Pos2 {
            x: self.position.x + local_pos.x * self.scale,
            y: self.position.y + local_pos.y * self.scale,
        }
    }

    pub fn rect(&self, local_rect: egui::Rect, color: egui::Color32) {
        let screen_rect = egui::Rect {
            min: self.local_to_screen(local_rect.min),
            max: self.local_to_screen(local_rect.max),
        };
        self.painter.rect_stroke(
            screen_rect,
            8.0 * self.scale,
            Stroke {
                color,
                width: self.scale,
            },
            egui::StrokeKind::Middle,
        );
    }

    pub fn text(&self, position: Pos2, text: &str) {
        self.painter.text(
            self.local_to_screen(position) - vec2(0.0, 14.0 * 0.15) * self.scale,
            egui::Align2::LEFT_TOP,
            text,
            egui::FontId::proportional(14.0 * self.scale),
            egui::Color32::WHITE,
        );
    }
}
