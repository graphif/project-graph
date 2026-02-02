use egui::{
    Color32, Context, CornerRadius, Stroke, Visuals,
    style::{WidgetVisuals, Widgets},
};

pub fn apply_custom_theme(ctx: &Context) {
    let mut style = (*ctx.style()).clone();

    let mut visuals = Visuals::dark();

    let bg_color = Color32::from_rgb(0, 0, 0);
    let card_color = Color32::from_rgb(31, 31, 35);
    let primary_color = Color32::from_rgb(41, 121, 255);
    let fg_color = Color32::from_rgb(252, 252, 252);
    let secondary_bg = Color32::from_rgb(46, 46, 51);
    let muted_fg = Color32::from_rgb(159, 160, 178);
    let border_color = Color32::from_rgb(50, 50, 50);

    visuals.panel_fill = bg_color;
    visuals.window_fill = card_color;
    visuals.window_stroke = Stroke::new(1.0, border_color);
    visuals.override_text_color = Some(fg_color);
    visuals.extreme_bg_color = Color32::from_rgba_premultiplied(255, 255, 255, 38);

    // 圆角处理
    let radius = CornerRadius::same(6);
    visuals.window_corner_radius = CornerRadius::same(16);

    visuals.widgets = Widgets {
        noninteractive: WidgetVisuals {
            bg_fill: bg_color,
            weak_bg_fill: bg_color,
            bg_stroke: Stroke::new(1.0, border_color),
            fg_stroke: Stroke::new(1.0, muted_fg),
            corner_radius: radius,
            expansion: 0.0,
        },
        inactive: WidgetVisuals {
            bg_fill: secondary_bg,
            weak_bg_fill: secondary_bg,
            bg_stroke: Stroke::new(1.0, border_color),
            fg_stroke: Stroke::new(1.0, fg_color),
            corner_radius: radius,
            expansion: 0.0,
        },
        hovered: WidgetVisuals {
            bg_fill: Color32::from_rgb(58, 58, 66),
            weak_bg_fill: Color32::from_rgb(58, 58, 66),
            bg_stroke: Stroke::new(1.0, Color32::from_gray(120)),
            fg_stroke: Stroke::new(1.0, Color32::WHITE),
            corner_radius: radius,
            expansion: 1.0,
        },
        active: WidgetVisuals {
            bg_fill: primary_color,
            weak_bg_fill: primary_color,
            bg_stroke: Stroke::new(1.0, primary_color),
            fg_stroke: Stroke::new(1.0, Color32::WHITE),
            corner_radius: radius,
            expansion: 0.0,
        },
        open: WidgetVisuals {
            bg_fill: card_color,
            weak_bg_fill: card_color,
            bg_stroke: Stroke::new(1.0, border_color),
            fg_stroke: Stroke::new(1.0, fg_color),
            corner_radius: radius,
            expansion: 0.0,
        },
    };

    visuals.selection.bg_fill = primary_color.linear_multiply(0.3);
    visuals.selection.stroke = Stroke::new(1.5, primary_color);

    style.visuals = visuals;
    ctx.set_style(style);
}
