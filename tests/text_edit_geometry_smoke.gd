extends SceneTree

var failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)


func settle() -> void:
	for frame in 6:
		await process_frame


func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	var stage: Stage = app.tabs.get_current_stage()
	var source := stage.create_text_node("A", Vector2(-180, 0), false)
	var target := stage.create_text_node("目标", Vector2(180, 0), false)
	source.freeze = true
	target.freeze = true
	var edge: LineEdge = StageObjectRegistry.get_scene("line_edge").instantiate()
	edge.source = source
	edge.target = target
	edge.text = "依赖关系"
	stage.add_child(edge)
	await settle()
	for value in ["A", "节点文本", "第一行\n第二行", "\n".join(PackedStringArray(["一", "二", "三", "四", "五", "六"]))]:
		source.text = value
		source._apply_appearance()
		await settle()
		var bounds := source.get_visual_rect()
		var origin := source.global_position
		source.enter_edit_mode()
		await settle()
		check(source.get_visual_rect().is_equal_approx(bounds), "Entering node edit preserves the background")
		check(source.global_position.is_equal_approx(origin), "Entering node edit preserves body position")
		check(source.text_edit.position.is_equal_approx(source.label.position), "Node input shares label origin")
		check(source.text_edit.size.is_equal_approx(source.label.size), "Node input shares label size: %s %s %s" % [value, source.text_edit.size, source.label.size])
		check(source.text_edit.get_total_visible_line_count() == value.split("\n").size(), "Node only wraps at explicit newlines")
		check(not source.text_edit.get_v_scroll_bar().visible, "Node text is not vertically clipped")
		source.exit_edit_mode(false)
		await settle()
	source.fixed_width = 80.0
	source.text = "这是一段超过固定宽度但不应自动换行的文字"
	await settle()
	source.enter_edit_mode()
	await settle()
	check(source.label.get_line_count() == 1 and source.text_edit.get_total_visible_line_count() == 1, "Long text stays on one line")
	source.text_edit.insert_text_at_caret("新增文本")
	await settle()
	check(source.label.text == source.text_edit.text, "Draft expands its shared background")
	check(not source.text_edit.get_h_scroll_bar().visible, "Draft fits without hiding trailing characters")
	var newline := InputEventKey.new()
	newline.keycode = KEY_ENTER
	newline.shift_pressed = true
	newline.pressed = true
	stage.get_viewport().push_input(newline, true)
	await settle()
	check(source._editing and source.text_edit.get_line_count() == 2, "Shift Enter inserts a newline")
	newline = newline.duplicate()
	newline.shift_pressed = false
	stage.get_viewport().push_input(newline, true)
	await settle()
	check(not source._editing and source.text.ends_with("\n"), "Enter commits editing")
	var caption = edge.get_node("Caption")
	for value in ["依赖关系", "A", "第一行\n第二行"]:
		edge.text = value
		await settle()
		var bounds: Rect2 = caption.label.get_global_rect()
		edge.enter_edit_mode()
		await settle()
		check(caption.label.get_global_rect().is_equal_approx(bounds), "Entering caption edit preserves background bounds: %s %s -> %s" % [value, bounds, caption.label.get_global_rect()])
		check(caption.editor.get_global_rect().is_equal_approx(bounds), "Caption input shares the displayed bounds")
		check(caption.editor.get_total_visible_line_count() == value.split("\n").size(), "Caption only wraps at explicit newlines")
		check(not caption.editor.get_v_scroll_bar().visible, "Caption text is not vertically clipped")
		check(caption.label.visible, "Caption background remains visible while editing")
		if DisplayServer.get_name() != "headless" and value == "依赖关系":
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png("/tmp/pg-caption-stable-edit.png")
		edge.exit_edit_mode(false)
		await settle()
		check(caption.label.get_global_rect().is_equal_approx(bounds), "Cancel returns to the same caption bounds")
	app.queue_free()
	await process_frame
	print("TEXT_EDIT_GEOMETRY: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
