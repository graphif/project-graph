extends SceneTree

const Corners = preload("res://src/main/continuous_corners.gd")
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func capture() -> Image:
	for frame in 5:
		await process_frame
	await RenderingServer.frame_post_draw
	return root.get_texture().get_image()

func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	root.size = Vector2i(1280, 800)
	for frame in 12:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	var stage: Stage = app.tabs.get_current_stage()
	# This test isolates pixel coverage; overview behavior has its own regression.
	stage.group_overview.camera_scale_threshold = 0.001
	var a := stage.create_text_node("Plan 01", Vector2(-230, -130), false)
	var b := stage.create_text_node("Project Graph", Vector2(220, 110), false)
	var group := stage.create_text_node("Group", Vector2.ZERO, false)
	for node in [a, b, group]:
		node.freeze = true
		node.fill_color = Color("#89b4fa")
	a.container = group
	b.container = group
	stage.get_node("EntityLayerMover").refresh_layout()
	var edge := stage.connect_entities(a, b)
	edge.text = "Relation"
	stage.select_ids(PackedStringArray([a.id]))
	stage.camera.target_position = Vector2.ZERO
	stage.camera.position = Vector2.ZERO
	var baseline := JSON.stringify(StageObjectRegistry.capture(stage))
	var anchors := PackedVector2Array()
	for light in [false, true]:
		GraphPreferences.set_value("theme", "latte" if light else "mocha", false)
		app._apply_preferences("theme", "latte" if light else "mocha")
		for zoom in [1.0, 0.25, 0.5, 0.75, 2.0, 4.0]:
			stage.camera.target_zoom = Vector2.ONE * zoom
			stage.camera.zoom = stage.camera.target_zoom
			var image := await capture()
			image.save_png("/tmp/pg-aa-native-%s-%s.png" % ["latte" if light else "mocha", zoom])
			check(absf(edge.line.get_global_transform_with_canvas().get_scale().x - 1.0) <= 0.045, "Stroke AA remains in screen pixels")
			check(absf(edge.arrow_head.get_global_transform_with_canvas().get_scale().x - 1.0) <= 0.045, "Arrow AA remains in screen pixels")
			var actual := PackedVector2Array([edge.line.to_global(edge.line.points[0]), edge.arrow_head.global_position])
			if anchors.is_empty():
				anchors = actual
			check(actual[0].is_equal_approx(anchors[0]) and actual[1].is_equal_approx(anchors[1]), "Zoom preserves world anchors")
			check(edge.distance_to_point(edge.line.to_global(edge.line.points[3])) < 0.001, "Line hit geometry follows visible curve")
			var outline := stage._selection_lines[a.id] as Line2D
			check(is_equal_approx(outline.get_global_transform_with_canvas().get_scale().x, 1.0), "Selection AA remains in screen pixels")
			var style := a.label.get_theme_stylebox("normal") as StyleBoxTexture
			check(style.texture is ImageTexture and style.texture.get_image().has_mipmaps(), "Canvas corners retain cached mipmap levels")
			check(a.texture_filter == CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS, "Smooth scalable corner textures")
	check(JSON.stringify(StageObjectRegistry.capture(stage)) == baseline, "AA leaves document untouched")
	root.size = Vector2i(1024, 720)
	stage.camera.target_zoom = Vector2.ONE
	stage.camera.zoom = Vector2.ONE
	await capture()
	check(absf(edge.line.get_global_transform_with_canvas().get_scale().x - 1.0) <= 0.045, "Resize preserves AA geometry")
	# Verify actual coverage on Compatibility, not just the antialiased flag.
	var probe := SubViewport.new()
	probe.size = Vector2i(512, 128)
	probe.transparent_bg = true
	probe.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(probe)
	var stroke := Line2D.new()
	stroke.points = PackedVector2Array([Vector2(20, 30), Vector2(490, 100)])
	stroke.width = 8.0
	stroke.antialiased = true
	probe.add_child(stroke)
	for frame in 3:
		await process_frame
	await RenderingServer.frame_post_draw
	var native_pixels := partial_pixels(probe.get_texture().get_image())
	stroke.texture = edge.line.texture
	stroke.texture_mode = edge.line.texture_mode
	stroke.texture_filter = edge.line.texture_filter
	for frame in 3:
		await process_frame
	await RenderingServer.frame_post_draw
	var smooth_pixels := partial_pixels(probe.get_texture().get_image())
	check(smooth_pixels > native_pixels + 100, "Texture AA produces fractional edge coverage: %d -> %d" % [native_pixels, smooth_pixels])
	print("EDGE_COVERAGE: %d -> %d" % [native_pixels, smooth_pixels])
	var selected_outline := stage._selection_lines[a.id] as Line2D
	stroke.texture = selected_outline.texture
	stroke.texture_mode = selected_outline.texture_mode
	stroke.texture_filter = selected_outline.texture_filter
	stroke.width = selected_outline.width
	stroke.closed = true
	stroke.points = Corners.outline(Rect2(30, 20, 440, 90), 30)
	for frame in 3:
		await process_frame
	await RenderingServer.frame_post_draw
	var selection_pixels := partial_pixels(probe.get_texture().get_image())
	check(selection_pixels > 100, "Selection outline has fractional edge coverage")
	print("SELECTION_COVERAGE: %d" % selection_pixels)
	probe.queue_free()
	app.queue_free()
	await process_frame
	print("CANVAS_AA: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)

func partial_pixels(image: Image) -> int:
	var count := 0
	for y in image.get_height():
		for x in image.get_width():
			var alpha := image.get_pixel(x, y).a
			if alpha > 0.02 and alpha < 0.98:
				count += 1
	return count
