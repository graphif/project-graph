extends SceneTree

var failures: Array[String] = []
func _initialize() -> void:
	call_deferred("_run")
func check(ok: bool, message: String) -> void:
	if not ok and not failures.has(message):
		failures.append(message)
		push_error(message)
func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 30:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	var stage = app.tabs.get_current_stage()
	var node = stage.create_text_node("Theme sync", Vector2.ZERO, false)
	var target = stage.create_text_node("Target", Vector2(250, 100), false)
	node.freeze = true
	target.freeze = true
	var edge = StageObjectRegistry.get_scene("line_edge").instantiate()
	edge.source = node
	edge.target = target
	edge.text = "Caption"
	stage.add_child(edge)
	app._apply_preferences("theme", "mocha")
	GraphPreferences.set_value("theme", "light", false)
	var members: Array[Entity] = []
	node.update_container_layout(members)
	await process_frame
	check(node._appearance_light == false, "Layout must retain displayed theme while preference is pending")
	check(edge.get_node("Caption")._last_light == false, "Caption must retain displayed theme while preference is pending")
	app._set_preference("theme", "light")
	await process_frame
	app._set_preference("theme", "mocha")
	for i in 90:
		await process_frame
		node.update_container_layout(members)
		check(node._appearance_light == bool(stage._applied_theme_light), "Node and canvas share displayed theme throughout rapid reversal")
		check(edge.get_node("Caption")._last_light == bool(stage._applied_theme_light), "Caption and canvas share displayed theme throughout rapid reversal")
	check(stage._applied_theme_light == 0, "Final canvas matches last request")
	print("THEME_CANVAS_SYNC: ", "PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)
