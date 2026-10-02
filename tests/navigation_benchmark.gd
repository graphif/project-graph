extends Node
signal process_frame
var root: Window
var stage
var app
func _ready():
	root = get_tree().root
	get_tree().process_frame.connect(func(): process_frame.emit())
	call_deferred("_run")
func _run():
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 30:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	root.size = Vector2i(1280, 800)
	var uncapped := "--uncapped" in OS.get_cmdline_user_args()
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--screen="):
			root.current_screen = clampi(argument.trim_prefix("--screen=").to_int(), 0, DisplayServer.get_screen_count() - 1)
			root.position = DisplayServer.screen_get_position(root.current_screen) + Vector2i(200, 100)
	if uncapped:
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", false, false)
	for g in 6:
		var group = stage.create_text_node("分组 %d" % g, Vector2(g % 3 * 700, g / 3 * 400), false)
		group.fill_color = Color("#663355")
		group.freeze = true
		var previous
		for i in 4:
			var child = stage.create_text_node("任务 %d" % i, group.position + Vector2(i % 2 * 220, i / 2 * 100), false)
			child.freeze = true
			child.container = group
			if previous != null:
				stage.connect_entities(previous, child).text = "依赖"
			previous = child
	stage.select_ids(PackedStringArray())
	stage.camera.position = Vector2(800, 300)
	stage.camera.target_position = stage.camera.position
	stage.camera.zoom = Vector2.ONE * 0.4
	stage.camera.target_zoom = stage.camera.zoom
	for i in 30:
		await process_frame
	await get_tree().create_timer(2.0).timeout
	print("PERF_ENV ", JSON.stringify({"refresh":DisplayServer.screen_get_refresh_rate(root.current_screen), "vsync":DisplayServer.window_get_vsync_mode(),"max_fps":Engine.max_fps,"size":root.size}))
	for phase in ["idle", "pan", "zoom"]:
		var intervals: Array[float] = []
		var start = Time.get_ticks_usec()
		var previous = start
		while Time.get_ticks_usec() - start < 3000000:
			var t = float(Time.get_ticks_usec() - start) / 1000000.0
			if phase == "pan":
				stage.camera.target_position = Vector2(800,300) + Vector2(sin(t*2)*150,cos(t*2)*80)
			elif phase == "zoom":
				stage.camera.target_zoom = Vector2.ONE * (0.30 + 0.08 * sin(t*2))
			await process_frame
			var now = Time.get_ticks_usec()
			intervals.append((now - previous) / 1000.0)
			previous = now
		var elapsed = (Time.get_ticks_usec()-start)/1000000.0
		intervals.sort()
		print("PERF_RESULT ", JSON.stringify({"phase":phase,"fps":intervals.size()/elapsed,"p95_ms":intervals[int(intervals.size()*.95)]}))
	app.queue_free()
	await process_frame
	quit()

func quit():
	get_tree().quit()
