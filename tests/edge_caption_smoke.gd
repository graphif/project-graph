extends SceneTree

var failures: Array[String] = []
var app
var stage: Stage

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func settle() -> void:
	for frame in 8:
		await physics_frame
		await process_frame
	while stage != null and (stage.history._busy or stage.history._pending_commit):
		await physics_frame

func key(code: Key) -> void:
	var event := InputEventKey.new()
	event.keycode = code
	event.pressed = true
	root.push_input(event)
	await process_frame
	event = event.duplicate()
	event.pressed = false
	root.push_input(event)

func _run() -> void:
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	var source := stage.create_text_node("Test01", Vector2(-240, 0), false)
	var target := stage.create_text_node("目标", Vector2(240, 100), false)
	source.freeze = true
	target.freeze = true
	var edge: LineEdge = StageObjectRegistry.get_scene("line_edge").instantiate()
	edge.source = source
	edge.target = target
	stage.add_child(edge)
	await settle()
	stage.history.clear()
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.pressed = true
	click.double_click = true
	click.position = edge.line.get_global_transform_with_canvas() * edge.line.points[edge.line.points.size() / 2]
	var motion := InputEventMouseMotion.new()
	motion.position = click.position
	stage.get_viewport().push_input(motion, true)
	stage.get_viewport().push_input(click, true)
	await process_frame
	check(edge.get_node("Caption/Editor").has_focus(), "Edge editor focused")
	edge.get_node("Caption/Editor").text = "依赖关系"
	edge.get_node("Caption/Editor").text_changed.emit()
	check(edge.is_text_dirty(), "Edge draft makes document dirty")
	await key(KEY_ENTER)
	await settle()
	check(edge.text == "依赖关系", "Enter commits edge text through root input")
	check(not edge.get_node("Caption/Editor").visible, "Enter exits edge editor")
	var edge_id := edge.id
	await stage.history.undo()
	await settle()
	for object in stage.stage_objects():
		if object.id == edge_id: edge = object
	check(edge.text.is_empty(), "Undo restores empty caption")
	await stage.history.redo()
	await settle()
	for object in stage.stage_objects():
		if object.id == edge_id: edge = object
	check(edge.text == "依赖关系", "Redo restores caption")
	edge.enter_edit_mode()
	edge.get_node("Caption/Editor").text = "取消"
	await key(KEY_ESCAPE)
	await settle()
	check(edge.text == "依赖关系", "Escape cancels draft")
	check(stage.save_to_file("/tmp/pg-caption-check.prg"), "Save caption")
	check(await stage.load_from_file("/tmp/pg-caption-check.prg"), "Load caption")
	await settle()
	for object in stage.stage_objects():
		if object.id == edge_id: edge = object
	check(edge.text == "依赖关系", "Caption persists")
	var old_position: Vector2 = edge.get_node("Caption").global_position
	edge.target.position += Vector2(160, 90)
	await settle()
	check(not edge.get_node("Caption").global_position.is_equal_approx(old_position), "Caption follows moved endpoint")
	if DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-edge-caption.png")
	app.queue_free()
	await process_frame
	print("EDGE_CAPTION: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
