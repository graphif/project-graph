extends SceneTree
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _run() -> void:
	GraphPreferences._loaded = true
	GraphPreferences.set_value("theme", "latte", false)
	var begin := Time.get_ticks_usec()
	change_scene_to_file("res://src/boot/boot.tscn")
	var app: Node
	var deadline := Time.get_ticks_msec() + 10000
	while Time.get_ticks_msec() < deadline:
		await process_frame
		app = current_scene
		if app != null and app.scene_file_path == "res://src/main/main.tscn" and app.get("_startup_theme_done"):
			break
	if app == null or app.scene_file_path != "res://src/main/main.tscn":
		push_error("Startup did not reach workspace")
		quit(1)
		return
	await RenderingServer.frame_post_draw
	print("STARTUP_LAZY_MS: ", (Time.get_ticks_usec() - begin) / 1000.0)
	check(app._window_ready.is_empty(), "No unused floating windows are instantiated during startup")
	for name in ["SettingsWindow", "HelpWindow", "QuickOpenWindow", "FindWindow", "CommandPalette"]:
		check(not ResourceLoader.has_cached("res://src/main/windows/" + name + ".tscn"), "No eager scene load: " + name)
	app.get_node("HelpActions").run("helpQuickStart")
	check(app.get_node("HelpActions").window.visible, "Help lazily opens with connected controls")
	app.get_node("HelpActions").window.hide()
	app.get_node("FileActions").run("quickOpen")
	check(app.get_node("FileActions").quick_window.visible, "Quick Open lazily opens")
	app.get_node("FileActions").quick_window.hide()
	for name in ["FindWindow", "OutlineWindow", "ReferencesWindow", "RecentFilesWindow", "CommandPalette", "GenerateNodeWindow", "ColorWindow"]:
		app._show_panel(name)
		var window: Window = app._window_ready[name]
		check(window.visible, "First open succeeds: " + name)
		window.hide()
		app._show_panel(name)
		check(app._window_ready[name] == window, "Repeated open reuses instance: " + name)
		window.hide()
	app._show_settings(0)
	check(app._settings_ready, "Settings initialize on first open")
	app.get_node("UIOverlay/SettingsWindow").hide()
	app.queue_free()
	await process_frame
	print("STARTUP_LAZY_WINDOWS: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
