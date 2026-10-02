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

	var dialog = app.get_node("UIOverlay/UnsavedDialog")
	for mode in ["latte", "mocha"]:
		dialog.hide()
		app._apply_preferences("theme", mode)
		app._on_close_requested(app.tabs.get_current_stage().get_parent().get_parent())
		await process_frame
		check(dialog.theme == (app._light_theme if mode == "latte" else app._dark_theme), "Hidden save dialog refreshes theme before display: " + mode)
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-save-" + mode + ".png")
		dialog.hide()
	print("SAVE_DIALOG: ", "PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)
