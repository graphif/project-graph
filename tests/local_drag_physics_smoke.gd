extends SceneTree
var failures: Array[String] = []
var stage: Stage
var app: Node

class PhysicsStep extends Node:
	signal solved
	var solver: Node
	func _physics_process(_delta: float) -> void:
		set_physics_process(false)
		solver._physics_process(1.0 / 60.0)
		solved.emit()

func solve_once(solver: Node) -> void:
	var step := PhysicsStep.new()
	step.solver = solver
	stage.add_child(step)
	await step.solved
	step.queue_free()

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func settle() -> void:
	for i in 5:
		await physics_frame
		await process_frame

func _run() -> void:
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", true, false)
	var solver := stage.get_node("NodeRepulsion")
	solver.set_physics_process(false)
	var dragged := stage.create_text_node("Dragged", Vector2.ZERO, false)
	var neighbour := stage.create_text_node("Neighbour", Vector2(100, 0), false)
	var far := stage.create_text_node("Far linked", Vector2(4000, 0), false)
	var far_neighbour := stage.create_text_node("Far crowded", Vector2(4070, 0), false)
	stage.connect_entities(dragged, far)
	await settle()
	stage.history.clear()
	var before := StageObjectRegistry.capture(stage)
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	dragged._on_input_event(stage.get_viewport(), press, 0)
	dragged.set_physics_process(false)
	dragged._drag_target = dragged.position
	var neighbour_origin := neighbour.global_position
	await solve_once(solver)
	check(not neighbour.linear_velocity.is_zero_approx(), "Nearby overlap still yields to dragging")
	check(far.linear_velocity.is_zero_approx() and far_neighbour.linear_velocity.is_zero_approx(), "Dragging does not rearrange remote linked or crowded nodes")
	check(dragged.linear_velocity.is_zero_approx(), "Dragged node stays controlled by pointer")
	for i in 40:
		await solve_once(solver)
	check(neighbour.global_position.distance_to(neighbour_origin) <= solver.influence_distance + 1.0, "Passive avoidance stays within one influence radius")
	# The complete local yield belongs to the pointer gesture's single history entry.
	dragged.pause_drag_for_layer_move()
	stage.history._finish_commit()
	var after := StageObjectRegistry.capture(stage)
	check(stage.history._undo_stack.size() == 1, "Local drag yields one undo entry")
	await stage.history.undo()
	await settle()
	check(StageObjectRegistry.capture(stage) == before, "Undo restores the driver and passive neighbours together")
	await stage.history.redo()
	await settle()
	check(StageObjectRegistry.capture(stage) == after, "Redo restores the settled local layout")
	for object in stage.stage_objects():
		if object is TextNode and object.text == "Far linked":
			far = object
		elif object is TextNode and object.text == "Far crowded":
			far_neighbour = object
	# Moving a group preserves all members' relative arrangement.
	solver.stop_motion()
	var group := stage.create_text_node("Group", Vector2(0, 1000), false)
	var child := stage.create_text_node("Child", Vector2(0, 1200), false)
	var sibling := stage.create_text_node("Sibling", Vector2(80, 1200), false)
	child.container = group
	sibling.container = group
	await settle()
	stage.history.clear()
	group._on_input_event(stage.get_viewport(), press, 0)
	group.set_physics_process(false)
	group._drag_target = group.position
	await solve_once(solver)
	check(child.linear_velocity.is_zero_approx() and sibling.linear_velocity.is_zero_approx(), "Group dragging does not rearrange its internal members")
	check(far.linear_velocity.is_zero_approx() and far_neighbour.linear_velocity.is_zero_approx(), "Group dragging leaves remote content still")
	group.pause_drag_for_layer_move()
	solver.stop_motion()
	app.queue_free()
	await process_frame
	print("LOCAL_DRAG_PHYSICS: ", "PASS" if failures.is_empty() else str(failures))
	quit(0 if failures.is_empty() else 1)
