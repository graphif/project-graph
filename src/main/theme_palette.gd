extends RefCounted
## Shared built-in palette. Theme plugins remain a separate, future loader.
const Corners = preload("res://src/main/continuous_corners.gd")
const MOCHA := {
	"rosewater": "#f5e0dc", "flamingo": "#f2cdcd", "pink": "#f5c2e7", "mauve": "#cba6f7",
	"red": "#f38ba8", "maroon": "#eba0ac", "peach": "#fab387", "yellow": "#f9e2af",
	"green": "#a6e3a1", "teal": "#94e2d5", "sky": "#89dceb", "sapphire": "#74c7ec",
	"blue": "#89b4fa", "lavender": "#b4befe", "text": "#cdd6f4", "subtext1": "#bac2de",
	"subtext0": "#a6adc8", "overlay2": "#9399b2", "overlay1": "#7f849c", "overlay0": "#6c7086",
	"surface2": "#585b70", "surface1": "#45475a", "surface0": "#313244",
	"base": "#1e1e2e", "mantle": "#181825", "crust": "#11111b",
}
const LATTE := {
	"rosewater": "#dc8a78", "flamingo": "#dd7878", "pink": "#ea76cb", "mauve": "#8839ef",
	"red": "#d20f39", "maroon": "#e64553", "peach": "#fe640b", "yellow": "#df8e1d",
	"green": "#40a02b", "teal": "#179299", "sky": "#04a5e5", "sapphire": "#209fb5",
	"blue": "#1e66f5", "lavender": "#7287fd", "text": "#4c4f69", "subtext1": "#5c5f77",
	"subtext0": "#6c6f85", "overlay2": "#7c7f93", "overlay1": "#8c8fa1", "overlay0": "#9ca0b0",
	"surface2": "#acb0be", "surface1": "#bcc0cc", "surface0": "#ccd0da",
	"base": "#eff1f5", "mantle": "#e6e9ef", "crust": "#dce0e8",
}
const ROLES := {
	"surface.app": "mantle", "surface.canvas": "base", "surface.panel": "mantle",
	"surface.raised": "base", "surface.field": "base", "surface.hover": "surface0",
	"surface.pressed": "surface1", "text.primary": "text", "text.secondary": "subtext0",
	"text.disabled": "overlay0", "text.on_accent": "base", "border.default": "surface1",
	"border.subtle": "surface0", "border.focus": "mauve", "accent.primary": "mauve",
	"accent.link": "blue", "icon.default": "text", "icon.muted": "subtext0",
	"icon.disabled": "overlay0", "icon.active": "mauve", "status.info": "blue",
	"status.success": "green", "status.warning": "peach", "status.error": "red",
	"canvas.node.fill": "base", "canvas.node.border": "surface2", "canvas.node.text": "text",
	"canvas.edge": "blue", "canvas.selection": "mauve",
}
static var _switch_icons: Dictionary = {}
static var _system_light := false
static var _system_checked_at := -1000


static func is_light(mode: String) -> bool:
	if mode == "system":
		# Desktop theme queries can perform synchronous IPC. Share a one-second
		# snapshot with the existing theme poll instead of querying per edge/frame.
		var now := Time.get_ticks_msec()
		if now - _system_checked_at >= 1000:
			_system_light = not DisplayServer.is_dark_mode() if DisplayServer.is_dark_mode_supported() else false
			_system_checked_at = now
		return _system_light
	return mode in ["light", "latte", "builtin.catppuccin-latte"]


static func color(light: bool, role: String) -> Color:
	if role in ["text.primary", "text.secondary", "text.disabled", "canvas.node.text", "text.on_accent"]:
		var background := color(light, "accent.primary" if role == "text.on_accent" else "surface.canvas")
		return neutral_text_color(background)
	if role in ["canvas.edge", "canvas.node.border"]:
		return neutral_edge_color(color(light, "surface.canvas"))
	if role == "surface.selected":
		var mixed := color(light, "surface.canvas").lerp(color(light, "accent.primary"), 0.12 if light else 0.16)
		return Color.from_rgba8(roundi(mixed.r * 255.0), roundi(mixed.g * 255.0), roundi(mixed.b * 255.0))
	assert(ROLES.has(role), "Unknown theme role: " + role)
	return Color((LATTE if light else MOCHA)[ROLES[role]])


## Only remap the application's built-in Theme, never persistent graph properties.
static func _from_mocha(value: Color, light: bool) -> Color:
	if not light or value.a == 0.0:
		return value
	for name in MOCHA:
		if value.to_html(false) == Color(MOCHA[name]).to_html(false):
			return Color(Color(LATTE[name]), value.a)
	return value


static func configure_theme(target: Theme, light: bool) -> void:
	for type in target.get_type_list():
		for key in target.get_color_list(type):
			target.set_color(key, type, _from_mocha(target.get_color(key, type), light))
		for key in target.get_stylebox_list(type):
			var original := Corners.source(target.get_stylebox(key, type))
			if original == null:
				continue
			var style := original.duplicate() as StyleBoxFlat
			style.bg_color = _from_mocha(style.bg_color, light)
			style.border_color = _from_mocha(style.border_color, light)
			style.shadow_color = Color(0, 0, 0, original.shadow_color.a * (0.5 if light else 1.0))
			if key in ["selected", "tab_selected"]:
				style.bg_color = color(light, "surface.selected")
			if key in ["focus", "tab_focus", "selected_focus"]:
				style.border_color = color(light, "border.focus")
			target.set_stylebox(key, type, style)
		for key in target.get_color_list(type):
			if key.begins_with("font_") and key.ends_with("_color") and not "outline" in key and not "shadow" in key:
				var state := "normal"
				for candidate in ["hover_pressed", "pressed", "hover", "selected", "disabled", "read_only"]:
					if candidate in key:
						state = candidate
						break
				var background := color(light, "surface.canvas")
				if target.has_stylebox(state, type):
					var box := Corners.source(target.get_stylebox(state, type)) as StyleBoxFlat
					if box != null:
						background = background.blend(box.bg_color)
				target.set_color(key, type, neutral_text_color(background))
		if target.has_color("selection_color", type):
			target.set_color("selection_color", type, color(light, "surface.selected"))
	_configure_list_feedback(target, light)
	target.set_type_variation("MutedLabel", "Label")
	target.set_color("font_color", "MutedLabel", color(light, "text.secondary"))
	target.set_color("default_color", "RichTextLabel", color(light, "text.primary"))
	target.set_color("background_color", "Window", color(light, "surface.panel"))


## Reuse Godot's SVG rasterizer for the existing capsule switch shape, with palette roles.
static func switch_icon(light: bool, checked: bool, disabled: bool, mirrored: bool) -> Texture2D:
	var key := "%s:%s:%s:%s" % [light, checked, disabled, mirrored]
	if _switch_icons.has(key):
		return _switch_icons[key]
	var track := color(light, "accent.primary" if checked else "border.default")
	var thumb := color(light, "text.on_accent" if checked else "text.secondary")
	if disabled:
		track = color(light, "border.subtle")
		thumb = color(light, "text.disabled")
	var right := checked != mirrored
	var svg := '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="22" viewBox="0 0 36 22"><rect x="1" y="2" width="34" height="18" rx="9" fill="#%s"/><circle cx="%s" cy="11" r="7" fill="#%s"/></svg>' % [track.to_html(false), 26 if right else 10, thumb.to_html(false)]
	var image := Image.new()
	if image.load_svg_from_string(svg, 2.0) != OK:
		return null
	# Rasterize at the logical size: UI scaling is applied by the viewport.
	image.resize(36, 22, Image.INTERPOLATE_LANCZOS)
	var texture := ImageTexture.create_from_image(image)
	_switch_icons[key] = texture
	return texture


## Pick a neutral gray with readable contrast against the composited background.
static func neutral_edge_color(background: Color) -> Color:
	var luminance := background.srgb_to_linear().get_luminance()
	var level := (luminance + 0.05) / 4.5 - 0.05 if luminance > 0.18 else 4.5 * (luminance + 0.05) - 0.05
	level = clampf(level, 0.0, 1.0)
	return Color(level, level, level).linear_to_srgb()


## Prefer 7:1 text contrast; use the stronger black/white endpoint when 7:1 is impossible.
static func neutral_text_color(background: Color) -> Color:
	var luminance := background.srgb_to_linear().get_luminance()
	var black_contrast := (luminance + 0.05) / 0.05
	var white_contrast := 1.05 / (luminance + 0.05)
	var level := (luminance + 0.05) / 7.0 - 0.05 if black_contrast >= white_contrast else 7.0 * (luminance + 0.05) - 0.05
	level = clampf(level, 0.0, 1.0)
	return Color(level, level, level).linear_to_srgb()


static func _configure_list_feedback(target: Theme, light: bool) -> void:
	for state in ["hovered", "hovered_selected", "hovered_selected_focus", "selected", "selected_focus"]:
		var style := StyleBoxFlat.new()
		style.bg_color = color(light, "surface.hover" if state == "hovered" else "surface.selected")
		style.border_color = color(light, "border.focus")
		style.set_border_width_all(1 if state.ends_with("focus") else 0)
		style.set_corner_radius_all(8)
		style.content_margin_left = 8
		style.content_margin_right = 8
		style.content_margin_top = 5
		style.content_margin_bottom = 5
		target.set_stylebox(state, "ItemList", style)
	for key in ["font_color", "font_hovered_color", "font_selected_color", "font_hovered_selected_color"]:
		var background := color(light, "surface.hover" if key == "font_hovered_color" else "surface.selected")
		target.set_color(key, "ItemList", neutral_text_color(background))
	var tooltip := StyleBoxFlat.new()
	tooltip.bg_color = color(light, "surface.panel")
	tooltip.border_color = color(light, "border.default")
	tooltip.set_border_width_all(1)
	tooltip.set_corner_radius_all(8)
	tooltip.content_margin_left = 10
	tooltip.content_margin_right = 10
	tooltip.content_margin_top = 6
	tooltip.content_margin_bottom = 6
	target.set_stylebox("panel", "TooltipPanel", tooltip)
	target.set_color("font_color", "TooltipLabel", neutral_text_color(tooltip.bg_color))
