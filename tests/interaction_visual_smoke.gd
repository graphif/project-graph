extends SceneTree

var failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)


func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	root.size = Vector2i(1440, 1000)
	for frame in 15:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	var stage: Stage = app.tabs.get_current_stage()
	var outer := stage.create_text_node("Waya", Vector2(-200, -100), false)
	var middle := stage.create_text_node("计划02", Vector2(-100, -50), false)
	var inner := stage.create_text_node("Project Graph", Vector2.ZERO, false)
	var leaf := stage.create_text_node("计划01", Vector2(60, 80), false)
	middle.container = outer
	inner.container = middle
	leaf.container = inner
	for node in [outer, middle, inner, leaf]:
		node.freeze = true
	stage.get_node("EntityLayerMover").refresh_layout()
	var edge := stage.connect_entities(outer, leaf)
	edge.source_uv = Vector2(1, 0.25)
	edge.target_uv = Vector2(0, 0.75)
	stage.select_ids(PackedStringArray([edge.id]))
	app._reverse_edge()
	check(edge.source == leaf and edge.target == outer, "Reverse endpoints")
	check(edge.source_uv == Vector2(0, 0.75) and edge.target_uv == Vector2(1, 0.25), "Reverse anchors")
	var dialog: Window = app._ensure_window_ready("CommandPalette")
	var results: ItemList = dialog.get_node("Margin/Content/Results")
	var scrollbars := 0
	for child in results.get_children(true):
		if child is ScrollBar:
			scrollbars += 1
	check(scrollbars == 2, "No serialized duplicate scrollbars")
	check(dialog.transparent_bg, "Rounded client background is transparent")
	for light in [false, true]:
		app._apply_preferences("theme", "light" if light else "mocha")
		var icon: Texture2D = app._menu_icon({"id": "newDraft"}, "newDraft")
		check(icon is DPITexture, "Menu uses scalable SVG")
		var color := "#4c4f69" if light else "#cdd6f4"
		if icon is DPITexture:
			check(color in icon.get_source(), "Menu icon uses current theme color")
		for scale_percent in [100, 150, 200]:
			GraphPreferences.set_value("ui_scale", scale_percent, false)
			app._apply_ui_scale()
			app._show_panel("CommandPalette")
			for frame in 6:
				await process_frame
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png("/tmp/pg-dialog-%s-%d.png" % ["latte" if light else "mocha", scale_percent])
			dialog.hide()
	GraphPreferences.set_value("ui_scale", 100, false)
	app._apply_preferences("theme", "light")
	app._apply_ui_scale()
	stage.select_ids(PackedStringArray())
	stage.camera.target_position = outer.aabb.get_center()
	for zoom_value in [0.5, 1.0, 2.0]:
		stage.camera.target_zoom = Vector2.ONE * zoom_value
		stage.camera.zoom = stage.camera.target_zoom
		stage.camera.global_position = stage.camera.target_position
		for frame in 6:
			await process_frame
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-canvas-zoom-%s.png" % str(zoom_value))
	for repeat in 3:
		var idle_started := Time.get_ticks_usec()
		await RenderingServer.frame_post_draw
		print("IDLE_DRAW_MS: " + str(float(Time.get_ticks_usec() - idle_started) / 1000.0))
	print("FPS_LIMIT: " + str(Engine.max_fps) + " FPS: " + str(Engine.get_frames_per_second()) + " PROCESS: " + str(Performance.get_monitor(Performance.TIME_PROCESS)))
	var opening_samples: Array[float] = []
	for repeat in 5:
		var started := Time.get_ticks_usec()
		var phase := Time.get_ticks_usec()
		app._show_panel("CommandPalette")
		var layout_started := Time.get_ticks_usec()
		results.force_update_list_size()
		print("COMMAND_LAYOUT_MS: " + str(float(Time.get_ticks_usec() - layout_started) / 1000.0))
		print("COMMAND_SHOW_CALL_MS: " + str(float(Time.get_ticks_usec() - phase) / 1000.0))
		await RenderingServer.frame_post_draw
		opening_samples.append(float(Time.get_ticks_usec() - started) / 1000.0)
		dialog.hide()
		await process_frame
	print("COMMAND_OPEN_TO_DRAW_MS: " + str(opening_samples))
	app.queue_free()
	await process_frame
	print("INTERACTION_VISUAL: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
