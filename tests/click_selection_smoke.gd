extends SceneTree
var failures: Array[String] = []
var stage: Stage
func _initialize() -> void:
	call_deferred("_run")
func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)
func settle() -> void:
	for i in 6:
		await physics_frame
		await process_frame
func click_world(point: Vector2, shift := false, ctrl := false, meta := false) -> void:
	var viewport := stage.get_viewport()
	var container := viewport.get_parent() as Control
	var local_point := stage.get_canvas_transform() * point
	var screen := container.get_global_transform_with_canvas() * (local_point * container.size / Vector2(viewport.size))
	var motion := InputEventMouseMotion.new()
	motion.position = screen
	motion.global_position = screen
	Input.parse_input_event(motion)
	Input.flush_buffered_events()
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	press.shift_pressed = shift
	press.ctrl_pressed = ctrl
	press.meta_pressed = meta
	press.position = screen
	press.global_position = screen
	Input.parse_input_event(press)
	Input.flush_buffered_events()
	await process_frame
	press = press.duplicate()
	press.pressed = false
	Input.parse_input_event(press)
	Input.flush_buffered_events()
	await settle()
func _run() -> void:
	root.size = Vector2i(1440,1000)
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	GraphPreferences.set_value("physics", false, false)
	GraphPreferences.set_value("left_mode", 0, false)
	stage = app.tabs.get_current_stage()
	var a := stage.create_text_node("A",Vector2(-220,0),false)
	var b := stage.create_text_node("B",Vector2(0,0),false)
	var c := stage.create_text_node("C",Vector2(220,0),false)
	for object in [a,b,c]: object.freeze = true
	stage.camera.position = Vector2.ZERO
	stage.camera.target_position = Vector2.ZERO
	stage.camera.zoom = Vector2.ONE * 2.0
	stage.camera.target_zoom = stage.camera.zoom
	await settle()
	stage.select_ids(PackedStringArray())
	await click_world(a.aabb.get_center())
	check(stage.selected_ids == PackedStringArray([a.id]), "Plain click selects a node")
	await click_world(b.aabb.get_center(),true)
	check(stage.selected_ids == PackedStringArray([a.id,b.id]), "Shift click adds a second node")
	await click_world(b.aabb.get_center(),true)
	check(stage.selected_ids == PackedStringArray([a.id,b.id]), "Shift clicking selected node does not deselect it")
	await click_world(a.aabb.get_center(),false,true)
	check(stage.selected_ids == PackedStringArray([a.id]), "Ctrl clicking an already selected node forces exclusive selection")
	await click_world(c.aabb.get_center(),false,true)
	check(stage.selected_ids == PackedStringArray([c.id]), "Ctrl clicking another node selects it exclusively")
	await click_world(a.aabb.get_center())
	await click_world(b.aabb.get_center(),true)
	await click_world(a.aabb.get_center())
	check(stage.selected_ids == PackedStringArray([a.id,b.id]), "Plain click within multi-selection preserves group dragging")
	await click_world(b.aabb.get_center(),true,true)
	check(stage.selected_ids == PackedStringArray([b.id]), "Ctrl has precedence over Shift")
	await click_world(c.aabb.get_center(),false,false,true)
	check(stage.selected_ids == PackedStringArray([c.id]), "Command follows exclusive selection")
	var group := stage.create_text_node("Group",Vector2(0,300),false)
	var leaf := stage.create_text_node("Member",Vector2(0,450),false)
	group.freeze = true
	leaf.freeze = true
	leaf.container = group
	stage.camera.zoom = Vector2.ONE * 0.5
	stage.camera.target_zoom = stage.camera.zoom
	await settle()
	check(stage.group_overview.is_active(group), "Fixture uses a real group preview")
	stage.select_ids(PackedStringArray([a.id]))
	await click_world(group.aabb.get_center(),true)
	check(stage.selected_ids == PackedStringArray([a.id,group.id]), "Shift click adds a group preview through native GUI input")
	await click_world(group.aabb.get_center(),false,true)
	check(stage.selected_ids == PackedStringArray([group.id]), "Ctrl click selects only the group preview")
	app.queue_free()
	await process_frame
	print("CLICK_SELECTION: ", "PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)
