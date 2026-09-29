extends SceneTree

const Corners = preload("res://src/main/continuous_corners.gd")
const Palette = preload("res://src/main/theme_palette.gd")
var failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)


func capture(path: String) -> void:
	for frame in 5:
		await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(path)


func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	root.size = Vector2i(1440, 960)
	for frame in 15:
		await process_frame
	app.get_node("UIOverlay/Welcome").hide()
	var stage: Stage = app.tabs.get_current_stage()
	var left := stage.create_text_node("连续圆角 · 节点", Vector2(-180, -60), false)
	var right := stage.create_text_node("文字与边框保持清晰", Vector2(220, 90), false)
	var group := stage.create_text_node("分组", Vector2(200, 100), false)
	right.container = group
	for node in [left, right, group]:
		node.freeze = true
	left.fill_color = Color("#89b4fa")
	group.fill_color = Color("#f5c2e7")
	stage.get_node("EntityLayerMover").refresh_layout()
	var edge := stage.connect_entities(left, right)
	edge.text = "连接关系"
	stage.select_ids(PackedStringArray([left.id]))
	stage.camera.target_position = Vector2(50, 40)
	stage.camera.position = stage.camera.target_position
	app.get_node("DockAutoHide").set_process(false)
	var docks := [app.get_node("UIOverlay/BottomToolbar"), app.get_node("UIOverlay/QuickSettings")]
	for dock in docks:
		dock.show()
		dock.modulate.a = 1.0
	var before := JSON.stringify(StageObjectRegistry.capture(stage))
	for light in [false, true]:
		GraphPreferences.set_value("theme", "light" if light else "mocha", false)
		app._apply_preferences("theme", "light" if light else "mocha")
		for frame in 3:
			await process_frame
		var theme: Theme = app._light_theme if light else app._dark_theme
		# 大表面保持连续圆角九宫格。
		for pair in [["Panel", "panel"], ["PopupMenu", "panel"], ["Window", "embedded_border"]]:
			var style: StyleBox = theme.get_stylebox(pair[1], pair[0])
			check(style is StyleBoxTexture, "Native continuous style: " + str(pair))
			check(Corners.source(style) != null, "Retain source style for palette changes")
		# 小控件复用 SVG 抗锯齿，并保留组件声明的较小半径。
		var button_style: StyleBox = theme.get_stylebox("normal", "Button")
		check(button_style is StyleBoxTexture, "Small controls use the shared antialiased style")
		check(Corners.source(button_style).corner_radius_top_left > 0 and Corners.source(button_style).corner_radius_top_left <= int(Corners.CONTROL), "Small controls retain a bounded component radius")
		for dock in docks:
			var dock_box := dock.get_theme_stylebox("panel") as StyleBoxTexture
			check(dock_box != null, "Visible Dock uses continuous theme")
			if dock_box != null:
				check(dock.size.y + dock_box.expand_margin_top + dock_box.expand_margin_bottom >= dock_box.texture_margin_top + dock_box.texture_margin_bottom,
					"Dock vertical nine-patch cuts do not overlap")
		var node_style := left.label.get_theme_stylebox("normal")
		check(node_style is StyleBoxTexture, "Node uses continuous corners")
		check_node_corners(left)
		check(Corners.source(theme.get_stylebox("panel", "PopupMenu")).corner_radius_top_left == int(Corners.PANEL), "Menu uses PANEL preset radius")
		check(Corners.source(theme.get_stylebox("panel", "PopupMenu")).bg_color.a > 0.0, "Menu keeps opaque background")
		check(JSON.stringify(StageObjectRegistry.capture(stage)) == before, "Visual style does not mutate graph")
		if DisplayServer.get_name() != "headless":
			var name := "latte" if light else "mocha"
			for zoom in [0.5, 1.0, 2.0]:
				stage.camera.target_zoom = Vector2.ONE * zoom
				stage.camera.zoom = stage.camera.target_zoom
				await capture("/tmp/pg-rounded-%s-zoom-%s.png" % [name, zoom])
			stage.camera.target_zoom = Vector2.ONE
			stage.camera.zoom = Vector2.ONE
			app._show_panel("SettingsWindow")
			await capture("/tmp/pg-rounded-%s-settings.png" % name)
			app.get_node("UIOverlay/SettingsWindow").hide()
			app._show_panel("CommandPalette")
			await capture("/tmp/pg-rounded-%s-command.png" % name)
			app.get_node("UIOverlay/CommandPalette").hide()
			var menu: PopupMenu = app.get_node("VBoxContainer/Header/MenuBar/file")
			menu.position = Vector2i(80, 100)
			menu.popup()
			await capture("/tmp/pg-rounded-%s-menu.png" % name)
			check(menu.visible and menu.item_count > 0, "File menu visible during capture")
			menu.hide()
	# Geometry changes must refresh the cuts without a theme/color refresh.
	for value in ["i", "Project Graph", "line one\nline two\nline three"]:
		left.text = value
		for frame in 3:
			await process_frame
		check_node_corners(left)
	for value in [8, 24, 64]:
		left.font_size = value
		for frame in 3:
			await process_frame
		check_node_corners(left)
	right.position += Vector2(180, 120)
	stage.get_node("EntityLayerMover").refresh_layout()
	for frame in 3:
		await process_frame
	check_node_corners(group)
	var small := Corners.outline(Rect2(0, 0, 10, 8), Corners.NODE)
	for point in small:
		check(point.x >= -0.001 and point.y >= -0.001 and point.x <= 10.001 and point.y <= 8.001, "Small outline clamps to bounds")
	var flat := StyleBoxFlat.new()
	flat.bg_color = Color("#89b4fa")
	flat.set_content_margin_all(3)
	var first := Corners.style(flat, Corners.NODE) as StyleBoxTexture
	var second := Corners.style(flat, Corners.NODE) as StyleBoxTexture
	check(first.texture == second.texture, "Equivalent shapes reuse cached textures")
	check(first.get_minimum_size() == flat.get_minimum_size(), "Preserve native content layout")
	app.queue_free()
	await process_frame
	print("CONTINUOUS_CORNERS: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)


func check_node_corners(node: TextNode) -> void:
	var control: Control = node.container_panel if node._container_active else node.label
	var key: StringName = &"panel" if node._container_active else &"normal"
	var box := control.get_theme_stylebox(key) as StyleBoxTexture
	check(box != null, "Canvas nodes retain continuous corners at small sizes")
	if box == null:
		return
	var draw_size := control.size + Vector2(
		box.expand_margin_left + box.expand_margin_right,
		box.expand_margin_top + box.expand_margin_bottom)
	check(draw_size.x >= box.texture_margin_left + box.texture_margin_right + 3.9,
		"Horizontal nine-patch cuts leave a straight section")
	check(draw_size.y >= box.texture_margin_top + box.texture_margin_bottom + 3.9,
		"Vertical nine-patch cuts leave a straight section")
	var original := Corners.source(box)
	var expected := Corners.fitted_radius(control.size, Corners.PANEL)
	check(original.corner_radius_top_left == int(expected), "Radius follows current control size")
	check(node.get_visual_outline() == Corners.outline(node.get_visual_rect(), expected),
		"Selection follows the visible fitted corners")
