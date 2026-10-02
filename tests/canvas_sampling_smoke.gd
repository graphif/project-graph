extends SceneTree

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
	view.oversampling = true
	# Even a stale oversized viewport setting must be reset before drawing.
	view.oversampling_override = 50.0
	view.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(view)
	var stage := load("res://src/stage/stage.tscn").instantiate() as Stage
	view.add_child(stage)
	stage.get_node("CanvasLayer/Grid").hide()
	var node := stage.create_text_node("", Vector2.ZERO, false)
	node.freeze = true
	node.fill_color = Color("#afc9f5")
	node.label.custom_minimum_size = Vector2(200, 200)
	node.label.size = Vector2(200, 200)
	stage.select_ids(PackedStringArray())
	for zoom_value in [0.125, 0.5, 1.0, 2.0, 3.0]:
		stage.camera.target_zoom = Vector2.ONE * zoom_value
		stage.camera.zoom = stage.camera.target_zoom
		var top_left := node.label.position
		stage.camera.target_position = top_left + (Vector2(view.size) * 0.5 - Vector2(40, 40)) / zoom_value
		stage.camera.position = stage.camera.target_position
		for frame in 4:
			await process_frame
		await RenderingServer.frame_post_draw
		var sampling := view.oversampling_override
		check(sampling == 1.0, "Navigation preserves viewport caches at zoom %s, got %s" % [zoom_value, sampling])
		check(node.label.get_theme_font("font").oversampling == 2.0, "Canvas font owns its raster cache")
		check(node.label.get_theme_font("font").generate_mipmaps, "Glyphs retain mipmaps for minification")
		if zoom_value == 3.0:
			var pixels := view.get_texture().get_image()
			pixels.save_png("/tmp/pg-canvas-corner-3x.png")
			var partial := 0
			# Only the curved outer boundary; exclude straight borders and text.
			for y in range(40, 112):
				for x in range(45, 420):
					var alpha := pixels.get_pixel(x, y).a
					if alpha > 0.02 and alpha < 0.98:
						partial += 1
			print("CORNER_PARTIAL_COVERAGE: ", partial)
			check(partial > 100, "Maximum normal zoom retains subpixel corner coverage")
	var sample_before := view.oversampling_override
	# Small movements within a sampling level must not re-rasterize the atlas.
	stage.camera.target_zoom = Vector2.ONE * 0.49
	stage.camera.zoom = stage.camera.target_zoom
	for frame in 3:
		await process_frame
	check(view.oversampling_override == sample_before, "Nearby zooms reuse one sampling level")
	view.queue_free()
	await process_frame
	print("CANVAS_SAMPLING: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
