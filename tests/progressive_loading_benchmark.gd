extends SceneTree
var done := false
var succeeded := false


func _initialize() -> void:
	call_deferred("_run")


func _load(stage: Stage, path: String) -> void:
	succeeded = await stage.load_from_file(path)
	done = true


func _run() -> void:
	root.size = Vector2i(1280, 800)
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 5:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	var stage: Stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", false, false)
	var path := OS.get_environment("PG_LOAD_DOCUMENT")
	if path.is_empty():
		path = "/home/waya/Desktop/project/教程操作.prg"
	var expected: int = ProjectFile.load(path).graph.objects.size()
	var hash_before := FileAccess.get_sha256(path)
	var started := Time.get_ticks_usec()
	var previous_frame := started
	var first_usec := 0
	var partial_frames := 0

	var intervals: Array[float] = []
	_capture_preview_later(OS.get_environment("PG_LOAD_PREVIEW_SCREENSHOT"))
	_load(stage, path)
	while not done:
		await process_frame
		var now := Time.get_ticks_usec()
		intervals.append((now - previous_frame) / 1000.0)
		previous_frame = now

		var count := stage.stage_objects().size()
		if count > 0 and count < expected:
			partial_frames += 1
			if first_usec == 0 and stage.stage_objects()[0].modulate.a > 0.01:
				first_usec = now - started
	var total_ms := (Time.get_ticks_usec() - started) / 1000.0
	intervals.sort()
	var screenshot := OS.get_environment("PG_LOAD_SCREENSHOT")
	if not screenshot.is_empty():
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(screenshot)
	var valid: bool = succeeded and not stage.is_dirty() and stage.stage_objects().size() == expected
	for object in stage.stage_objects():
		if object is LineEdge:
			valid = valid and is_instance_valid(object.source) and is_instance_valid(object.target)
			valid = valid and object.line.material == null and is_equal_approx(object.arrow_head.modulate.a, 1.0)
	valid = valid and FileAccess.get_sha256(path) == hash_before
	print("LOAD_BENCHMARK: ", JSON.stringify({"file": path.get_file(), "objects": expected,
		"first_visible_ms": first_usec / 1000.0, "total_ms": total_ms, "partial_frames": partial_frames,
		"frame_p95_ms": intervals[int(intervals.size() * .95)], "frame_max_ms": intervals.back(),
		"valid": valid, "scheduled_view_complete_ms": stage.get_meta("load_view_complete_usec", 0) / 1000.0}))
	app.queue_free()
	await process_frame
	quit(0 if valid else 1)


func _capture_preview_later(path: String) -> void:
	if path.is_empty():
		return
	await create_timer(2.4).timeout
	await process_frame
	root.get_texture().get_image().save_png(path)
