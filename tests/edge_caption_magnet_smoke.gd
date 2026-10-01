extends SceneTree

var failures: Array[String] = []
var app
var stage: Stage


func _initialize() -> void:
	call_deferred("_run")


func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)


func settle() -> void:
	for frame in 12:
		await physics_frame
		await process_frame
	while stage != null and (stage.history._busy or stage.history._pending_commit):
		await physics_frame
		await process_frame


func edge_by_id(id: String) -> LineEdge:
	for object in stage.stage_objects():
		if object is LineEdge and object.id == id:
			return object
	return null


func _run() -> void:
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", true, false)
	stage.apply_preferences()
	var group := stage.create_text_node("分组", Vector2.ZERO, false)
	group.fill_color = Color("#c50d3c")
	group.freeze = true
	var a := stage.create_text_node("Test01", Vector2(-120, 0), false)
	var b := stage.create_text_node("目标", Vector2(120, 0), false)
	a.container = group
	b.container = group
	await settle()
	stage.history.clear()
	stage.history.begin_transaction()
	stage.get_node("NodeRepulsion").begin_global_layout()
	var edge := stage.connect_entities(a, b)
	edge.text = "依赖关系"
	stage.history.commit()
	await settle()
	var caption: Rect2 = edge.caption_rect()
	check(caption.has_area(), "Named edge has a real caption collision rectangle")
	check(not caption.grow(2.0).intersects(a.aabb), "Caption separates from source")
	check(not caption.grow(2.0).intersects(b.aabb), "Caption separates from target")
	check(edge.distance_to_point(caption.get_center()) == 0.0, "Caption hits its owning edge")
	var edge_id := edge.id

	# Reverse edges must not stack their labels in the same midpoint.
	stage.history.begin_transaction()
	stage.get_node("NodeRepulsion").begin_global_layout()
	var reverse := stage.connect_entities(b, a)
	reverse.text = "反向关系"
	stage.history.commit()
	await settle()
	check(not edge.caption_rect().grow(2.0).intersects(reverse.caption_rect()), "Opposite labels repel")
	check(not edge.caption_rect().intersects(a.aabb) and not edge.caption_rect().intersects(b.aabb), "Opposite labels leave endpoint room")

	# A third node is also repelled by the edge caption.
	stage.history.begin_transaction()
	stage.get_node("NodeRepulsion").begin_global_layout()
	var obstacle := stage.create_text_node("其他节点", edge.caption_rect().get_center(), false)
	obstacle.container = group
	stage.history.commit()
	await settle()
	check(not edge.caption_rect().grow(1.0).intersects(obstacle.aabb), "Caption repels unrelated node")
	check(not edge.caption_rect().intersects(reverse.caption_rect()), "Caption pair remains separate")

	print("MAGNET_PHASE: context")
	# Right-click the visible label, not a separate editable text object.
	await right_click(edge.caption_rect().get_center())
	check(stage.selected_ids == PackedStringArray([edge.id]), "Right click selects the whole edge")
	check(app.get_node("UIOverlay/PopupMenu").visible, "Right click opens edge context actions")
	app.get_node("UIOverlay/PopupMenu").hide()
	stage.select_ids(PackedStringArray())
	var shaft_point := Vector2.INF
	for point in edge.line.points:
		var world_point := edge.line.to_global(point)
		if not edge.caption_rect().has_point(world_point) and stage.edge_at(world_point) == edge:
			shaft_point = world_point
			break
	check(shaft_point != Vector2.INF, "A visible shaft point belongs to the edge")
	if shaft_point != Vector2.INF:
		await right_click(shaft_point)
	check(stage.selected_ids == PackedStringArray([edge.id]), "Right click on shaft selects the same whole edge")
	app.get_node("UIOverlay/PopupMenu").hide()
	app._show_panel("ColorWindow")
	var colors = app._panel("ColorWindow")
	colors.get_node("Target").select(0)
	colors.get_node("ColorRow/Hex").text = "#e64553"
	app._apply_color()
	await settle()
	var requested := Color("#e64553")
	check(edge.line.default_color.is_equal_approx(requested), "Context color changes stroke")
	check(edge.arrow_head.color.is_equal_approx(requested), "Context color changes arrow")
	check(edge.get_node("Caption/Label").get_theme_color("font_color").is_equal_approx((Color.BLACK if preload("res://src/main/theme_palette.gd").neutral_text_color(requested).get_luminance() < 0.5 else Color.WHITE)), "Caption text contrasts with the line-colored block")
	var style = preload("res://src/main/continuous_corners.gd").source(edge.get_node("Caption/Label").get_theme_stylebox("normal"))
	check(style.border_color.is_equal_approx(requested) and style.bg_color.is_equal_approx(requested), "Context color changes caption fill and border")
	for theme in ["latte", "mocha"]:
		GraphPreferences.set_value("theme", theme, false)
		app._apply_preferences()
		await settle()
		check(edge.get_node("Caption/Label").get_theme_color("font_color").is_equal_approx((Color.BLACK if preload("res://src/main/theme_palette.gd").neutral_text_color(requested).get_luminance() < 0.5 else Color.WHITE)), "Explicit whole-edge color survives " + theme)
	# Line-colored blocks choose contrasting text in both display and edit mode.
	for stroke in [Color.WHITE, Color.BLACK]:
		edge.stroke_color = stroke
		await settle()
		var block = preload("res://src/main/continuous_corners.gd").source(edge.get_node("Caption/Label").get_theme_stylebox("normal"))
		check(block.bg_color.is_equal_approx(stroke), "Caption block uses exact line color")
		var foreground: Color = edge.get_node("Caption/Label").get_theme_color("font_color")
		check(foreground.get_luminance() < 0.1 if stroke == Color.WHITE else foreground.get_luminance() > 0.8, "Caption text contrasts with white or black line")
		edge.enter_edit_mode()
		await settle()
		check(edge.get_node("Caption/Editor").get_theme_color("font_color").is_equal_approx(foreground), "Editor preserves block text contrast")
		edge.exit_edit_mode(false)
		edge.stroke_color = requested
	print("MAGNET_PHASE: undo")
	await stage.history.undo()
	await settle()
	edge = edge_by_id(edge_id)
	check(edge != null and edge.use_theme_color, "One undo restores complete edge color")
	await stage.history.redo()
	await settle()
	edge = edge_by_id(edge_id)
	check(edge != null and edge.stroke_color.is_equal_approx(requested), "Redo restores complete edge color")
	check(stage.save_to_file("/tmp/pg-caption-magnet.prg"), "Save caption geometry and color")
	check(await stage.load_from_file("/tmp/pg-caption-magnet.prg"), "Reload caption geometry and color")
	await settle()
	edge = edge_by_id(edge_id)
	check(edge != null and edge.text == "依赖关系", "Caption name persists with the edge")
	check(edge != null and edge.stroke_color.is_equal_approx(requested), "Edge color persists")
	check(not edge.caption_rect().intersects(edge.source.aabb) and not edge.caption_rect().intersects(edge.target.aabb), "Reload preserves separated layout")
	print("MAGNET_PHASE: screenshot")
	if DisplayServer.get_name() != "headless":
		stage.focus_objects(stage.stage_objects())
		await settle()
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-caption-magnet.png")
	print("MAGNET_PHASE: deletion")
	var endpoint := edge.source
	stage.delete_objects([endpoint])
	await settle()
	check(edge_by_id(edge_id) == null, "Deleting endpoint deletes its caption and edge")
	await stage.history.undo()
	await settle()
	check(edge_by_id(edge_id) != null, "Undo endpoint deletion restores the complete edge")
	app.queue_free()
	await process_frame
	print("CAPTION_MAGNET: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)


func right_click(world_point: Vector2) -> void:
	# Keep the tested curve point inside the canvas, clear of root toolbars.
	stage.camera.position = world_point
	stage.camera.target_position = world_point
	await process_frame
	var viewport := stage.get_viewport()
	var container := viewport.get_parent() as Control
	var local_point := stage.get_canvas_transform() * world_point
	var screen_point := container.get_global_transform_with_canvas() * (local_point * container.size / Vector2(viewport.size))
	root.warp_mouse(screen_point)
	var motion := InputEventMouseMotion.new()
	motion.position = screen_point
	motion.global_position = screen_point
	Input.parse_input_event(motion)
	Input.flush_buffered_events()
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_RIGHT
	click.pressed = true
	click.position = screen_point
	click.global_position = screen_point
	Input.parse_input_event(click)
	Input.flush_buffered_events()
	await process_frame
	click = click.duplicate()
	click.pressed = false
	Input.parse_input_event(click)
	Input.flush_buffered_events()
	await process_frame
