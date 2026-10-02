extends "res://tests/next_layer_preview_smoke.gd"
func _run() -> void:
	root.size = Vector2i(1280,800)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics",false,false)
	stage.apply_preferences()
	var frame := make_node("分组顶部标题",Vector2.ZERO)
	var branch := make_node("下一层分支很长的名称需要省略",Vector2(-500,0),frame)
	var peer := make_node("另一条分支",Vector2(500,0),frame)
	var deep := make_node("不应出现的深层说明",Vector2(-1100,250),frame)
	stage.connect_entities(branch,deep)
	stage.connect_entities(deep,peer)
	stage.connect_entities(frame,peer)
	await zoom_to(2.0)
	var before := StageObjectRegistry.capture(stage)
	stage.camera.position = frame.aabb.get_center()
	stage.camera.target_position = stage.camera.position
	await zoom_to(.5)
	var overview := stage.group_overview
	var panel: Panel = overview._summaries[frame.get_instance_id()]
	var title: Label = panel.get_node("Title")
	var title_bounds := title.get_global_transform_with_canvas() * Rect2(Vector2.ZERO,title.size)
	var frame_bounds := panel.get_global_transform_with_canvas() * Rect2(Vector2.ZERO,panel.size)
	check(title_bounds.end.y <= frame_bounds.position.y + 1.0,"Frame title sits above the contents as in master top-title mode")
	var root_link: Dictionary = {}
	for data in overview._preview_links.values():
		if data.source == frame.get_instance_id():
			root_link = data
	check(not root_link.is_empty(), "Root-to-child relationship has a preview connection")
	if not root_link.is_empty():
		var source_rect := title.get_global_transform() * Rect2(Vector2.ZERO,title.size)
		check(source_rect.grow(1.0).has_point(root_link.points[0]), "Preview relationship originates at the visible external title")
	var branch_panel: Panel = overview._summaries[branch.get_instance_id()]
	var displayed := branch_panel.get_global_transform() * Rect2(Vector2.ZERO,branch_panel.size)
	check(displayed.is_equal_approx(branch.aabb),"Collapsed branch preview uses its own node rectangle, not a box around deeper nodes")
	var small: Label = branch_panel.get_node("Title")
	check(small.text_overrun_behavior == TextServer.OVERRUN_TRIM_ELLIPSIS,"Long next-layer titles truncate instead of shrinking into tiny text")
	check(small.get_theme_font_size("font_size") * small.get_global_transform_with_canvas().x.length() >= 12.0,"Visible next-layer titles have readable screen size")
	check(not overview._summaries.has(deep.get_instance_id()),"Deeper content remains omitted")
	check(StageObjectRegistry.capture(stage) == before,"Visual cleanup leaves persistent layout untouched")
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("/tmp/pg-clean-preview.png")
	app._apply_preferences("theme", "latte")
	await settle()
	var header: Panel = panel.get_node("HeaderBackground")
	var header_style := preload("res://src/main/continuous_corners.gd").source(header.get_theme_stylebox("panel"))
	var expected := preload("res://src/main/theme_palette.gd").color(true,"surface.canvas")
	check(header_style.bg_color.is_equal_approx(Color(expected, .95)), "External header follows the current theme")
	app._apply_preferences("theme", "mocha")
	await settle()
	stage.camera.position += Vector2(0, 670)
	stage.camera.target_position = stage.camera.position
	await settle()
	var pinned := title.get_global_transform_with_canvas() * Rect2(Vector2.ZERO,title.size)
	check(pinned.position.y >= 4.0 and title.visible,"Partially visible frames keep their header in the viewport")
	await click_world(title.get_global_transform() * (title.size * .5), true)
	check(frame._editing and frame.text_edit.has_focus(),"Native double click on the external header opens the original editor")
	frame.exit_edit_mode(false)
	await settle()
	await zoom_to(2.0)
	check(overview._summaries.is_empty(),"Zoom in restores the original view")
	app.queue_free()
	await process_frame
	print("PREVIEW_VISUAL_CLEANUP: "+("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
