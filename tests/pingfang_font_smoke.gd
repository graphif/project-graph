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
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	var source := stage.create_text_node("关组连动边框清晰 Test01", Vector2(-240, 0), false)
	var target := stage.create_text_node("目标", Vector2(240, 100), false)
	source.freeze = true
	target.freeze = true
	var node: TextNode = source
	node.label.size.x = 500
	for button in app.find_children("*", "Button", true, false):
		if button.is_visible_in_tree() and button.focus_mode != Control.FOCUS_NONE:
			button.grab_focus()
			break
	node.enter_edit_mode()
	await process_frame
	check(node.text_edit.has_focus() and not node.text_edit.has_selection(), "Node edit focused without selecting all")
	check(node.text_edit.get_caret_column() == node.text.length(), "Caret starts at text end")
	var font := node.label.get_theme_font("font")
	check(font.get_font_name() == "PingFang SC", "Canvas uses PingFang")
	check(node.text_edit.get_theme_font("font") == font, "Editor shares canvas font")
	check(app.theme.default_font.get_font_name() == "PingFang SC", "UI uses PingFang")
	var bundled := FontFile.new()
	check(bundled.load_dynamic_font("res://assets/fonts/PingFang-SC-Regular.ttf") == OK, "Bundled font loads")
	bundled.allow_system_fallback = false
	for character in "关组连动边框清晰文字设置菜单关闭撤销霞鹜文楷":
		check(bundled.has_char(character.unicode_at(0)), "Missing glyph: " + character)
	var expected_start := node.label.position.x + (node.label.size.x - font.get_string_size(node.text, HORIZONTAL_ALIGNMENT_LEFT, -1, node.font_size).x) * 0.5
	var actual_start := node.text_edit.position.x + node.text_edit.get_theme_stylebox("normal").content_margin_left
	check(absf(expected_start - actual_start) < 1.0, "Centered label stays in place during edit")
	await key(KEY_LEFT)
	check(node.text_edit.has_focus(), "Arrow key retains canvas text focus")
	check(node.text_edit.get_caret_column() == node.text.length() - 1, "Arrow moves caret once")
	await key(KEY_RIGHT)
	check(node.text_edit.get_caret_column() == node.text.length(), "Right arrow returns to end")
	node.exit_edit_mode()
	app.queue_free()
	await process_frame
	print("PINGFANG_FONT: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
