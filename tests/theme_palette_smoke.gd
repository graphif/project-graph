extends SceneTree

const Corners = preload("res://src/main/continuous_corners.gd")

const Palette = preload("res://src/main/theme_palette.gd")
const DialogTheme = preload("res://src/main/dialog_theme.gd")
var failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func check(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
		push_error(message)


func _run() -> void:
	check(Palette.is_light("light") and Palette.is_light("latte"), "Latte aliases")
	check(not Palette.is_light("mocha"), "Mocha alias")
	var base := load("res://src/main/catppuccin_mocha.tres") as Theme
	var original_text := base.get_color("font_color", "Label")
	for light in [false, true]:
		var theme := base.duplicate(false) as Theme
		Palette.configure_theme(theme, light)
		DialogTheme.configure(theme, light)
		check(theme.get_color("default_color", "RichTextLabel") == Palette.color(light, "text.primary"), "Rich text follows palette")
		check(theme.get_stylebox("normal", "DialogPrimaryButton").bg_color == Palette.color(light, "accent.primary"), "Primary button palette")
		check(theme.get_stylebox("focus", "DialogButton").border_width_left > 0, "Visible keyboard focus")
		check(theme.get_color("background_color", "Window") == Palette.color(light, "surface.panel"), "Window backdrop palette")
		check(Palette.switch_icon(light, true, false, false) != null, "Switch icon rasterization")
		check(theme.get_color("font_pressed_color", "Button") == Palette.color(light, "text.on_accent"), "Pressed button readable foreground")
	check(base.get_color("font_color", "Label") == original_text, "Source theme stays immutable")
	var previous_clipboard := DisplayServer.clipboard_get() if DisplayServer.has_feature(DisplayServer.FEATURE_CLIPBOARD) else ""
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for frame in 12:
		await process_frame
	var stage: Stage = app.tabs.get_current_stage()
	if stage == null:
		stage = app.tabs.new_tab()
	if stage == null:
		check(false, "No stage available")
	else:
		var node := stage.create_text_node("主题颜色保留", Vector2(240, 180), false)
		node.freeze = true
		node.fill_color = Color("#efb567")
		node.use_theme_border = false
		node.border_color = Color("#585b70")
		node.text_color = Color("#123456")
		for frame in 4:
			await physics_frame
		var default_node := stage.create_text_node("主题默认", Vector2(640, 180), false)
		default_node.freeze = true
		var edge := stage.connect_entities(node, default_node)
		for frame in 4:
			await physics_frame
		var before := JSON.stringify(StageObjectRegistry.capture(stage))
		for light in [true, false, true]:
			stage.apply_theme(light)
			app._apply_preferences("theme", "light" if light else "mocha")
			check(default_node.display_border_color() == Palette.color(light, "canvas.node.border"), "Default border follows theme")
			check(edge.line.default_color == Palette.color(light, "canvas.edge"), "Default edge follows theme")
			check(node.fill_color == Color("#efb567"), "Custom fill retained")
			check(node.border_color == Color("#585b70"), "Custom border retained even at old default value")
			check(node.text_color == Color("#123456"), "Custom text retained")
			check(node.label.get_theme_color("font_color") == node.text_color, "Rendered custom text retained")
			check(Corners.source(node.label.get_theme_stylebox("normal")).border_color == node.display_border_color(), "Border always uses automatic contrast")
			check(app.get_node("Background").color == Palette.color(light, "surface.app"), "App background")
			check(stage.get_node("CanvasLayer/Grid").material.get_shader_parameter("bg_color") == Palette.color(light, "surface.canvas"), "Canvas background")
			check(JSON.stringify(StageObjectRegistry.capture(stage)) == before, "Theme changes must not mutate snapshot")
		node.text_color = Color.TRANSPARENT
		node.fill_color = Color("#111111")
		node._apply_appearance(true, true)
		check(node.text_edit.get_theme_color("caret_color") == node.label.get_theme_color("font_color"), "Caret follows auto text against custom fill")
		var snapshot := StageObjectRegistry.capture(stage)
		var saved := ProjectFile.save("user://theme-colors.prg", snapshot, {})
		check(saved.ok, "Theme flags save")
		var loaded := ProjectFile.load("user://theme-colors.prg")
		check(loaded.ok and JSON.stringify(loaded.graph.objects) == JSON.stringify(snapshot.objects), "Theme flags file roundtrip")
		stage.select_ids(PackedStringArray([default_node.id]))
		WorkspaceActions.copy_selection(stage)
		check(not WorkspaceActions.clipboard.objects.is_empty(), "Copy selection exists")
		if not WorkspaceActions.clipboard.objects.is_empty():
			check(WorkspaceActions.clipboard.objects[0].properties.use_theme_border, "Copy keeps default-color source")
		stage.select_ids(PackedStringArray([node.id, default_node.id]))
		WorkspaceActions.copy_selection(stage)
		check(WorkspaceActions.clipboard.objects.size() == 3, "Copy includes internal edge")
		if DisplayServer.has_feature(DisplayServer.FEATURE_CLIPBOARD):
			WorkspaceActions.paste(stage)
			for frame in 4:
				await physics_frame
			check(stage.stage_objects().size() == 6, "Paste restores nodes and edge")
			var pasted_edges := 0
			for object in stage.selected_objects():
				check(object.id != node.id and object.id != default_node.id and object.id != edge.id, "Paste assigns new IDs")
				if object is LineEdge:
					pasted_edges += 1
					check(object.use_theme_color, "Paste keeps edge color source")
					check(stage.selected_ids.has(object.source.id) and stage.selected_ids.has(object.target.id), "Pasted edge references copied endpoints")
			check(pasted_edges == 1, "Pasted internal edge survives reference resolution")
		else:
			print("THEME_SMOKE: SKIP paste (headless display has no clipboard)")
		await StageObjectRegistry.restore(stage, snapshot)
		stage.apply_preferences(true)
		var restored := stage.stage_objects()
		var theme_nodes := 0
		var theme_edges := 0
		for object in restored:
			if object is TextNode and object.use_theme_border:
				theme_nodes += 1
			if object is LineEdge and object.use_theme_color:
				theme_edges += 1
		check(theme_nodes == 1 and theme_edges == 1, "Theme source flags survive snapshot restore")
		node = null
		for object in restored:
			if object is TextNode and not object.use_theme_border:
				node = object
		node._configure_edit_menu(true)
		check(node._edit_menu.get_theme_color("font_color") == Palette.color(true, "text.primary"), "Text context menu uses Latte")
		var settings: Window = app._ensure_window_ready("SettingsWindow")
		app._sync_window_theme(settings)
		check(Corners.source(settings.theme.get_stylebox("normal", "DialogPrimaryButton")).bg_color == Color("#8839ef"), "Delayed dialog gets current theme")
	if OS.get_cmdline_user_args().has("--visual"):
		root.size = Vector2i(1440, 900)
		app.get_node("UIOverlay/Welcome").hide()
		app._set_preference("theme", "mocha")
		for frame in 180:
			if not app.get_node("ThemeTransition").is_transitioning():
				break
			await process_frame
		app._set_preference("theme", "light")
		for frame in 180:
			if not app.get_node("ThemeTransition").is_transitioning():
				break
			await process_frame
		check(not app.get_node("ThemeTransition").is_transitioning(), "Animated theme switch completes")
		check(app.get_node("Background").color == Palette.color(true, "surface.app"), "Animated switch ends in Latte")
		for light in [false, true]:
			app._apply_preferences("theme", "light" if light else "mocha")
			await process_frame
			await RenderingServer.frame_post_draw
			var image := root.get_texture().get_image()
			image.save_png("/tmp/project-graph-" + ("latte" if light else "mocha") + "-runtime.png")
	if DisplayServer.has_feature(DisplayServer.FEATURE_CLIPBOARD):
		DisplayServer.clipboard_set(previous_clipboard)
	app.queue_free()
	await process_frame
	print("THEME_SMOKE: " + ("PASS" if failures.is_empty() else "FAIL " + str(failures)))
	quit(0 if failures.is_empty() else 1)
