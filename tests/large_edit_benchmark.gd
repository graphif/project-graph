extends SceneTree
var failures: Array[String] = []
var app: Node
var stage: Stage
var subject: TextNode

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	root.size = Vector2i(1280, 800)
	for screen in DisplayServer.get_screen_count():
		if DisplayServer.screen_get_refresh_rate(screen) > DisplayServer.screen_get_refresh_rate(root.current_screen):
			root.current_screen = screen
	root.position = DisplayServer.screen_get_position(root.current_screen) + Vector2i(100, 100)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if OS.get_environment("PG_EDIT_VSYNC") == "1" else DisplayServer.VSYNC_DISABLED)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 5:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	var path := OS.get_environment("PG_EDIT_DOCUMENT")
	if path.is_empty():
		path = "/home/waya/Desktop/project/教程操作.prg"
	GraphPreferences.set_value("physics", false, false)
	if not await stage.load_from_file(path):
		quit(2)
		return
	var all := stage.stage_objects()
	var original_hash := FileAccess.get_sha256(path)
	if OS.get_environment("PG_EDIT_PROFILE_HISTORY") == "1":
		var snapshot := stage.history._capture_snapshot()
		var copy := snapshot.duplicate(true)
		var compared := Time.get_ticks_usec()
		var same := stage.history._snapshots_equal(snapshot, copy)
		var compare_ms := (Time.get_ticks_usec() - compared) / 1000.0
		print("EDIT_HISTORY_COMPARE_MS: ", compare_ms, " equal=", same)
		if not same or compare_ms > 20.0:
			failures.append("History comparison exceeds 20 ms budget")
		compared = Time.get_ticks_usec()
		same = snapshot == copy
		print("EDIT_NATIVE_COMPARE_MS: ", (Time.get_ticks_usec() - compared) / 1000.0, " equal=", same)
	for object in all:
		if object is TextNode and not object._container_active and object.font_size <= 64 and not object.text.is_empty():
			subject = object
			break
	if OS.get_environment("PG_EDIT_GROUP") == "1":
		var largest := -1
		for object in all:
			if not object is TextNode or not object._container_active:
				continue
			var members := 0
			for other in all:
				if other is Entity and other.is_inside_container(object):
					members += 1
			if members > largest:
				subject = object
				largest = members
		print("EDIT_GROUP_MEMBERS: ", largest)
	stage.camera.target_position = subject.aabb.get_center()
	stage.camera.position = subject.aabb.get_center()
	stage.camera.target_zoom = Vector2.ONE * (0.05 if OS.get_environment("PG_EDIT_GROUP") == "1" else 1.0)
	stage.camera.zoom = stage.camera.target_zoom
	for i in 15:
		await process_frame
	var enable_physics := OS.get_environment("PG_EDIT_NO_PHYSICS") != "1"
	GraphPreferences.set_value("physics", enable_physics, false)
	stage.get_viewport().physics_object_picking = false
	print("EDIT_ENV: ", JSON.stringify({"objects": all.size(), "physics": enable_physics, "subject": subject.text, "refresh": DisplayServer.screen_get_refresh_rate(root.current_screen), "vsync": DisplayServer.window_get_vsync_mode()}))
	# Use the same native button path as a real selection/drag.
	_motion(subject.aabb.get_center())
	var press := InputEventMouseButton.new()
	press.position = _screen(subject.aabb.get_center())
	press.global_position = press.position
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	var begin := Time.get_ticks_usec()
	Input.parse_input_event(press)
	Input.flush_buffered_events()
	subject._on_input_event(stage.get_viewport(), press, 0)
	print("EDIT_BEGIN_MS: ", (Time.get_ticks_usec() - begin) / 1000.0)
	var original_positions := {}
	for object in all:
		if object is Entity: original_positions[object] = object.global_position
	var subject_origin := subject.global_position
	var origin := subject.aabb.get_center()
	await _measure("drag", func(t: float): _motion(origin + Vector2(sin(t * 3) * 80, cos(t * 3) * 50) / stage.camera.zoom.x))
	subject.finish_drag(false)
	press = press.duplicate()
	press.pressed = false
	Input.parse_input_event(press)
	Input.flush_buffered_events()
	await _measure("settle", func(_t: float): pass)
	var displacement := subject.global_position - subject_origin
	if displacement.length() < 20.0:
		failures.append("Benchmark drag did not move its subject")
	for object in original_positions:
		if object.is_inside_container(subject) and not object.global_position.is_equal_approx(original_positions[object] + displacement):
			failures.append("Group member did not follow the measured drag")
	print("EDIT_REAL_MOVEMENT: ", displacement.length(), " group_members_checked=", original_positions.keys().filter(func(object):return object.is_inside_container(subject)).size())
	var finish := Time.get_ticks_usec()
	stage.history._finish_commit()
	print("EDIT_COMMIT_MS: ", (Time.get_ticks_usec() - finish) / 1000.0)
	GraphPreferences.set_value("physics", false, false)
	for object in stage.stage_objects():
		if object is Entity:
			object.stop_throw()
	var edit_begin := Time.get_ticks_usec()
	subject.enter_edit_mode()
	print("EDIT_TEXT_BEGIN_MS: ", (Time.get_ticks_usec() - edit_begin) / 1000.0)
	GraphPreferences.set_value("physics", enable_physics, false)
	var next := {"usec": Time.get_ticks_usec()}
	await _measure("typing", func(_t: float):
		if Time.get_ticks_usec() >= next.usec:
			subject.text_edit.insert_text_at_caret("测试")
			next.usec = Time.get_ticks_usec() + 150000)
	GraphPreferences.set_value("physics", false, false)
	subject.exit_edit_mode(false)
	for i in 5:
		await process_frame
	if FileAccess.get_sha256(path) != original_hash:
		failures.append("Source document changed")
	app.queue_free()
	await process_frame
	print("EDIT_PERFORMANCE: ", "PASS" if failures.is_empty() else str(failures))
	quit(0 if failures.is_empty() else 1)

func _measure(name: String, step: Callable) -> void:
	var started := Time.get_ticks_usec()
	var previous := started
	var samples: Array[float] = []
	while Time.get_ticks_usec() - started < 1200000:
		step.call((Time.get_ticks_usec() - started) / 1000000.0)
		await process_frame
		var now := Time.get_ticks_usec()
		samples.append((now - previous) / 1000.0)
		previous = now
	samples.sort()
	var p95 := samples[mini(samples.size() - 1, int(samples.size() * 0.95))]
	print("EDIT_RESULT: ", JSON.stringify({"phase": name, "fps": samples.size() * 1000000.0 / (Time.get_ticks_usec() - started), "p95_ms": p95, "max_ms": samples.back()}))
	if name == "drag" and p95 > 33.34:
		failures.append(name + " exceeds 33.34 ms frame budget")

func _screen(point: Vector2) -> Vector2:
	var viewport := stage.get_viewport()
	var container := viewport.get_parent() as Control
	return container.get_global_transform_with_canvas() * ((stage.get_canvas_transform() * point) * container.size / Vector2(viewport.size))

func _motion(point: Vector2) -> void:
	root.warp_mouse(_screen(point))
	var motion := InputEventMouseMotion.new()
	motion.position = _screen(point)
	motion.global_position = motion.position
	Input.parse_input_event(motion)
	Input.flush_buffered_events()
