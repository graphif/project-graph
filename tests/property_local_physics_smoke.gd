extends SceneTree
var app: Node
var stage: Stage
var failures: Array[String] = []
var subject_id := ""
var far_ids := PackedStringArray()
var far_positions := {}
var samples: Array[float] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _run() -> void:
	root.size = Vector2i(1280, 800)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	GraphPreferences.set_value("physics", true, false)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 5: await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	var path := OS.get_environment("PG_PROPERTY_DOCUMENT")
	var original_hash := ""
	if not path.is_empty():
		original_hash = FileAccess.get_sha256(path)
		check(await stage.load_from_file(path), "Load the real property fixture")
	var subject := stage.create_text_node("edited", Vector2(30000, 30000), false)
	subject_id = subject.id
	stage.create_text_node("nearby", Vector2(30150, 30000), false)
	for i in 2:
		var far := stage.create_text_node("far", Vector2(60000, 60000), false)
		far_ids.append(far.id)
		far_positions[far.id] = far.global_position
	stage.camera.position = subject.position
	stage.camera.target_position = subject.position
	stage.camera.zoom = Vector2.ONE
	stage.camera.target_zoom = Vector2.ONE
	for i in 8: await process_frame
	stage.history.clear()
	stage.select_ids(PackedStringArray([subject_id]))
	app._run("properties")
	var original_text := subject.text
	app._panel("NodeDetailsWindow").get_node("Text").text = "edited with more text"
	samples.clear()
	var started := Time.get_ticks_usec()
	app._panel("NodeDetailsWindow").get_node("Actions/Apply").pressed.emit()
	print("PROPERTY_APPLY_MS: ", (Time.get_ticks_usec() - started) / 1000.0)
	await _settle()
	_check_far("properties")
	check(_find(subject_id).text == "edited with more text", "Properties change the selected text")
	check(stage.history._undo_stack.size() == 1, "Property edit is one undo step")
	await stage.history.undo()
	for i in 5: await process_frame
	check(_find(subject_id).text == original_text, "Undo restores property text")
	_check_far("undo")
	await stage.history.redo()
	for i in 5: await process_frame
	check(_find(subject_id).text == "edited with more text", "Redo restores property text")
	_check_far("redo")
	app._window_ready["NodeDetailsWindow"].hide()
	stage.history.clear()
	subject = _find(subject_id)
	subject.enter_edit_mode()
	subject.text_edit.text = "direct text edit"
	subject.exit_edit_mode()
	await _settle()
	_check_far("direct text edit")
	check(stage.history._undo_stack.size() == 1, "Direct text edit is one undo step")
	stage.history.clear()
	var target: TextNode
	for object in stage.stage_objects():
		if object is TextNode and object.text == "nearby": target = object
	var edge := stage.connect_entities(_find(subject_id), target)
	for i in 8: await process_frame
	stage.history.clear()
	edge.enter_edit_mode()
	edge.get_node("Caption/Editor").text = "changed caption"
	edge.exit_edit_mode()
	samples.clear()
	await _settle()
	_check_far("caption edit")
	check(edge.text == "changed caption" and stage.history._undo_stack.size() == 1, "Caption edit is one undo step")
	var edge_id := edge.id
	await stage.history.undo()
	for i in 5: await process_frame
	for object in stage.stage_objects():
		if object.id == edge_id: edge = object
	check(edge.text.is_empty(), "Undo restores caption text")
	await stage.history.redo()
	for i in 5: await process_frame
	for object in stage.stage_objects():
		if object.id == edge_id: edge = object
	check(edge.text == "changed caption", "Redo restores caption text")
	_check_far("caption redo")
	if not path.is_empty(): check(original_hash == FileAccess.get_sha256(path), "Source fixture is unchanged")
	app.queue_free()
	await process_frame
	print("PROPERTY_LOCAL_PHYSICS: ", "PASS" if failures.is_empty() else str(failures))
	quit(0 if failures.is_empty() else 1)

func _find(id: String) -> TextNode:
	for object in stage.stage_objects():
		if object.id == id: return object as TextNode
	return null

func _check_far(phase: String) -> void:
	for id in far_ids:
		var far := _find(id)
		check(far != null and far.global_position.is_equal_approx(far_positions[id]), "Far overlapping nodes stay fixed during " + phase)

func _settle() -> void:
	var previous := Time.get_ticks_usec()
	var deadline := Time.get_ticks_msec() + 4000
	while (stage.history._pending_commit or samples.size() < 30) and Time.get_ticks_msec() < deadline:
		await process_frame
		var now := Time.get_ticks_usec()
		samples.append((now - previous) / 1000.0)
		previous = now
	check(not stage.history._pending_commit, "Edit settles within four seconds")
	if not samples.is_empty():
		samples.sort()
		var p95 := samples[mini(samples.size()-1,int(samples.size()*0.95))]
		print("PROPERTY_FRAME: ", JSON.stringify({"p95_ms":p95,"max_ms":samples.back()}))
		check(p95 < 50.0, "Local property edit avoids long repeated frame stalls")
