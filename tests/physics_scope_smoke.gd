extends SceneTree
var failures: Array[String] = []
var stage: Stage
var a: TextNode
var b: TextNode
var far: Array[TextNode] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func fixture() -> void:
	stage = load("res://src/stage/stage.tscn").instantiate()
	root.add_child(stage)
	a = stage.create_text_node("A", Vector2.ZERO, false)
	b = stage.create_text_node("B", Vector2.ZERO, false)
	far.clear()
	for i in 2: far.append(stage.create_text_node("far", Vector2(2000,2000), false))
	for i in 6: await physics_frame
	stage.history.clear()

func finish() -> void:
	stage.history.commit()
	while stage.history._pending_commit:
		await physics_frame
		await process_frame

func _run() -> void:
	GraphPreferences.set_value("physics",true,false)
	await fixture()
	stage.history.begin_transaction()
	a.fill_color = Color.RED
	await finish()
	check(a.position.is_zero_approx() and b.position.is_zero_approx(), "An ordinary transaction does not request layout")
	check(far.all(func(node):return node.position.is_equal_approx(Vector2(2000,2000))), "Unscoped transaction does not move far nodes")
	stage.queue_free()
	await process_frame
	await fixture()
	stage.history.begin_transaction()
	stage.get_node("NodeRepulsion").begin_local_edit([a])
	await finish()
	check(a.position.is_zero_approx() and not b.position.is_zero_approx(), "Local edit pins its driver and moves its neighbour")
	check(b.position.length() <= 65.0, "Local neighbour movement stays bounded")
	check(far.all(func(node):return node.position.is_equal_approx(Vector2(2000,2000))), "Local scope leaves far nodes fixed")
	stage.queue_free()
	await process_frame
	await fixture()
	stage.history.begin_transaction()
	stage.get_node("NodeRepulsion").begin_local_edit([a,b],false)
	await finish()
	check(not a.position.is_zero_approx() and not b.position.is_zero_approx(), "Caption endpoints can both yield inside their local scope")
	check(a.position.length() <= 65.0 and b.position.length() <= 65.0, "Flexible drivers stay within the same displacement budget")
	check(far.all(func(node):return node.position.is_equal_approx(Vector2(2000,2000))), "Flexible local scope leaves far nodes fixed")
	stage.queue_free()
	await process_frame
	await fixture()
	stage.history.begin_transaction()
	stage.get_node("NodeRepulsion").begin_global_layout()
	await finish()
	check(far.any(func(node):return not node.position.is_equal_approx(Vector2(2000,2000))), "Explicit global layout remains available")
	for node in [a,b]+far: node.linear_velocity = Vector2.ZERO
	stage.history.clear()
	for i in 6: await physics_frame
	var stable := StageObjectRegistry.capture(stage)
	stage.history.begin_transaction()
	await finish()
	check(stable == StageObjectRegistry.capture(stage), "Global layout permission ends with its transaction")
	stage.queue_free()
	await process_frame
	print("PHYSICS_SCOPE: ", "PASS" if failures.is_empty() else str(failures))
	quit(0 if failures.is_empty() else 1)
