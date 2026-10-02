extends SceneTree

var app: Node
var stage: Stage
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _run() -> void:
	root.size = Vector2i(1280, 800)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	GraphPreferences.set_value("physics", OS.get_environment("PG_RIGHT_PHYSICS") != "0", false)
	GraphPreferences.set_value("right_mode", 0, false)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 5: await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	var path := OS.get_environment("PG_RIGHT_DOCUMENT")
	if path.is_empty(): path = "/home/waya/Desktop/project/教程操作.prg"
	var before := FileAccess.get_sha256(path)
	if not await stage.load_from_file(path):
		quit(2)
		return
	var subject: TextNode
	for object in stage.stage_objects():
		if object is TextNode and not object._container_active and object.text == "视野缩放":
			subject = object
			break
	if subject == null:
		for object in stage.stage_objects():
			if object is TextNode and not object._container_active:
				subject = object
				break
	check(subject != null, "Fixture has a selectable text node")
	if subject == null:
		quit(1)
		return
	stage.select_ids(PackedStringArray())
	_focus(subject.aabb.get_center())
	for i in 15: await process_frame
	var snapshot := StageObjectRegistry.capture(stage)
	for attempt in 3:
		var started := Time.get_ticks_usec()
		_right_click(subject.aabb.get_center())
		var elapsed := (Time.get_ticks_usec() - started) / 1000.0
		print("RIGHT_MENU_MS: ", elapsed)
		check(elapsed <= 300.0, "Right click must not stall more than 300 ms")
		var popup := app.get_node("UIOverlay/PopupMenu") as PopupMenu
		check(popup.visible and stage.selected_ids.has(subject.id), "Right click selects its node and opens the menu")
		check(not stage.history.is_transaction_active(), "Opening the context menu must not activate editing physics")
		check(not stage.history.can_undo(), "Opening the context menu must not create history")
		await process_frame
		var index := -1
		for row in popup.item_count:
			if popup.get_item_metadata(row) == "properties": index = row
		check(index >= 0 and not popup.is_item_disabled(index), "Properties is enabled")
		popup.hide()
		started = Time.get_ticks_usec()
		app._on_context_action(popup.get_item_id(index))
		var details_ms := (Time.get_ticks_usec() - started) / 1000.0
		print("RIGHT_DETAILS_CALL_MS: ", details_ms)
		check(details_ms <= 100.0, "Properties opens without a long synchronous stall")
		check(app._panel("NodeDetailsWindow").get_node("Text").text == subject.text, "Properties displays the clicked node")
		var samples: Array[float] = []
		var previous := Time.get_ticks_usec()
		for i in 30:
			await process_frame
			var now := Time.get_ticks_usec()
			samples.append((now - previous) / 1000.0)
			previous = now
		samples.sort()
		print("RIGHT_DETAILS_FRAME: ", JSON.stringify({"attempt":attempt,"p95":samples[int(samples.size()*0.95)],"max":samples.back()}))
		check(samples.back() <= 100.0, "Opening properties must not trigger long frame stalls")
		var window: Window = app._window_ready["NodeDetailsWindow"]
		window.hide()
		for i in 10: await process_frame
	check(snapshot == StageObjectRegistry.capture(stage), "Right click and properties inspection must leave every object unchanged")
	check(before == FileAccess.get_sha256(path), "Source document is unchanged")
	await _edge_menu()
	await _connection_history()
	app.queue_free()
	await process_frame
	print("RIGHT_PROPERTIES: ", "PASS" if failures.is_empty() else str(failures))
	quit(0 if failures.is_empty() else 1)

func _edge_menu() -> void:
	GraphPreferences.set_value("physics", false, false)
	app.tabs.new_tab()
	stage = app.tabs.get_current_stage()
	var source := stage.create_text_node("source", Vector2(-240, 0), false)
	var target := stage.create_text_node("target", Vector2(240, 0), false)
	source.freeze = true
	target.freeze = true
	var edge := stage.connect_entities(source, target)
	for i in 8: await process_frame
	stage.history.clear()
	var point := edge.line.to_global(edge.line.points[edge.line.points.size() / 2])
	_focus(point)
	for i in 8: await process_frame
	for mode in [0, 1]:
		GraphPreferences.set_value("right_mode", mode, false)
		stage.select_ids(PackedStringArray())
		_right_click(point)
		check(stage.selected_ids == PackedStringArray([edge.id]), "Right click selects the edge in mode " + str(mode))
		var popup := app.get_node("UIOverlay/PopupMenu") as PopupMenu
		check(popup.visible, "Edge context menu opens")
		popup.hide()
		app._run("properties")
		check(app._panel("NodeDetailsWindow").get_node("Selection").text == "连线", "Edge property controls remain available")
		app._window_ready["NodeDetailsWindow"].hide()
		for i in 5: await process_frame

func _focus(point: Vector2) -> void:
	stage.camera.position = point
	stage.camera.target_position = point
	stage.camera.zoom = Vector2.ONE
	stage.camera.target_zoom = Vector2.ONE

func _right_click(point: Vector2) -> void:
	var viewport := stage.get_viewport()
	var container := viewport.get_parent() as Control
	var position: Vector2 = container.get_global_transform_with_canvas() * ((stage.get_canvas_transform() * point) * container.size / Vector2(viewport.size))
	root.warp_mouse(position)
	var event := InputEventMouseButton.new()
	event.position = position
	event.global_position = position
	event.button_index = MOUSE_BUTTON_RIGHT
	event.pressed = true
	Input.parse_input_event(event)
	Input.flush_buffered_events()
	event = event.duplicate()
	event.pressed = false
	Input.parse_input_event(event)
	Input.flush_buffered_events()

func _connection_history() -> void:
	GraphPreferences.set_value("right_mode", 0, false)
	GraphPreferences.set_value("left_mode", 0, false)
	var source := stage.create_text_node("new source", Vector2(-240, 240), false)
	var target := stage.create_text_node("new target", Vector2(240, 240), false)
	source.freeze = true
	target.freeze = true
	for i in 8: await process_frame
	stage.history.clear()
	var creator := stage.get_node("LineEdgeCreator")
	creator._start_drag(source, source.aabb.get_center())
	check(not stage.history.is_transaction_active(), "Connection preview must not activate physics")
	creator.cancel_drag()
	check(not stage.history.is_transaction_active() and not stage.history.can_undo(), "Cancelled preview leaves no transaction")
	for button in [MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_LEFT]:
		GraphPreferences.set_value("left_mode", 2 if button == MOUSE_BUTTON_LEFT else 0, false)
		stage.history.clear()
		var from_id := source.id
		var to_id := target.id
		var count := stage.stage_objects().size()
		_button(source.aabb.get_center(), button, true)
		var motion := InputEventMouseMotion.new()
		motion.position = _screen(target.aabb.get_center())
		motion.global_position = motion.position
		root.warp_mouse(motion.position)
		Input.parse_input_event(motion)
		Input.flush_buffered_events()
		_button(target.aabb.get_center(), button, false)
		for i in 8: await process_frame
		while stage.history._pending_commit:
			await physics_frame
			await process_frame
		check(stage.stage_objects().size() == count + 1, "Connection gesture creates one edge")
		check(stage.history._undo_stack.size() == 1, "Connection gesture creates one undo entry")
		await stage.history.undo()
		for i in 8: await process_frame
		check(stage.stage_objects().size() == count, "Undo removes the created connection")
		await stage.history.redo()
		for i in 8: await process_frame
		check(stage.stage_objects().size() == count + 1, "Redo restores the created connection")
		await stage.history.undo()
		for i in 8: await process_frame
		for object in stage.stage_objects():
			if object.id == from_id: source = object
			if object.id == to_id: target = object

func _screen(point: Vector2) -> Vector2:
	var viewport := stage.get_viewport()
	var container := viewport.get_parent() as Control
	return container.get_global_transform_with_canvas() * ((stage.get_canvas_transform() * point) * container.size / Vector2(viewport.size))

func _button(point: Vector2, button: MouseButton, pressed: bool) -> void:
	var event := InputEventMouseButton.new()
	event.position = _screen(point)
	event.global_position = event.position
	event.button_index = button
	event.pressed = pressed
	root.warp_mouse(event.position)
	Input.parse_input_event(event)
	Input.flush_buffered_events()
