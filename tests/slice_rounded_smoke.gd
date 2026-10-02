extends SceneTree
var failures: Array[String] = []
func _initialize() -> void:
	call_deferred("_run")
func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)
func area(polygon: PackedVector2Array) -> float:
	var value := 0.0
	for i in polygon.size():
		value += polygon[i].cross(polygon[(i + 1) % polygon.size()])
	return absf(value) / 2.0
func _run() -> void:
	root.size = Vector2i(1280, 800)
	var app: Node = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for frame in 15:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	GraphPreferences.set_value("physics", false, false)
	GraphPreferences.set_value("effects", true, false)
	var stage: Stage = app.tabs.get_current_stage()
	stage.apply_preferences()
	stage.group_overview.camera_scale_threshold = .001
	var entity := stage.create_text_node("切片圆角", Vector2.ZERO, false)
	entity.fixed_width = 300.0
	entity.fill_color = Color("#cba6f7")
	entity.freeze = true
	for frame in 5:
		await process_frame
	var slicer: StageObjectSlicer = stage.get_node("StageObjectSlicer")
	var polygon := PackedVector2Array()
	for point in entity.get_visual_outline():
		polygon.append(entity.to_global(point))
	var bounds := entity.aabb
	var center := bounds.get_center()
	var before := JSON.stringify(StageObjectRegistry.capture(stage))
	for interior in [false, true]:
		slicer._slice_start = center - Vector2(bounds.size.x, bounds.size.y)
		slicer._slice_end = center if interior else center + Vector2(bounds.size.x, bounds.size.y)
		slicer._spawn_split_effect(entity)
		check(slicer._fragments.size() == (4 if interior else 2), "Two halves or four interior fragments")
		var total := 0.0
		var curved := false
		for effect in slicer._fragments:
			var fragment: Node2D = effect.node
			var surface: Polygon2D = fragment.get_child(0)
			var outline: Line2D = fragment.get_child(1)
			total += area(surface.polygon)
			curved = curved or surface.polygon.size() > 8
			check(outline.points == surface.polygon, "Surface and border share the cut outline")
			for point in surface.polygon:
				var world := fragment.to_global(point)
				var closest := INF
				for i in polygon.size():
					closest = minf(closest, Geometry2D.get_closest_point_to_segment(world, polygon[i], polygon[(i + 1) % polygon.size()]).distance_to(world))
				check(Geometry2D.is_point_in_polygon(world, polygon) or closest < .01, "Fragments remain within the visible rounded outline")
		check(curved, "Rounded outer edges survive cutting")
		check(absf(total - area(polygon)) < 1.0, "Cut pieces preserve the original visible area")
		check(JSON.stringify(StageObjectRegistry.capture(stage)) == before, "Transient fragments do not change persistent data")
		if not interior:
			slicer.set_process(false)
			for effect in slicer._fragments:
				effect.node.global_position += effect.velocity.normalized() * 12.0
			entity.hide()
			stage.camera.position = center
			stage.camera.target_position = center
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png("/tmp/pg-rounded-slice.png")
			entity.show()
			slicer.set_process(true)
		slicer._update_effects(1.0)
		check(slicer._fragments.is_empty(), "Fragments expire after their animation")
		await process_frame
	app.queue_free()
	await process_frame
	print("SLICE_ROUNDED: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
