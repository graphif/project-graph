extends SceneTree
## Pixel coverage regression for zoomed-out text-node and container borders.

const Corners = preload("res://src/main/continuous_corners.gd")
var failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)


func _run() -> void:
	GraphPreferences._loaded = true
	GraphPreferences.set_value("physics", false, false)
	var view := SubViewport.new()
	view.size = Vector2i(1000, 800)
	view.transparent_bg = true
	view.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(view)
	var stage := load("res://src/stage/stage.tscn").instantiate() as Stage
	view.add_child(stage)
	stage.get_node("CanvasLayer/Grid").hide()
	var node := stage.create_text_node("", Vector2.ZERO, false)
	node.freeze = true
	stage.select_ids(PackedStringArray())
	node.label.custom_minimum_size = Vector2(600, 400)
	node.label.size = node.label.custom_minimum_size
	for frame in 4:
		await process_frame
	var original_transform := node.transform
	var original_rect := node.get_visual_rect()
	for zoom_value: float in [0.02, 0.125, 0.25, 0.5, 0.99, 1.0, 2.0]:
		stage.camera.target_zoom = Vector2.ONE * zoom_value
		stage.camera.zoom = stage.camera.target_zoom
		for phase: float in [0.0, 0.25, 0.5, 0.75]:
			var screen_origin := Vector2(80, 80) + Vector2.ONE * phase
			stage.camera.target_position = node.label.position + (Vector2(view.size) * 0.5 - screen_origin) / zoom_value
			stage.camera.position = stage.camera.target_position
			for frame in 4:
				await process_frame
			await RenderingServer.frame_post_draw
			var image := view.get_texture().get_image()
			var canvas := node.label.get_global_transform_with_canvas()
			var start := canvas * Vector2.ZERO
			var end := canvas * Vector2(node.label.size.x, 0)
			var source := Corners.source(node.label.get_theme_stylebox("normal"))
			var inset := float(source.corner_radius_top_left) * zoom_value + 2.0
			# Each column on the straight upper border must retain solid coverage,
			# including fractional camera positions that previously lost the line.
			for x in range(maxi(0, ceili(start.x + inset)), mini(image.get_width(), floori(end.x - inset))):
				var coverage := 0.0
				for y in range(floori(start.y) - 2, ceili(start.y) + 3):
					coverage = maxf(coverage, image.get_pixel(x, y).a)
				check(coverage >= 0.4, "Border disappears: zoom=%s phase=%s x=%s alpha=%s" % [zoom_value, phase, x, coverage])
			check(node.transform == original_transform and node.get_visual_rect() == original_rect, "Zoom changes only rendering")
	# Same bucket must reuse identical baked geometry despite floating-point zoom.
	stage.camera.zoom = Vector2.ONE * .125
	stage.camera.target_zoom = stage.camera.zoom
	stage.camera.force_update_scroll()
	var border: Line2D
	for child in node.label.get_children():
		if child.get_script() == load("res://src/minimum_screen_border.gd"):
			border = child
	check(border != null, "Text node has native minimum-pixel border")
	if border != null:
		border._process(0.0)
		var baked := border.points
		for jitter in [.125001, .125003, .125007]:
			stage.camera.zoom = Vector2.ONE * jitter
			stage.camera.target_zoom = stage.camera.zoom
			stage.camera.force_update_scroll()
			border._process(0.0)
			check(border.points == baked, "Sub-bucket zoom reuses identical rounded geometry")
		var cache_key: Array = border._refresh_key.duplicate()
		node.visibility_layer = 0
		stage.camera.zoom = Vector2.ONE * .25
		stage.camera.target_zoom = stage.camera.zoom
		stage.camera.force_update_scroll()
		border._process(0.0)
		check(border._refresh_key == cache_key and border.points == baked, "Ancestor canvas culling skips hidden border work")
		node.visibility_layer = 1
		border._process(0.0)
		check(border._refresh_key != cache_key, "Restored border catches up to the current zoom")
	# Thin glyph coverage should survive camera shifts, not turn into fragments.
	var sample := Label.new()
	sample.text = "||||||||||||||||"
	sample.add_theme_font_override("font", node.label.get_theme_font("font"))
	sample.add_theme_font_size_override("font_size", 24)
	sample.add_theme_color_override("font_color", Color.WHITE)
	sample.add_theme_stylebox_override("normal", StyleBoxEmpty.new())
	sample.texture_filter = node.label.texture_filter
	stage.add_child(sample)
	stage.camera.zoom = Vector2.ONE * 0.125
	stage.camera.target_zoom = stage.camera.zoom
	var retention: Array[float] = []
	for filter in [CanvasItem.TEXTURE_FILTER_LINEAR, CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS]:
		sample.texture_filter = filter
		var coverage_values: Array[float] = []
		for phase: float in [0.0, 0.25, 0.5, 0.75]:
			sample.position = stage.get_canvas_transform().affine_inverse() * (Vector2(80, 200) + Vector2.ONE * phase)
			for frame in 3:
				await process_frame
			await RenderingServer.frame_post_draw
			var image := view.get_texture().get_image()
			var coverage := 0.0
			for y in range(197, 240):
				for x in range(77, 250):
					coverage += image.get_pixel(x, y).a
			coverage_values.append(coverage)
		var minimum: float = coverage_values.min()
		var maximum: float = coverage_values.max()
		retention.append(minimum / maxf(maximum, 0.0001))
		print("GLYPH_COVERAGE filter=", filter, " alpha=", coverage_values)
	check(retention[1] > 0.7 and retention[1] > retention[0] + 0.1, "Mipmaps must reduce disappearing thin glyphs: %s" % [retention])
	# All canvas text controls must consume the mipmaps already in their font.
	check(node.label.texture_filter == CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS, "Display text consumes glyph mipmaps")
	check(node.text_edit.texture_filter == CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS, "Editor text consumes glyph mipmaps")
	view.queue_free()
	await process_frame
	print("MINIMUM_SCREEN_BORDER: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
