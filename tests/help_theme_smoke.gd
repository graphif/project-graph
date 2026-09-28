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
	root.size = Vector2i(1280, 800)
	for i in 30:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	app._apply_preferences("theme", "latte")
	app.get_node("HelpActions").run("helpWhatsNew")
	for i in 8:
		await process_frame
	var window = app._window_ready["HelpWindow"]
	check(window.transparent_bg, "Help window allows themed embedded frame to show through")
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("/tmp/pg-help.png")
	print("HELP_THEME: ", "PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)
