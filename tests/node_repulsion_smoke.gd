extends SceneTree

const Repulsion = preload("res://src/node_repulsion.gd")

class ActiveHistory extends History:
	var active := true

	func _ready() -> void:
		pass

	func is_transaction_active() -> bool:
		return active

var failures: Array[String] = []
var stage: Node2D
var history: ActiveHistory
var solver: Node2D


func _initialize() -> void:
	call_deferred("_run")


func check(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
		push_error(message)


func make_body(at: Vector2) -> Entity:
	var body := Entity.new()
	body.position = at
	body.gravity_scale = 0.0
	var collision := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(100, 100)
	collision.shape = shape
	body.add_child(collision)
	stage.add_child(body)
	body.set_physics_process(false)
	return body


func fixture() -> void:
	stage = Node2D.new()
	root.add_child(stage)
	history = ActiveHistory.new()
	history.name = "History"
	stage.add_child(history)
	solver = Repulsion.new()
	solver.target_root = stage
	stage.add_child(solver)
	solver.set_physics_process(false)


func cleanup() -> void:
	stage.free()


func _run() -> void:
	GraphPreferences.set_value("physics", true, false)

	# A held node must propagate separation through more than one neighbour.
	fixture()
	var a := make_body(Vector2.ZERO)
	var b := make_body(Vector2(80, 0))
	var c := make_body(Vector2(160, 0))
	a.drag_controlled = true
	solver._physics_process(1.0 / 60.0)
	check(a.linear_velocity == Vector2.ZERO, "Held node stays under drag control")
	check(b.linear_velocity.x > 0.0, "First neighbour moves away")
	check(c.linear_velocity.x > b.linear_velocity.x, "Push reaches the second neighbour")
	check(b.linear_velocity.y == 0.0 and c.linear_velocity.y == 0.0, "No lateral drift")
	a.drag_controlled = false
	solver.stop_motion()
	check(b.linear_velocity == Vector2.ZERO and c.linear_velocity == Vector2.ZERO, "Release stops neighbours")
	cleanup()

	# Already separating nodes remain unchanged across repeated solver calls.
	fixture()
	a = make_body(Vector2.ZERO)
	b = make_body(Vector2(100, 0))
	solver.acceleration = 0.0
	a.linear_velocity = Vector2(-240, 0)
	b.linear_velocity = Vector2(240, 0)
	for step in 3:
		solver._physics_process(1.0 / 60.0)
	check(a.linear_velocity == Vector2(-240, 0), "Satisfied constraint preserves first velocity")
	check(b.linear_velocity == Vector2(240, 0), "Satisfied constraint preserves second velocity")
	cleanup()

	# Different containers must not exchange forces.
	fixture()
	a = make_body(Vector2.ZERO)
	b = make_body(Vector2(80, 0))
	var container := make_body(Vector2(1000, 1000))
	b.container = container
	solver._physics_process(1.0 / 60.0)
	check(a.linear_velocity == Vector2.ZERO and b.linear_velocity == Vector2.ZERO, "Container boundary isolates repulsion")
	cleanup()

	# stop_motion must safely handle repeated tracking and a freed object.
	fixture()
	a = make_body(Vector2.ZERO)
	b = make_body(Vector2(500, 0))
	c = make_body(Vector2(1000, 0))
	var deleted := make_body(Vector2(1500, 0))
	a.linear_velocity = Vector2(25, 30)
	a.angular_velocity = 2.0
	b.drag_controlled = true
	b.linear_velocity = Vector2(40, 0)
	c.is_throwing = true
	c.linear_velocity = Vector2(50, 0)
	for body in [deleted, a, b, c, a, a]:
		solver._track(body)
	deleted.free()
	solver.stop_motion()
	check(a.linear_velocity == Vector2.ZERO and a.angular_velocity == 0.0, "Ordinary tracked motion stops")
	check(b.linear_velocity == Vector2(40, 0), "Drag velocity is preserved")
	check(c.linear_velocity == Vector2(50, 0), "Throw velocity is preserved")
	solver.stop_motion()
	check(b.linear_velocity == Vector2(40, 0), "Repeated stop is safe")
	cleanup()

	# Turning off physics or ending the transaction stops tracked motion.
	for stop_mode in ["preference", "transaction", "hidden"]:
		fixture()
		a = make_body(Vector2.ZERO)
		b = make_body(Vector2(80, 0))
		a.freeze = true
		solver._physics_process(1.0 / 60.0)
		check(b.linear_velocity.x > 0.0, "Frozen neighbour is avoided: " + stop_mode)
		if stop_mode == "preference":
			GraphPreferences.set_value("physics", false, false)
		elif stop_mode == "transaction":
			history.active = false
		else:
			stage.hide()
		solver._physics_process(1.0 / 60.0)
		check(b.linear_velocity == Vector2.ZERO, "Inactive solver stops tracked motion: " + stop_mode)
		GraphPreferences.set_value("physics", true, false)
		cleanup()

	# Empty and isolated scenes must remain valid.
	fixture()
	solver._physics_process(1.0 / 60.0)
	a = make_body(Vector2.ZERO)
	b = make_body(Vector2(1000, 1000))
	solver._physics_process(1.0 / 60.0)
	check(a.linear_velocity == Vector2.ZERO and b.linear_velocity == Vector2.ZERO, "Distant nodes stay still")
	cleanup()

	print("NODE_REPULSION: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
