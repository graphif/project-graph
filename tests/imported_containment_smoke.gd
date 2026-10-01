extends SceneTree
var failures: Array[String] = []
func _initialize() -> void:
	call_deferred("_run")
func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)
func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 4: await process_frame
	GraphPreferences.set_value("physics", false, false)
	var stage: Stage = app.tabs.get_current_stage()
	var path := OS.get_environment("PG_CONTAIN_FIXTURE")
	var temporary := path.is_empty()
	if temporary:
		path = "/tmp/pg-containment-smoke.prg"
		var records := [{"type":"text_node", "transform":{"position":[0.0,0.0]}, "properties":{"id":JSON.from_native("group"), "text":JSON.from_native("视野操作方法")}}]
		for i in 12:
			records.append({"type":"text_node", "transform":{"position":[float(i % 4) * 200.0, float(i / 4) * 150.0]}, "properties":{"id":JSON.from_native("child-%d" % i), "text":JSON.from_native("Member %d" % i), "container":{"$ref":"group"}}})
		records.append({"type":"line_edge","transform":{"position":[0.0,0.0]}, "properties":{"id":JSON.from_native("inner-edge"),"source":{"$ref":"child-0"},"target":{"$ref":"child-1"},"text":JSON.from_native("内部关系")}})
		check(ProjectFile.save(path, {"objects":records}, {"position":[300.0,180.0], "zoom":1.0}).ok, "Fixture saves")
	var source_hash := FileAccess.get_sha256(path)
	check(await stage.load_from_file(path), "Document loads")
	var group: TextNode
	var members: Array[Entity] = []
	for object in stage.stage_objects():
		if object is TextNode and object.text == "视野操作方法": group = object
	check(group != null, "Original section survives")
	for object in stage.stage_objects():
		if object is Entity and object.container == group: members.append(object)
	check(members.size() == 12, "All twelve source members keep their containment references")
	var bounds := Rect2()
	for i in members.size():
		bounds = members[i].aabb if i == 0 else bounds.merge(members[i].aabb)
	var rendered: Rect2 = group.container_panel.get_global_transform() * Rect2(Vector2.ZERO, group.container_panel.size)

	check(rendered.encloses(bounds), "Rendered group frame encloses its members")
	check(group.aabb.encloses(bounds), "Physics group bounds enclose its members")
	stage.history.clear()
	var before := StageObjectRegistry.capture(stage)
	var document_revision := stage.document_revision
	var inner_edge: LineEdge
	for object in stage.stage_objects():
		if object is LineEdge and is_instance_valid(object.source) and is_instance_valid(object.target) and object.source.is_inside_container(group) and object.target.is_inside_container(group):
			inner_edge = object
			break
	stage.camera.zoom = Vector2.ONE * 0.1
	stage.camera.target_zoom = stage.camera.zoom
	for i in 8: await process_frame
	check(stage.group_overview.is_active(group), "Dragged group uses its preview")
	var originals := {}
	for object in members: originals[object] = object.global_position
	var old_position := group.global_position
	var displacement := Vector2(700,80)
	stage.select_ids(PackedStringArray([group.id]))
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	Input.parse_input_event(press)
	group._on_input_event(stage.get_viewport(), press, 0)
	group.set_physics_process(false)
	for object in group._drag_origins:
		object._drag_target = group._drag_origins[object] + displacement
	
	for i in 8:
		await physics_frame
		await process_frame
	for object in members:
		check(object.global_position.is_equal_approx(originals[object] + displacement), "Group movement carries member " + object.id)
	rendered = group.container_panel.get_global_transform() * Rect2(Vector2.ZERO, group.container_panel.size)
	for object in members: check(rendered.encloses(object.aabb), "Moved group encloses member")
	stage.camera.zoom = Vector2.ONE * 2.0
	stage.camera.target_zoom = stage.camera.zoom
	for i in 8: await process_frame
	if inner_edge != null:
		var source_rect := LineEdge.connection_rect(inner_edge.source, inner_edge.target)
		var target_rect := LineEdge.connection_rect(inner_edge.target, inner_edge.source)
		var expected := LineEdge.anchor(source_rect, LineEdge.connection_uvs(source_rect,target_rect)[0])
		check(not inner_edge._shaft_points.is_empty() and inner_edge._shaft_points[0].distance_to(expected) < 0.1, "Hidden internal edge rebuilds at the moved endpoint when revealed")
	check(stage.document_revision > document_revision and stage.is_dirty(), "Native physics drag invalidates document state")
	group.pause_drag_for_layer_move()
	stage.history._finish_commit()
	var after := StageObjectRegistry.capture(stage)
	check(stage.history._undo_stack.size() == 1, "Group gesture has one history entry")
	await stage.history.undo()
	for i in 8:
		await physics_frame
		await process_frame
	check(StageObjectRegistry.capture(stage) == before, "Undo restores group and all member positions")
	await stage.history.redo()
	for i in 8:
		await physics_frame
		await process_frame
	check(StageObjectRegistry.capture(stage) == after, "Redo restores group and all member positions")
	check(FileAccess.get_sha256(path) == source_hash, "Source document is not modified")
	if temporary: DirAccess.remove_absolute(path)
	app.queue_free()
	await process_frame
	print("IMPORTED_CONTAINMENT: ", "PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)
