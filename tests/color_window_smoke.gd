extends SceneTree
var failed := false
func check(ok: bool, message: String) -> void:
	if not ok:
		failed = true
		push_error(message)
func _initialize() -> void:
	call_deferred("_run")
func _run() -> void:
	var window = load("res://src/main/windows/ColorWindow.tscn").instantiate()
	var panel = window.get_node("Margin/Content")
	check(window.transparent_bg, "Color window must use themed embedded background")
	check(panel.get_node_or_null("Picker") == null, "Color wheel must be absent")
	check(panel.get_node_or_null("ColorRow/Hex") != null, "Hex input must exist")
	check(panel.get_node_or_null("ColorRow/Preview") != null, "Preview must exist")
	check(panel.get_node_or_null("Hint") != null, "Validation hint must exist")
	for swatch in panel.get_node("Palette").get_children():
		check(swatch.has_meta("palette_name"), "Swatch needs palette metadata: " + str(swatch.name))
	window.free()
	if not failed:
		await _exercise_window()
	print("COLOR_WINDOW: ", "FAIL" if failed else "PASS")
	quit(1 if failed else 0)

func _exercise_window() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	root.size = Vector2i(1280, 800)
	for i in 30:
		await process_frame
	var stage = app.tabs.get_current_stage()
	var node = stage.create_text_node("颜色测试", Vector2.ZERO, false)
	node.freeze = true
	var node_id = node.id
	var original: Color = node.fill_color
	for light in [false, true]:
		app._apply_preferences("theme", "light" if light else "mocha")
		app._show_panel("ColorWindow")
		var panel = app._panel("ColorWindow")
		var unique_colors := {}
		for swatch in panel.get_node("Palette").get_children():
			var expected: Color = swatch.get_meta("palette_color")
			var style = preload("res://src/main/continuous_corners.gd").source(swatch.get_theme_stylebox("normal"))
			check(style.bg_color.is_equal_approx(expected), "Swatch displays its actual palette color")
			unique_colors[expected.to_html()] = true
		check(unique_colors.size() == 14, "All fourteen palette colors remain distinct")
		panel.get_node("Palette/Blue").pressed.emit()
		check(panel.get_node("ColorRow/Preview").color.is_equal_approx(panel.get_node("Palette/Blue").get_meta("palette_color")), "Swatch updates preview")
		panel.get_node("ColorRow/Hex").text = "invalid"
		check(not app._update_color_input() and panel.get_node("Apply").disabled, "Invalid hex cannot apply")
		panel.get_node("ColorRow/Hex").text = "#fab387"
		check(app._update_color_input(), "Valid hex accepted")
		for i in 20:
			await process_frame
		check(panel.get_node("Reset").get_global_rect().end.y <= app._window_ready["ColorWindow"].size.y, "Reset button fits inside dialog")
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-color-" + str(light) + ".png")
	app._apply_color()
	for i in 12:
		await physics_frame
	check(node.fill_color.is_equal_approx(Color("#fab387")), "Applying updates selected node")
	await stage.history.undo()
	for i in 8:
		await physics_frame
	for object in stage.stage_objects():
		if object.id == node_id:
			check(object.fill_color.is_equal_approx(original), "Undo restores original fill")
