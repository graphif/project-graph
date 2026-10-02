extends "res://tests/group_overview_smoke.gd"

func _run() -> void:
	root.size = Vector2i(1280, 800)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", false, false)
	stage.apply_preferences()
	var top := make_node("父分组", Vector2.ZERO)
	var a := make_node("第一组", Vector2(-500, 0), top)
	var b := make_node("第二组", Vector2(100, 0), top)
	var a_leaf := make_node("甲", Vector2(-900, -300), a)
	make_node("乙", Vector2(-100, 300), a)
	var b_leaf := make_node("丙", Vector2(-300, -300), b)
	make_node("丁", Vector2(500, 300), b)
	stage.connect_entities(a_leaf, b_leaf)
	var thin := make_node("细长分组", Vector2(2600, 0))
	make_node("左", Vector2(2200, 0), thin)
	make_node("右", Vector2(3400, 0), thin)
	await zoom_to(2.0)
	var before := StageObjectRegistry.capture(stage)
	stage.camera.position = top.aabb.get_center()
	stage.camera.target_position = stage.camera.position
	await zoom_to(.5)
	var overview := stage.group_overview
	var first: Panel = overview._summaries[a.get_instance_id()]
	var second: Panel = overview._summaries[b.get_instance_id()]
	var root_panel: Panel = overview._summaries[top.get_instance_id()]
	var first_rect := first.get_global_transform() * Rect2(Vector2.ZERO, first.size)
	var second_rect := second.get_global_transform() * Rect2(Vector2.ZERO, second.size)
	check(first_rect.get_center().distance_to(a.aabb.get_center()) < 1.0, "Compact preview keeps the original group center")
	check(first.size.x <= 161.0 and first.size.y <= 81.0, "Child preview is capped to compact screen dimensions")
	var original_overlap := a.aabb.intersection(b.aabb).get_area()
	check(original_overlap > 0, "Fixture contains genuinely overlapping original group frames")
	check(first_rect.intersection(second_rect).get_area() < original_overlap * .25, "Preview frame overlap is substantially reduced")
	for panel: Panel in [root_panel, first, second]:
		var style := preload("res://src/main/continuous_corners.gd").source(panel.get_theme_stylebox("panel"))
		check(style.corner_radius_top_left >= 8, "Rounded previews retain visibly curved corners when zoomed out")
	check(StageObjectRegistry.capture(stage) == before, "Compact previews never rearrange persistent objects")
	for data in overview._preview_links.values():
		var endpoint: Rect2 = overview._preview_endpoint_rect(data.target)
		check(endpoint.grow(1.0).has_point(data.tip), "Connection tip follows the compact preview boundary")
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("/tmp/pg-rounded-compact-preview.png")
	await zoom_to(.125)
	var thin_panel: Panel = overview._summaries[thin.get_instance_id()]
	var thin_scale := thin_panel.get_global_transform_with_canvas().x.length()
	check(thin_panel.visible and thin_panel.size.y * thin_scale >= 23.0, "Thin groups retain enough screen height for rounded ends")
	var thin_style := preload("res://src/main/continuous_corners.gd").source(thin_panel.get_theme_stylebox("panel"))
	check(thin_style.corner_radius_top_left >= 8, "Thin group corners remain visibly rounded")
	await zoom_to(2.0)
	check(overview._summaries.is_empty(), "Zooming in restores the real group frames")
	check(StageObjectRegistry.capture(stage) == before, "Original saved geometry survives the preview round trip")
	app.queue_free()
	await process_frame
	print("ROUNDED_COMPACT_PREVIEW: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
