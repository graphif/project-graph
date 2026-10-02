extends "res://tests/large_document_benchmark.gd"

# Actual magnify events, broad scale crossings, unchanged document and positions.
# PG_ZOOM_ABLATION: overview, edges, captions, callbacks, canvas.
func _run() -> void:
	root.size = Vector2i(1280, 800)
	for screen in DisplayServer.get_screen_count():
		if DisplayServer.screen_get_refresh_rate(screen) > DisplayServer.screen_get_refresh_rate(root.current_screen):
			root.current_screen = screen
	root.position = DisplayServer.screen_get_position(root.current_screen) + Vector2i(100, 100)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 8:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	_disable_external_input(app)
	var path := OS.get_environment("PG_BENCH_DOCUMENT")
	if path.is_empty():
		path = "/home/waya/Desktop/project/教程操作.prg"
	var original_hash := FileAccess.get_sha256(path)
	if not await stage.load_from_file(path):
		push_error("Cannot load zoom benchmark document")
		quit(1)
		return
	_disable_external_input(app)
	stage.camera.set_process_input(true)
	stage.get_viewport().physics_object_picking = false
	stage.select_ids(PackedStringArray())
	var positions := {}
	for object in stage.stage_objects():
		object.freeze = true
		positions[object] = object.global_position
	var center: Vector2 = stage.camera.target_position
	var revision := stage.layout_revision
	var ablation := OS.get_environment("PG_ZOOM_ABLATION")
	if ablation == "overview":
		stage.group_overview.set_process(false)
	elif ablation == "edges" or ablation == "captions":
		for object in stage.stage_objects():
			if object is LineEdge:
				if ablation == "edges":
					object.set_process(false)
				else:
					object.get_node("Caption").set_process(false)
	elif ablation == "callbacks":
		app.process_mode = Node.PROCESS_MODE_DISABLED
		stage.process_mode = Node.PROCESS_MODE_ALWAYS
		stage.set_process(false)
		for child in stage.get_children():
			child.process_mode = Node.PROCESS_MODE_DISABLED
		stage.camera.process_mode = Node.PROCESS_MODE_ALWAYS
	elif ablation == "canvas":
		stage.get_viewport().canvas_cull_mask = 2
	print("ZOOM_ENV ", JSON.stringify({"objects":positions.size(), "ablation":ablation,
		"renderer":RenderingServer.get_current_rendering_method(),
		"refresh":DisplayServer.screen_get_refresh_rate(root.current_screen)}))
	var failed := false
	for phase in ["local", "wide_cold", "wide_warm"]:
		var minimum := .35 if phase == "local" else .025
		var maximum := .75 if phase == "local" else 1.5
		stage.camera.target_zoom = Vector2.ONE * minimum
		stage.camera.zoom = stage.camera.target_zoom
		stage.camera.global_position = center
		stage.camera.target_position = center
		for i in 30:
			await process_frame
		var samples: Array[float] = []
		var spikes: Array = []
		var start := Time.get_ticks_usec()
		var previous := start
		while Time.get_ticks_usec() - start < 3000000:
			var t := float(Time.get_ticks_usec() - start) / 1000000.0
			var wave := (1.0 - cos(t * TAU / 1.5)) * .5
			var desired := exp(lerp(log(minimum), log(maximum), wave))
			var event := InputEventMagnifyGesture.new()
			event.factor = desired / stage.camera.target_zoom.x
			event.position = stage.get_viewport_rect().size * .5
			stage.get_viewport().push_input(event, true)
			if not is_equal_approx(stage.camera.target_zoom.x, desired):
				push_error("Magnify event did not update camera zoom")
				failed = true
				break
			await process_frame
			var now := Time.get_ticks_usec()
			var ms := (now - previous) / 1000.0
			samples.append(ms)
			if ms > 16.67:
				spikes.append({"ms":ms, "zoom":stage.camera.zoom.x,
					"groups":stage.group_overview._active.size()})
			previous = now
		if samples.is_empty():
			failed = true
			continue
		samples.sort()
		print("ZOOM_RESULT ", JSON.stringify({"phase":phase,
			"fps":samples.size() * 1000000.0 / (Time.get_ticks_usec() - start),
			"p95_ms":samples[int(samples.size() * .95)], "p99_ms":samples[int(samples.size() * .99)],
			"max_ms":samples[-1],
			"over_8ms":samples.filter(func(ms):return ms > 8.34).size(),
			"over_16ms":spikes.size(), "samples":samples.size(), "spikes":spikes.slice(0,12)}))
		var strict := OS.get_environment("PG_ZOOM_STRICT") == "1"
		if strict and (samples[int(samples.size() * .95)] > 8.34 or samples[int(samples.size() * .99)] > 16.67):
			failed = true
	for object in positions:
		if not object.global_position.is_equal_approx(positions[object]):
			push_error("Zoom moved a document object")
			failed = true
	if stage.layout_revision != revision or FileAccess.get_sha256(path) != original_hash:
		push_error("Zoom changed geometry or the source document")
		failed = true
	app.queue_free()
	await process_frame
	quit(1 if failed else 0)
