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
	for frame in 15:
		await process_frame
	var stage: Stage = app.tabs.get_current_stage()
	check(stage.camera.zoom.is_equal_approx(Vector2(2, 2)), "New canvas starts at the previous 200%")
	check(stage.camera.zoom_percent() == 100, "New default displays 100%")
	stage.camera.target_zoom = Vector2(4, 4)
	stage.camera.zoom = stage.camera.target_zoom
	check(stage.camera.zoom_percent() == 200, "Physical 4x displays 200%")
	app._run("resetCameraScale")
	check(stage.camera.target_zoom.is_equal_approx(Vector2(2, 2)), "Reset command targets the new 100%")
	stage.camera.zoom = stage.camera.target_zoom
	app._tick = 1.0
	app._process(0.3)
	check(app.get_node("UIOverlay/Status").text.ends_with("100%"), "Status uses the same zoom reference")
	stage.camera.target_zoom = Vector2(1.5, 1.5)
	stage.camera.zoom = stage.camera.target_zoom
	check(stage.save_to_file("/tmp/pg-zoom-reference.prg"), "Save actual camera zoom")
	stage.camera.reset_zoom()
	check(await stage.load_from_file("/tmp/pg-zoom-reference.prg"), "Reload camera zoom")
	check(stage.camera.target_zoom.is_equal_approx(Vector2(1.5, 1.5)), "Saved physical view is not doubled on load")
	stage.camera.zoom = stage.camera.target_zoom
	check(stage.camera.zoom_percent() == 75, "Legacy physical zoom uses the new percentage")
	var second: Stage = app.tabs.new_tab()
	check(second.camera.target_zoom.is_equal_approx(Vector2(2, 2)), "Every new tab uses the new default")
	app.queue_free()
	await process_frame
	print("CANVAS_ZOOM_REFERENCE: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
