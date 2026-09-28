extends SceneTree
const Palette = preload("res://src/main/theme_palette.gd")
const Corners = preload("res://src/main/continuous_corners.gd")
func _initialize() -> void:
	call_deferred("_run")
func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	root.size = Vector2i(1280, 800)
	for i in 30:
		await process_frame
	var failed := false
	for light in [false, true]:
		app._apply_preferences("theme", "light" if light else "mocha")
		var list = app.get_node("UIOverlay/Welcome/Margin/Content/Columns/Start/RecentList")
		list.show()
		list.get_parent().show()
		list.clear()
		list.add_item("项目草稿.prg")
		list.add_item("设计计划.prg")
		list.select(0)
		list.grab_focus()
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-welcome-" + str(light) + ".png")
		var theme: Theme = app._light_theme if light else app._dark_theme
		for state in ["hovered", "hovered_selected", "hovered_selected_focus", "selected", "selected_focus"]:
			var box = Corners.source(theme.get_stylebox(state, "ItemList"))
			var expected := Palette.color(light, "surface.hover" if state == "hovered" else "surface.selected")
			if box == null or not box.bg_color.is_equal_approx(expected):
				failed = true
				push_error("List state uses legacy background: " + state + " light=" + str(light))
	print("WELCOME_SELECTION: ", "FAIL" if failed else "PASS")
	quit(1 if failed else 0)
