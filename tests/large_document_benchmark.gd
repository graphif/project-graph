extends SceneTree

var app
var stage: Stage


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	root.size = Vector2i(1280, 800)
	for screen in DisplayServer.get_screen_count():
		if DisplayServer.screen_get_refresh_rate(screen) > DisplayServer.screen_get_refresh_rate(root.current_screen):
			root.current_screen = screen
	root.position = DisplayServer.screen_get_position(root.current_screen) + Vector2i(100, 100)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if OS.get_environment("PG_BENCH_VSYNC") == "1" else DisplayServer.VSYNC_DISABLED)
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
	if not await stage.load_from_file(path):
		push_error("Cannot load benchmark document")
		quit(1)
		return
	root.size = Vector2i(1280, 800)
	_disable_external_input(app)
	stage.get_viewport().physics_object_picking = false
	stage.select_ids(PackedStringArray())
	for object in stage.stage_objects():
		object.freeze = true
	stage.camera.zoom = stage.camera.target_zoom
	stage.camera.global_position = stage.camera.target_position
	for i in 20:
		await process_frame
	var environment := {"document":path,"objects":stage.stage_objects().size(), "zoom":stage.camera.zoom.x, "viewport":str(stage.get_viewport_rect().size), "groups":stage.group_overview._active.size(),
		"refresh":DisplayServer.screen_get_refresh_rate(root.current_screen), "size":str(root.size),
		"vsync":DisplayServer.window_get_vsync_mode(),"renderer":RenderingServer.get_current_rendering_method()}
	var camera_center: Vector2 = stage.camera.target_position
	var camera_zoom: Vector2 = stage.camera.target_zoom
	if OS.get_environment("PG_BENCH_LOCAL") == "1":
		camera_zoom = Vector2.ONE * 0.5
		stage.camera.zoom = camera_zoom
		stage.camera.target_zoom = camera_zoom
		stage.camera.global_position = camera_center
		for i in 20:
			await process_frame
	environment["zoom"] = stage.camera.zoom.x
	environment["groups"] = stage.group_overview._active.size()
	environment["mode"] = "local" if OS.get_environment("PG_BENCH_LOCAL") == "1" else "fit"
	print("LARGE_ENV ", JSON.stringify(environment))
	for phase in ["idle", "pan", "zoom"]:
		var intervals: Array[float] = []
		var start := Time.get_ticks_usec()
		var layout_start := stage.layout_revision
		var previous := start
		while Time.get_ticks_usec() - start < 2500000:
			var t := float(Time.get_ticks_usec() - start) / 1000000.0
			if phase == "pan":
				stage.camera.target_position = camera_center + Vector2(sin(t * 2) * 800, cos(t * 2) * 400)
			elif phase == "zoom":
				stage.camera.target_zoom = camera_zoom * (1.0 + 0.25 * sin(t * 2))
			await process_frame
			var now := Time.get_ticks_usec()
			intervals.append((now - previous) / 1000.0)
			previous = now
		intervals.sort()
		print("LARGE_RESULT ", JSON.stringify({"phase":phase,"fps":intervals.size() * 1000000.0 / (Time.get_ticks_usec() - start),
			"p95_ms":intervals[int(intervals.size() * .95)],
			"physics_ms":Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000,
			"layout_updates":stage.layout_revision - layout_start, "draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)}))
	if OS.get_environment("PG_BENCH_ABLATION") == "1":
		for mode in ["no_callbacks", "no_canvas"]:
			if mode == "no_callbacks":
				app.process_mode = Node.PROCESS_MODE_DISABLED
			else:
				stage.get_viewport().canvas_cull_mask = 2
			await process_frame
			var samples: Array[float] = []
			var start := Time.get_ticks_usec()
			var previous := start
			while Time.get_ticks_usec() - start < 2000000:
				await process_frame
				var now := Time.get_ticks_usec()
				samples.append((now - previous) / 1000.0)
				previous = now
			samples.sort()
			print("LARGE_ABLATION ", JSON.stringify({"mode":mode,
				"fps":samples.size() * 1000000.0 / (Time.get_ticks_usec() - start),
				"p95_ms":samples[int(samples.size() * .95)],
				"draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)}))
	if OS.get_environment("PG_BENCH_PROFILE") == "1":
		var routines := {
			"stage":func():stage._process(0.0),
			"layer_process":func():stage.get_node("EntityLayerMover")._process(0.0),
			"repulsion":func():stage.get_node("NodeRepulsion")._physics_process(.016),
			"main_frame":func():app._process(.00001),
			"layout":func():stage.get_node("EntityLayerMover").refresh_layout(),
			"overview":func():stage.group_overview.refresh(),
			"edges":func():
				for object in stage.stage_objects():
					if object is LineEdge:object._process(0.0),
			"captions":func():
				for object in stage.stage_objects():
					if object is LineEdge:object.get_node("Caption")._process(0.0),
			"ui_tick":func():app._process(0.31),
			"snapshot":func():JSON.stringify(StageObjectRegistry.capture(stage)),
		}
		for name in routines:
			var start := Time.get_ticks_usec()
			for i in 20:
				routines[name].call()
			print("LARGE_PROFILE ", JSON.stringify({"routine":name,"mean_ms":(Time.get_ticks_usec() - start) / 20000.0}))
	if OS.get_environment("PG_BENCH_PROFILE") == "1":
		for routine in ["overview_zoom", "edges_zoom"]:
			var elapsed := 0
			for i in 60:
				stage.camera.zoom = camera_zoom * (1.0 + float(i) / 200.0)
				stage.camera.force_update_scroll()
				var start := Time.get_ticks_usec()
				if routine == "overview_zoom":
					stage.group_overview.refresh()
				else:
					stage._process(0.0)
					for object in stage.stage_objects():
						if object is LineEdge and object.is_processing(): object._process(0.0)
				elapsed += Time.get_ticks_usec() - start
			print("LARGE_DYNAMIC ", JSON.stringify({"routine":routine, "mean_ms":elapsed / 60000.0}))
	var screenshot_path := OS.get_environment("PG_BENCH_SCREENSHOT")
	if not screenshot_path.is_empty():
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(screenshot_path)
	app.queue_free()
	await process_frame
	quit(0)


func _disable_external_input(node: Node) -> void:
	node.set_process_input(false)
	node.set_process_unhandled_input(false)
	node.set_process_unhandled_key_input(false)
	if node is Control:
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		_disable_external_input(child)
