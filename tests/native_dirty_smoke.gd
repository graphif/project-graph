extends SceneTree
var failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func check(value: bool, message: String) -> void:
	if not value:
		failures.append(message)
		push_error(message)


func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 4:
		await process_frame
	var stage: Stage = app.tabs.get_current_stage()
	var a := stage.create_text_node("A", Vector2.ZERO, false)
	var b := stage.create_text_node("B", Vector2(300, 0), false)
	a.freeze = true
	b.freeze = true
	var edge := stage.connect_entities(a, b)
	var path := "/tmp/pg-native-dirty-test.prg"
	check(stage.save_to_file(path), "Save succeeds")
	check(not stage.is_dirty(), "Saved stage is clean")
	stage.camera.position += Vector2(100, 50)
	stage.camera.zoom *= .8
	check(not stage.is_dirty(), "Navigation leaves document clean")
	a.enter_edit_mode()
	a.text_edit.text = "Draft"
	check(stage.is_dirty(), "Uncommitted active editor marks dirty")
	a.exit_edit_mode(false)
	check(not stage.is_dirty(), "Canceled editor returns to clean baseline")
	a.text = "Changed"
	check(stage.is_dirty(), "Text edit marks dirty")
	check(stage.save_to_file(path), "Dirty document saves")
	check(not stage.is_dirty(), "Saving invalidates cached dirty state")
	a.text = "A"
	check(stage.save_to_file(path), "Original text saves again")
	a.text = "A"
	check(not stage.is_dirty(), "Restoring text clears dirty")
	edge.source = b
	check(stage.is_dirty(), "Reference edit marks dirty")
	edge.source = a
	check(not stage.is_dirty(), "Restoring reference clears dirty")
	b.container = a
	check(stage.is_dirty(), "Containment edit marks dirty")
	b.container = null
	check(not stage.is_dirty(), "Restoring containment clears dirty")
	a.position += Vector2(1, 0)
	check(stage.is_dirty(), "Position edit marks dirty")
	check(await stage.load_from_file(path), "Saved document reloads")
	check(not stage.is_dirty(), "Restored objects with stable IDs are clean")
	var stroke: PenStroke = StageObjectRegistry.get_scene("pen_stroke").instantiate()
	stage.add_child(stroke)
	stroke.points = PackedVector2Array([Vector2.ZERO, Vector2(10, 10)])
	check(stage.is_dirty(), "Added object marks dirty")
	stage.save_to_file(path)
	var points := stroke.points
	points[1] += Vector2(2, 1)
	stroke.points = points
	check(stage.is_dirty(), "Packed point edit marks dirty")
	DirAccess.remove_absolute(path)
	app.queue_free()
	await process_frame
	print("NATIVE_DIRTY: ", "PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)
