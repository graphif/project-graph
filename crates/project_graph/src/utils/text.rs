use egui::{FontId, Painter};

/// 计算文字宽度
pub fn get_text_width(text: &str, font_size: f32, painter: &Painter) -> f32 {
    let font_id = FontId::proportional(font_size);
    let galley = painter.layout_no_wrap(text.to_string(), font_id, egui::Color32::TRANSPARENT);
    galley.size().x
}
