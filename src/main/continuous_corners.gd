extends RefCounted
## Shared continuous-corner geometry, rendered by native SVG/nine-patch resources.
const CONTROL := 12.0
const NODE := 18.0
const PANEL := 24.0
const SOURCE_META := &"continuous_corner_source"
const CURVE := [
	Vector2(0, 0), Vector2(0.34, 0), Vector2(0.587401052, 0),
	Vector2(0.793700526, 0.206299474), Vector2(1, 0.412598948),
	Vector2(1, 0.66), Vector2(1, 1),
]
static var _textures: Dictionary = {}


static func source(box: StyleBox) -> StyleBoxFlat:
	if box is StyleBoxFlat:
		return box
	return box.get_meta(SOURCE_META) as StyleBoxFlat if box != null and box.has_meta(SOURCE_META) else null


static func _corner(rect: Rect2, radius: float, index: int) -> PackedVector2Array:
	var origins := [Vector2(rect.end.x - radius, rect.position.y),
		Vector2(rect.end.x, rect.end.y - radius),
		Vector2(rect.position.x + radius, rect.end.y),
		Vector2(rect.position.x, rect.position.y + radius)]
	var points := PackedVector2Array()
	for point in CURVE:
		points.append(origins[index] + (point * radius).rotated(index * PI * 0.5))
	return points


static func outline(rect: Rect2, radius: float) -> PackedVector2Array:
	radius = clampf(radius, 0.0, minf(rect.size.x, rect.size.y) * 0.5)
	var points := PackedVector2Array()
	for corner in 4:
		var curve := _corner(rect, radius, corner)
		for segment in 2:
			var offset := segment * 3
			for step in 13:
				points.append(curve[offset].bezier_interpolate(curve[offset + 1],
					curve[offset + 2], curve[offset + 3], step / 12.0))
	return points


static func _path(rect: Rect2, radius: float) -> String:
	var result := ""
	for corner in 4:
		var points := _corner(rect, radius, corner)
		result += ("%s %.4f %.4f " % ["M" if corner == 0 else "L", points[0].x, points[0].y])
		for segment in 2:
			var offset := segment * 3
			result += "C %.4f %.4f %.4f %.4f %.4f %.4f " % [
				points[offset + 1].x, points[offset + 1].y,
				points[offset + 2].x, points[offset + 2].y,
				points[offset + 3].x, points[offset + 3].y]
	return result + "Z"


# Reserve a non-overlapping straight section between opposing nine-patch cuts.
# Padding is added to both the texture and draw rect, so it cancels here.
static func fitted_radius(size: Vector2, radius: float, border_width: float = 1.0) -> float:
	return floorf(clampf(radius, 0.0, maxf(0.0, minf(size.x, size.y) * 0.5 - border_width - 2.0)))


static func style(original: StyleBoxFlat, radius: float, mipmapped: bool = false, continuous: bool = false) -> StyleBox:
	if original == null:
		return StyleBoxEmpty.new()
	var flat := original.duplicate() as StyleBoxFlat
	flat.set_corner_radius_all(roundi(radius))
	# Underlines and one-sided borders keep the native representation.
	if radius <= 0.0 or flat.border_width_left != flat.border_width_top or flat.border_width_left != flat.border_width_right or flat.border_width_left != flat.border_width_bottom:
		return flat
	# 小控件（按钮、输入框、页签）常在 2×切边之内，九宫格会把圆角压缩近半。
	# 这类尺寸改用原生圆角如实渲染；连续圆角只留给空间足够的大表面。
	if radius <= CONTROL and not continuous:
		flat.anti_aliasing = true
		return flat
	var width := float(flat.border_width_left)
	var shadow := float(flat.shadow_size) if flat.shadow_color.a > 0.0 else 0.0
	var padding := ceilf(shadow + maxf(absf(flat.shadow_offset.x), absf(flat.shadow_offset.y))) + 1.0
	var cut := padding + radius + width
	var extent := 2.0 * cut + 4.0
	var rect := Rect2(Vector2.ONE * padding, Vector2.ONE * (extent - padding * 2.0))
	var key := str([radius, flat.bg_color, flat.border_color, width,
		flat.draw_center, flat.shadow_color, shadow, flat.shadow_offset, mipmapped])
	var texture: Texture2D = _textures.get(key)
	if texture == null:
		var svg := '<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" viewBox="0 0 %s %s">' % [extent, extent, extent, extent]
		if shadow > 0.0:
			# Native SVG strokes provide a soft, bounded shadow without screen sampling.
			for layer in range(8, 0, -1):
				var spread := shadow * layer / 8.0
				var shadow_rect := Rect2(rect.position + flat.shadow_offset, rect.size).grow(spread * 0.5)
				svg += '<path d="%s" fill="none" stroke="#%s" stroke-opacity="%s" stroke-width="%s"/>' % [
					_path(shadow_rect, radius + spread * 0.5), flat.shadow_color.to_html(false),
					flat.shadow_color.a * (1.0 - layer / 9.0) * 0.22, spread]
		var fill := "#" + flat.bg_color.to_html(false) if flat.draw_center else "none"
		svg += '<path d="%s" fill="%s" fill-opacity="%s" stroke="#%s" stroke-opacity="%s" stroke-width="%s"/>' % [
			_path(rect.grow(-width * 0.5), maxf(0.0, radius - width * 0.5)),
			fill, flat.bg_color.a, flat.border_color.to_html(false), flat.border_color.a, width]
		svg += "</svg>"
		if mipmapped:
			var image := Image.new()
			if image.load_svg_from_string(svg, 4.0) != OK:
				return flat
			image.fix_alpha_edges()
			image.generate_mipmaps()
			var raster := ImageTexture.create_from_image(image)
			raster.set_size_override(Vector2i(roundi(extent), roundi(extent)))
			texture = raster
		else:
			var scalable := DPITexture.create_from_string(svg)
			scalable.fix_alpha_border = true
			texture = scalable
		if _textures.size() >= 256:
			_textures.clear()
		_textures[key] = texture
	var result := StyleBoxTexture.new()
	result.texture = texture
	result.set_texture_margin_all(cut)
	for side in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]:
		result.set_content_margin(side, flat.get_content_margin(side))
		result.set_expand_margin(side, flat.get_expand_margin(side) + padding)
	result.set_meta(SOURCE_META, flat)
	return result


static func configure_theme(theme: Theme) -> void:
	for type in theme.get_type_list():
		for key in theme.get_stylebox_list(type):
			var flat := source(theme.get_stylebox(key, type))
			if flat == null:
				continue
			var radius := CONTROL
			if "Scroll" in type or key.contains("separator") or type == "DialogTabs":
				continue
			if type in ["Window", "PopupMenu", "Panel", "PanelContainer", "DialogSurface", "AcceptDialog"]:
				radius = PANEL if key in ["panel", "embedded_border", "embedded_unfocused_border"] else CONTROL
			elif type in ["Tree", "ItemList", "ShortcutTable", "SettingsTabs"] and key in ["panel", "normal", "focus"]:
				radius = NODE
			if type == "PopupMenu" and key == "panel":
				flat = flat.duplicate()
				# PopupMenu's own viewport clips shadows outside its client area.
				flat.shadow_size = 0
				flat.shadow_color = Color.TRANSPARENT
			theme.set_stylebox(key, type, style(flat, radius))
