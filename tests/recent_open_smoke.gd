extends SceneTree

const FIXTURE := "/tmp/pg-recent-open-smoke.prg"
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _run() -> void:
	if not OS.get_user_data_dir().begins_with("/tmp/pg-test-data/"):
		push_error("Run this test with XDG_DATA_HOME=/tmp/pg-test-data to isolate preferences.")
		quit(2)
		return
	GraphPreferences._loaded = true
	GraphPreferences.set_value("theme", "latte", false)
	GraphPreferences.set_value("physics", false, false)
	var objects: Array[Dictionary] = []
	for i in 8:
		var node := StageObjectRegistry.get_scene("text_node").instantiate() as TextNode
		node.text = "节点 %d" % i
		node.position = Vector2((i % 4) * 220 - 330, (i / 4) * 160 - 80)
		node.fill_color = Color("#89b4fa")
		objects.append(StageObjectRegistry._serialize_object(node))
		node.free()
	check(ProjectFile.save(FIXTURE, {"objects": objects}, {"position": [0, 0], "zoom": 1.0}).ok, "Write isolated fixture")
	GraphPreferences.set_recent(PackedStringArray([FIXTURE]))
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	root.size = Vector2i(1280, 800)
	for frame in 20:
		await process_frame
	app._show_panel("RecentFilesWindow")
	for frame in 5:
		await process_frame
	var before_tabs: int = app.tabs.get_tab_count()
	var started := Time.get_ticks_usec()
	app._open_recent(0)
	var click_ms := (Time.get_ticks_usec() - started) / 1000.0
	var max_frame_ms := 0.0
	var previous := Time.get_ticks_usec()
	for frame in 20:
		await process_frame
		var now := Time.get_ticks_usec()
		max_frame_ms = maxf(max_frame_ms, (now - previous) / 1000.0)
		previous = now
	var loaded: Stage = app.tabs.get_current_stage()
	check(not app.get_node("UIOverlay/RecentFilesWindow").visible, "Recent window closes")
	check(app.tabs.get_tab_count() == before_tabs + 1, "Open exactly one tab")
	check(loaded.current_file_path == FIXTURE and loaded.stage_objects().size() == 8, "Restore all nodes")
	check(not loaded.is_dirty(), "Opening does not dirty the document")
	print("RECENT_OPEN_METRICS: ", JSON.stringify({"click_ms": click_ms, "max_frame_ms": max_frame_ms, "sampling": loaded.get_viewport().oversampling_override}))
	app._open_welcome_recent(0)
	for frame in 3:
		await process_frame
	check(app.tabs.get_tab_count() == before_tabs + 1, "Reopening reuses the tab")
	app.queue_free()
	await process_frame
	DirAccess.remove_absolute(FIXTURE)
	print("RECENT_OPEN: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
