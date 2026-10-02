extends SceneTree

var failures: Array[String] = []
var app
var stage: Stage
var solver: Node2D


func _initialize() -> void:
	call_deferred("_run")


func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)


func settle(frames := 8) -> void:
	for frame in frames:
		await physics_frame
		await process_frame


func node_named(value: String) -> TextNode:
	for object in stage.stage_objects():
		if object is TextNode and object.text == value:
			return object
	return null


func clear_velocities() -> void:
	for object in stage.stage_objects():
		if object is Entity:
			object.linear_velocity = Vector2.ZERO


func _run() -> void:
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	solver = stage.get_node("NodeRepulsion")
	solver.set_physics_process(false)
	GraphPreferences.set_value("physics", true, false)
	var a := stage.create_text_node("A", Vector2(-700, 0), false)
	var b := stage.create_text_node("B", Vector2(0, 250), false)
	var c := stage.create_text_node("C", Vector2(700, 0), false)
	var isolated := stage.create_text_node("Unlinked", Vector2(0, 1500), false)
	var ab := stage.connect_entities(a, b)
	stage.connect_entities(b, c)
	await settle()
	stage.history.clear()
	solver._physics_process(0.1)
	check(a.linear_velocity == Vector2.ZERO and c.linear_velocity == Vector2.ZERO, "Idle loaded graph does not rearrange")
	stage.history.begin_transaction()
	solver.begin_global_layout()
	solver._physics_process(0.1)
	check(a.linear_velocity.x > 0.0 and c.linear_velocity.x < 0.0, "Both ends of a connected chain attract")
	check(b.linear_velocity.y < 0.0, "Indirectly connected component includes its middle node")
	check(isolated.linear_velocity == Vector2.ZERO, "Unlinked node does not attract")
	var without_caption := a.linear_velocity
	clear_velocities()
	ab.text = "Line caption"
	solver._physics_process(0.1)
	check(a.linear_velocity.distance_to(without_caption) > 0.01, "Virtual line caption participates in component attraction")
	var with_caption := c.linear_velocity
	clear_velocities()
	stage.connect_entities(b, a)
	solver._physics_process(0.1)
	check(c.linear_velocity.is_equal_approx(with_caption), "Duplicate/reverse topology does not multiply attraction")
	clear_velocities()
	a.drag_controlled = true
	a._drag_target = a.position
	b.freeze = true
	solver._physics_process(0.1)
	check(a.linear_velocity == Vector2.ZERO and b.linear_velocity == Vector2.ZERO, "Held and frozen endpoints remain fixed")
	check(c.linear_velocity.x < 0.0, "Free connected endpoint still attracts")
	a.drag_controlled = false
	b.freeze = false
	GraphPreferences.set_value("physics", false, false)
	solver._physics_process(0.1)
	check(c.linear_velocity == Vector2.ZERO and not solver.has_pending_motion(), "Disabling physics stops attraction")
	GraphPreferences.set_value("physics", true, false)
	clear_velocities()
	stage.hide()
	solver._physics_process(0.1)
	check(a.linear_velocity == Vector2.ZERO and c.linear_velocity == Vector2.ZERO, "Hidden stage does not attract")
	stage.show()
	await stage.history.cancel_transaction()
	await settle()
	# A real transaction integrates the same bodies and records one undo entry.
	var before := StageObjectRegistry.capture(stage)
	var before_distance := node_named("A").aabb.get_center().distance_to(node_named("C").aabb.get_center())
	var original_ticks := Engine.physics_ticks_per_second
	Engine.physics_ticks_per_second = 240
	solver.set_physics_process(true)
	stage.history.clear()
	stage.history.begin_transaction()
	solver.begin_global_layout()
	stage.history.commit()
	while stage.history._pending_commit:
		await physics_frame
		await process_frame
	var after := StageObjectRegistry.capture(stage)
	check(JSON.stringify(before) != JSON.stringify(after), "Attraction produces visible movement during settling")
	check(node_named("A").aabb.get_center().distance_to(node_named("C").aabb.get_center()) < before_distance, "Connected graph gently contracts")
	var stable := JSON.stringify(StageObjectRegistry.capture(stage))
	await settle(20)
	check(JSON.stringify(StageObjectRegistry.capture(stage)) == stable, "Completed transaction remains still")
	await stage.history.undo()
	await settle()
	check(JSON.stringify(StageObjectRegistry.capture(stage)) == JSON.stringify(before), "Undo restores the pre-attraction layout")
	await stage.history.redo()
	await settle()
	check(JSON.stringify(StageObjectRegistry.capture(stage)) == JSON.stringify(after), "Redo restores the settled layout")
	Engine.physics_ticks_per_second = original_ticks
	solver.set_physics_process(false)
	var left_group := stage.create_text_node("Left group", Vector2(-700, -300), false)
	var right_group := stage.create_text_node("Right group", Vector2(700, -300), false)
	a = node_named("A")
	b = node_named("B")
	c = node_named("C")
	a.container = left_group
	b.container = right_group
	c.container = right_group
	b.move_without_inertia(Vector2(700, 0))
	c.move_without_inertia(Vector2(950, 150))
	await settle()
	stage.history.clear()
	stage.history.begin_transaction()
	solver.begin_global_layout()
	clear_velocities()
	solver._physics_process(0.1)
	check(left_group.linear_velocity.x > 0.0 and right_group.linear_velocity.x < 0.0, "Cross-group links attract the corresponding containers")
	check(a.linear_velocity == Vector2.ZERO and b.linear_velocity == Vector2.ZERO and c.linear_velocity == Vector2.ZERO, "Cross-group attraction preserves member-relative layout")
	clear_velocities()
	a.drag_controlled = true
	a._drag_target = a.position
	solver._physics_process(0.1)
	check(left_group.linear_velocity == Vector2.ZERO, "Dragging a member protects its container from attraction")
	a.drag_controlled = false
	clear_velocities()
	app.queue_free()
	await process_frame
	print("LINKED_ATTRACTION: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
