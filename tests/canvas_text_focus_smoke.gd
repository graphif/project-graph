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
	stage.camera.target_position = node.to_global(node.label.position + node.label.size * 0.5)
	stage.camera.global_position = stage.camera.target_position
	stage.camera.force_update_scroll()
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
	# Exercise native selection and insertion through the root viewport.
	for zoom in [0.5, 1.0, 2.0]:
		stage.camera.target_zoom = Vector2.ONE * zoom
		stage.camera.zoom = stage.camera.target_zoom
		node.text_edit.text = "首部Middle末尾"
		node.text_edit.set_caret_column(node.text_edit.text.length())
		await process_frame
		await chord(KEY_A, true)
		check(node.text_edit.get_selected_text() == node.text_edit.text, "Ctrl A selects all at zoom " + str(zoom))
		await chord(KEY_HOME)
		check(not node.text_edit.has_selection() and node.text_edit.get_caret_column() == 0, "Home reaches first character")
		await type_character(88)
		check(node.text_edit.text == "X首部Middle末尾", "Typing inserts before first character")
		await chord(KEY_END)
		check(node.text_edit.get_caret_column() == node.text_edit.text.length(), "End reaches last character")
		await type_character(89)
		check(node.text_edit.text == "X首部Middle末尾Y", "Typing appends after last character")
		await chord(KEY_HOME, false, true)
		check(node.text_edit.get_selected_text() == node.text_edit.text, "Shift Home selects to first character")
		await chord(KEY_END, false, true)
		check(not node.text_edit.has_selection(), "Shift End contracts selection to last character")
		for column in [0, 4, node.text_edit.text.length()]:
			var rect := node.text_edit.get_rect_at_line_column(0, column)
			var pointer := InputEventMouseButton.new()
			pointer.button_index = MOUSE_BUTTON_LEFT
			pointer.pressed = true
			var local_point := Vector2(rect.position) + Vector2(rect.size.x * 0.5, rect.size.y * 0.5)
			if column == 0:
				local_point.x = 1.0
			elif column == node.text_edit.text.length():
				local_point.x = node.text_edit.size.x - 1.0
			var expected := node.text_edit.get_line_column_at_pos(local_point).x
			pointer.position = node.text_edit.get_global_transform_with_canvas() * local_point
			send_canvas_input(pointer)
			pointer = pointer.duplicate()
			pointer.pressed = false
			send_canvas_input(pointer)
			await process_frame
			check(node.text_edit.get_caret_column() == expected and (column != 0 or expected == 0) and (column != node.text_edit.text.length() or expected == column), "Pointer reaches column %d: actual=%d rect=%s focus=%s editing=%s zoom=%s" % [column, node.text_edit.get_caret_column(), rect, node.text_edit.has_focus(), node._editing, zoom])
		check(node.text_edit.scroll_horizontal == 0, "First and last characters remain visible")
		var drag_start := InputEventMouseButton.new()
		drag_start.button_index = MOUSE_BUTTON_LEFT
		drag_start.pressed = true
		drag_start.position = node.text_edit.get_global_transform_with_canvas() * Vector2(1, node.text_edit.size.y * 0.5)
		send_canvas_input(drag_start, true)
		await process_frame
		var drag_motion := InputEventMouseMotion.new()
		drag_motion.button_mask = MOUSE_BUTTON_MASK_LEFT
		drag_motion.position = node.text_edit.get_global_transform_with_canvas() * Vector2(node.text_edit.size.x - 1, node.text_edit.size.y * 0.5)
		send_canvas_input(drag_motion, true)
		await process_frame
		var drag_end := drag_start.duplicate() as InputEventMouseButton
		drag_end.position = drag_motion.position
		drag_end.pressed = false
		send_canvas_input(drag_end, true)
		await process_frame
		check(node.text_edit.get_selected_text() == node.text_edit.text, "Drag from padding selects first through last character: %s" % node.text_edit.get_selected_text())
	node.exit_edit_mode(false)
	node.enter_edit_mode()
	var outside := InputEventMouseButton.new()
	outside.button_index = MOUSE_BUTTON_LEFT
	outside.pressed = true
	outside.position = Vector2(stage.get_viewport().size) - Vector2(30, 30)
	send_canvas_input(outside)
	await process_frame
	check(not node._editing, "Click outside still finishes editing")
	app.queue_free()
	await process_frame
	print("CANVAS_TEXT_FOCUS: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)

func send_canvas_input(event: InputEvent, update_input_state := false) -> void:
	var forwarded := event.duplicate()
	if forwarded is InputEventMouse:
		var container := stage.get_viewport().get_parent() as Control
		forwarded.position = container.get_global_transform_with_canvas() * (forwarded.position * container.size / Vector2(stage.get_viewport().size))
		forwarded.global_position = forwarded.position
		var motion := InputEventMouseMotion.new()
		motion.position = forwarded.position
		motion.global_position = forwarded.position
		if not update_input_state:
			root.push_input(motion, true)
	if update_input_state:
		Input.parse_input_event(forwarded)
		Input.flush_buffered_events()
	else:
		root.push_input(forwarded, true)


func chord(code: Key, ctrl := false, shift := false) -> void:
	var event := InputEventKey.new()
	event.keycode = code
	event.ctrl_pressed = ctrl
	event.shift_pressed = shift
	event.pressed = true
	root.push_input(event)
	await process_frame
	event = event.duplicate()
	event.pressed = false
	root.push_input(event)
	await process_frame


func type_character(unicode: int) -> void:
	var event := InputEventKey.new()
	event.unicode = unicode
	event.pressed = true
	root.push_input(event)
	await process_frame
	event = event.duplicate()
	event.pressed = false
	root.push_input(event)
	await process_frame
