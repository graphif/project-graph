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
	root.size = Vector2i(1280, 800)
	for i in 30:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	var stage = app.tabs.get_current_stage()
	var container = stage.get_viewport().get_parent()
	var gesture := InputEventMagnifyGesture.new()
	gesture.factor = 1.2
	gesture.position = container.get_global_transform_with_canvas() * (container.size * 0.5)
	var motion := InputEventMouseMotion.new()
	motion.position = gesture.position
	root.push_input(motion, true)
	var before: Vector2 = stage.camera.target_zoom
	root.push_input(gesture, true)
	await process_frame
	check(stage.camera.target_zoom.is_equal_approx(before * 1.2), "Root pinch reaches canvas exactly once")
	print("PINCH_ZOOM: ", "PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)
