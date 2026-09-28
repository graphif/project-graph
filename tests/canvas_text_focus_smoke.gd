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
	for frame in 8:
		await physics_frame
		await process_frame
	while stage != null and (stage.history._busy or stage.history._pending_commit):
		await physics_frame

func key(code: Key) -> void:
	var event := InputEventKey.new()
	event.keycode = code
	event.pressed = true
	root.push_input(event)
	await process_frame
	event = event.duplicate()
	event.pressed = false
	root.push_input(event)

func _run() -> void:
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	root.size = Vector2i(1280, 800)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	var source := stage.create_text_node("Project Graph 你好", Vector2(-240, 0), false)
	var target := stage.create_text_node("目标", Vector2(240, 100), false)
	source.freeze = true
	target.freeze = true
	var node: TextNode = source
	node.label.size.x = 500
	for button in app.find_children("*", "Button", true, false):
		if button.is_visible_in_tree() and button.focus_mode != Control.FOCUS_NONE:
			button.grab_focus()
			break
	var original_rect := node.get_visual_rect()
	var original_style := node.label.get_theme_stylebox("normal")
	node.enter_edit_mode()
	await process_frame
	check(node.label.visible, "Node background remains visible while editing")
	check(node.get_visual_rect() == original_rect, "Editing preserves node frame geometry")
	check(node.label.get_theme_stylebox("normal").get_minimum_size() == original_style.get_minimum_size(), "Editing preserves frame margins")
	var edit_style = preload("res://src/main/continuous_corners.gd").source(node.text_edit.get_theme_stylebox("normal"))
	check(edit_style.bg_color.a == 0.0 and edit_style.border_color.a == 0.0, "Autosized editor never draws a competing frame")
	check(node.text_edit.has_focus() and not node.text_edit.has_selection(), "Node edit focused without selecting all")
	check(node.text_edit.get_caret_column() == node.text.length(), "Caret starts at text end")
	var font := node.label.get_theme_font("font")
	var expected_start := node.label.position.x + (node.label.size.x - font.get_string_size(node.text, HORIZONTAL_ALIGNMENT_LEFT, -1, node.font_size).x) * 0.5
	var actual_start := node.text_edit.position.x + node.text_edit.get_theme_stylebox("normal").content_margin_left
	check(absf(expected_start - actual_start) < 1.0, "Centered label stays in place during edit")
	await key(KEY_LEFT)
	check(node.text_edit.has_focus(), "Arrow key retains canvas text focus")
	check(node.text_edit.get_caret_column() == node.text.length() - 1, "Arrow moves caret once")
	await key(KEY_RIGHT)
	check(node.text_edit.get_caret_column() == node.text.length(), "Right arrow returns to end")
	node.text_edit.select(0, 0, 0, 7)
	var double_click := InputEventMouseButton.new()
	double_click.button_index = MOUSE_BUTTON_LEFT
	double_click.pressed = true
	double_click.double_click = true
	double_click.position = node.text_edit.get_global_transform_with_canvas() * Vector2(30, 20)
	send_canvas_input(double_click)
	await process_frame
	var release := double_click.duplicate() as InputEventMouseButton
	release.double_click = false
	release.pressed = false
	send_canvas_input(release)
	await process_frame
	check(node.text_edit.get_selected_text() == node.text_edit.text, "Second double-click selects all text")
	check(node.text_edit.has_focus(), "Select all retains editor focus")
	node.text_edit.text = "第一行 Project\n第二行 Graph"
	node.text_edit.select(0, 0, 0, 2)
	send_canvas_input(double_click)
	await process_frame
	send_canvas_input(release)
	await process_frame
	check(node.text_edit.get_selected_text() == node.text_edit.text, "Double-click replaces partial selection with all lines")
	node.exit_edit_mode(false)
	var enter_click := InputEventMouseButton.new()
	enter_click.button_index = MOUSE_BUTTON_LEFT
	enter_click.pressed = true
	enter_click.double_click = true
	enter_click.position = node.label.get_global_transform_with_canvas() * Vector2(30, 20)
	send_canvas_input(enter_click)
	await process_frame
	var enter_release := enter_click.duplicate() as InputEventMouseButton
	enter_release.pressed = false
	enter_release.double_click = false
	send_canvas_input(enter_release)
	await process_frame
	check(node.text_edit.has_focus() and node.text_edit.get_selected_text() == node.text, "First double-click enters editing with all text selected")
	for zoom in [0.5, 1.0, 2.0]:
		stage.camera.target_zoom = Vector2.ONE * zoom
		stage.camera.zoom = stage.camera.target_zoom
		await process_frame
		node.text_edit.text = "Project Graph 你好"
		node.text_edit.select_all()
		await process_frame
		var character_rect := node.text_edit.get_rect_at_line_column(0, 4)
		var click := InputEventMouseButton.new()
		click.button_index = MOUSE_BUTTON_LEFT
		click.pressed = true
		click.position = node.text_edit.get_global_transform_with_canvas() * (Vector2(character_rect.position) + Vector2(1, character_rect.size.y * 0.5))
		var expected_column := node.text_edit.get_line_column_at_pos(Vector2(character_rect.position) + Vector2(1, character_rect.size.y * 0.5)).x
		check(expected_column > 0 and expected_column < node.text_edit.text.length(), "Probe targets middle of text")
		send_canvas_input(click)
		click = click.duplicate()
		click.pressed = false
		send_canvas_input(click)
		await process_frame
		check(not node.text_edit.has_selection(), "Single click clears full selection")
		check(node.text_edit.get_caret_column() == expected_column, "Click positions caret at character under pointer")
		var typing := InputEventKey.new()
		typing.pressed = true
		typing.unicode = 88
		send_canvas_input(typing)
		await process_frame
		check(node.text_edit.text == "Project Graph 你好".insert(expected_column, "X"), "Typing inserts at clicked position without replacing other text")
	node.exit_edit_mode(false)
	node.enter_edit_mode()
	var outside := InputEventMouseButton.new()
	outside.button_index = MOUSE_BUTTON_LEFT
	outside.pressed = true
	outside.position = Vector2(1150, 680)
	send_canvas_input(outside)
	await process_frame
	check(not node._editing, "Click outside still finishes editing")
	app.queue_free()
	await process_frame
	print("CANVAS_TEXT_FOCUS: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)

func send_canvas_input(event: InputEvent) -> void:
	var forwarded := event.duplicate()
	if forwarded is InputEventMouse:
		var container := stage.get_viewport().get_parent() as Control
		forwarded.position = container.get_global_transform_with_canvas() * forwarded.position
		forwarded.global_position = forwarded.position
		var motion := InputEventMouseMotion.new()
		motion.position = forwarded.position
		motion.global_position = forwarded.position
		root.push_input(motion, true)
	root.push_input(forwarded, true)
