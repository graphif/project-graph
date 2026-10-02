extends SceneTree
var app: Node
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _run() -> void:
	GraphPreferences.set_value("physics", true, false)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 5: await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	for phase in ["unchanged", "fill", "palette", "stroke", "reverse"]:
		app.tabs.new_tab()
		var stage: Stage = app.tabs.get_current_stage()
		var a := stage.create_text_node("A", Vector2.ZERO, false)
		var b := stage.create_text_node("B", Vector2(240, 0), false)
		stage.create_text_node("overlapping", Vector2.ZERO, false)
		stage.create_text_node("far one", Vector2(2000, 2000), false)
		stage.create_text_node("far two", Vector2(2000, 2000), false)
		var edge := stage.connect_entities(a, b)
		for i in 8: await process_frame
		stage.history.clear()
		var positions := {}
		for object in stage.stage_objects():
			if object is Entity: positions[object.id] = object.global_position
		var id := a.id
		if phase in ["stroke", "reverse"]: id = edge.id
		stage.select_ids(PackedStringArray([id]))
		app._run("properties")
		var before := StageObjectRegistry.capture(stage)
		match phase:
			"unchanged": app._apply_details()
			"fill":
				app._panel("NodeDetailsWindow").get_node("Fields/Fill").color = Color("#fab387")
				app._apply_details()
				check(a.fill_color.is_equal_approx(Color("#fab387")), "Property fill applies")
			"palette":
				app._window_ready["NodeDetailsWindow"].hide()
				app._run("openColorManagerWindow")
				app._panel("ColorWindow").get_node("ColorRow/Hex").text = "#a6e3a1"
				app._update_color_input()
				app._apply_color()
				check(a.fill_color.is_equal_approx(Color("#a6e3a1")), "Color window applies")
			"stroke":
				app._panel("NodeDetailsWindow").get_node("Fields/StrokeWidth").value = 5
				app._apply_details()
				check(edge.stroke_width == 5, "Edge stroke property applies")
			"reverse":
				app._reverse_edge()
				check(edge.source == b and edge.target == a, "Edge direction reverses")
		check(not stage.history.is_transaction_active(), "Visual edits do not activate physics: " + phase)
		var deadline := Time.get_ticks_msec() + 3000
		for i in 12: await physics_frame
		while stage.history._pending_commit and Time.get_ticks_msec() < deadline:
			await physics_frame
		for object in stage.stage_objects():
			if object is Entity:
				check(object.global_position.is_equal_approx(positions[object.id]), "Visual edit leaves positions fixed: " + phase)
		if phase == "unchanged":
			check(not stage.history.can_undo(), "No-op Apply adds no undo entry")
			check(before == StageObjectRegistry.capture(stage), "No-op Apply leaves all document values unchanged")
		else:
			check(stage.history._undo_stack.size() == 1, "Visual edit creates one undo entry: " + phase)
			var after := StageObjectRegistry.capture(stage)
			await stage.history.undo()
			check(before == StageObjectRegistry.capture(stage), "Visual undo restores document: " + phase)
			await stage.history.redo()
			check(after == StageObjectRegistry.capture(stage), "Visual redo restores document: " + phase)
		app._window_ready["NodeDetailsWindow"].hide()
		if app._window_ready.has("ColorWindow"): app._window_ready["ColorWindow"].hide()
	app.queue_free()
	await process_frame
	print("VISUAL_EDIT_PHYSICS: ", "PASS" if failures.is_empty() else str(failures))
	quit(0 if failures.is_empty() else 1)
