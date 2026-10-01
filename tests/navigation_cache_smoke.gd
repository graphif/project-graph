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


func _run() -> void:
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", false, false)
	var a := stage.create_text_node("Source", Vector2(-400, -100), false)
	var b := stage.create_text_node("Target", Vector2(400, 100), false)
	a.freeze = true
	b.freeze = true
	var edge := stage.connect_entities(a, b)
	edge.text = "Caption"
	stage.camera.zoom = Vector2.ONE * 0.4
	stage.camera.target_zoom = stage.camera.zoom
	await settle()
	check(not edge.is_processing() and not edge.get_node("Caption").is_processing(), "Settled edges and captions stop polling")
	var collision := (edge.collision_shape.shape as ConcavePolygonShape2D).segments
	var caption_position: Vector2 = edge.get_node("Caption").global_position
	for zoom_value in [0.2, 0.6, 0.9]:
		stage.camera.zoom = Vector2.ONE * zoom_value
		stage.camera.target_zoom = stage.camera.zoom
		await settle()
		check((edge.collision_shape.shape as ConcavePolygonShape2D).segments == collision, "Zoom preserves world collision geometry")
		check(edge.get_node("Caption").global_position.distance_to(caption_position) < 0.001, "Zoom preserves caption world position")
	b.move_without_inertia(Vector2(650, 180))
	await settle()
	check((edge.collision_shape.shape as ConcavePolygonShape2D).segments != collision, "Moving an endpoint updates cached geometry")
	check(edge.get_node("Caption").global_position.distance_to(caption_position) > 10.0, "Caption follows moved endpoint")
	var reverse := stage.connect_entities(b, a)
	reverse.text = "Reverse"
	await settle()
	check(not is_equal_approx(edge.caption_fraction(), 0.5), "Adding a named peer separates captions")
	reverse.text = ""
	check(is_equal_approx(edge.caption_fraction(), 0.5), "Removing peer text restores midpoint")
	reverse.text = "Reverse again"
	check(not is_equal_approx(edge.caption_fraction(), 0.5), "Restoring peer text invalidates cache")
	reverse.queue_free()
	await settle()
	check(is_equal_approx(edge.caption_fraction(), 0.5), "Deleting peer restores midpoint")
	var group := stage.create_text_node("Group", Vector2.ZERO, false)
	group.freeze = true
	a.container = group
	await settle()
	check(group.aabb.encloses(a.aabb), "Containment edit updates layout")
	a.text = "A much longer title after the layout cache has settled"
	await settle()
	check(group.aabb.encloses(a.aabb), "Text growth invalidates container layout")
	a.move_without_inertia(a.position + Vector2(0, 250))
	await settle()
	check(group.aabb.encloses(a.aabb), "Child movement invalidates container layout")
	await _check_local_rendering(edge)
	_check_transformed_bounds()
	app.queue_free()
	await process_frame
	if failures.is_empty():
		print("NAVIGATION_CACHE: PASS")
	quit(0 if failures.is_empty() else 1)


func _check_transformed_bounds() -> void:
	var body := StageObject.new()
	root.add_child(body)
	var collision := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(80, 30)
	collision.shape = shape
	body.add_child(collision)
	for angle in [0.0, 0.4, -1.3, PI]:
		body.transform = Transform2D(angle, Vector2(1.4, 0.7), 0.2, Vector2(120, -80))
		collision.transform = Transform2D(-0.3, Vector2(0.8, 1.3), -0.1, Vector2(12, 25))
		var rect := shape.get_rect()
		var expected := Rect2(collision.to_global(rect.position), Vector2.ZERO)
		for point in [rect.position, Vector2(rect.end.x, rect.position.y), rect.end, Vector2(rect.position.x, rect.end.y)]:
			expected = expected.expand(collision.to_global(point))
		check(body.aabb.is_equal_approx(expected), "Native bounds preserve rotation, scale and skew")
	body.queue_free()


func _check_local_rendering(edge: LineEdge) -> void:
	stage.camera.set_process(false)
	var home := edge._view_bounds.get_center()
	stage.camera.position = home + Vector2(10000, 10000)
	stage.camera.zoom = Vector2.ONE * 0.8
	stage.camera.target_position = stage.camera.position
	stage.camera.target_zoom = stage.camera.zoom
	await settle()
	var render := edge._render_key.duplicate()
	stage.camera.zoom = Vector2.ONE * 1.2
	stage.camera.target_zoom = stage.camera.zoom
	await settle()
	check(not edge._in_view, "Offscreen edge is excluded from local rendering")
	check(edge._render_key == render, "Offscreen zoom leaves native geometry untouched")
	edge.target.move_without_inertia(edge.target.position + Vector2(120, 90))
	await settle()
	check(edge._view_bounds.has_point(edge.line.to_global(edge.line.points[0])), "Offscreen endpoint edits refresh world bounds")
	stage.camera.position = edge._view_bounds.get_center()
	stage.camera.target_position = stage.camera.position
	await settle()
	check(edge._in_view and edge._render_key != render, "Returning to the viewport refreshes deferred zoom")
	edge.show_arrow = false
	await settle()
	check(not edge.arrow_head.visible, "Arrow style wakes a settled edge")
	edge.show_arrow = true
	await settle()
	check(edge.arrow_head.visible, "Arrow style recovers without moving the camera")
	check(not edge.is_processing(), "Refreshed edge returns to sleep")
