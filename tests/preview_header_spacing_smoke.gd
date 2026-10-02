extends "res://tests/group_overview_smoke.gd"

func _run() -> void:
	root.size = Vector2i(1280, 800)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	var path := "/home/waya/Desktop/project/tutorial-shortcut-keys-3.1.prg"
	check(await stage.load_from_file(path), "Shortcut fixture opens")
	for object in stage.stage_objects():
		object.freeze = true
	var before := StageObjectRegistry.capture(stage)
	await zoom_to(.125)
	check_headers()
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("/tmp/pg-preview-headers.png")
	stage.camera.position += Vector2(100, 100)
	stage.camera.target_position = stage.camera.position
	await settle()
	check_headers()
	check(StageObjectRegistry.capture(stage) == before, "Header spacing never moves persistent objects")
	app.queue_free()
	await process_frame
	print("PREVIEW_HEADER_SPACING: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)

func check_headers() -> void:
	var occupied: Array[Rect2] = []
	var overview := stage.group_overview
	for identifier in overview._preview_roots:
		var panel: Panel = overview._summaries[identifier]
		if not panel.visible:
			continue
		var header: Panel = panel.get_node("HeaderBackground")
		if not header.visible:
			continue
		var bounds := header.get_global_transform_with_canvas() * Rect2(Vector2.ZERO, header.size)
		check(bounds.position.x >= 4 and bounds.position.y >= 4, "Entire header stays inside viewport")
		for previous in occupied:
			check(not bounds.intersects(previous), "Visible group headers do not overlap at the viewport boundary")
		occupied.append(bounds)
	check(occupied.size() >= 2, "Several group titles remain visible")
