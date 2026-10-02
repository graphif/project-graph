extends SceneTree

const Corners = preload("res://src/main/continuous_corners.gd")

var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _run() -> void:
	var stage: Stage = load("res://src/stage/stage.tscn").instantiate()
	root.add_child(stage)
	await process_frame
	var nodes: Array[TextNode] = []
	for index in 4:
		var node := stage.create_text_node(["Waya", "计划02", "Project Graph", "计划01"][index], Vector2(index * 100, index * 100), false)
		node.fill_color = Color("#89b4fa")
		node.freeze = true
		if index > 0: node.container = nodes[index - 1]
		nodes.append(node)
	var mover = stage.get_node("EntityLayerMover")
	mover.refresh_layout()
	for index in 4:
		var expected := pow(0.78, 3 - index)
		check(is_equal_approx(nodes[index].display_fill_color().a, expected), "Opacity at level " + str(4 - index))
		check(nodes[index].fill_color == Color("#89b4fa"), "Raw color preserved")
		var style := nodes[index].container_panel.get_theme_stylebox("panel") if index < 3 else nodes[index].label.get_theme_stylebox("normal")
		check(is_equal_approx(Corners.source(style).bg_color.a, expected), "Rendered fill alpha")
	if DisplayServer.get_name() != "headless":
		stage.camera.target_position = nodes[0].aabb.get_center()
		stage.camera.global_position = stage.camera.target_position
		for frame in 6:
			await process_frame
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-container-opacity.png")
	nodes[2].fill_color = Color("#f5c2e7")
	mover.refresh_layout()
	check(is_equal_approx(nodes[0].display_fill_color().a, 0.78), "Different color interrupts matching branch")
	check(is_equal_approx(nodes[1].display_fill_color().a, 1.0), "Different-color child leaves parent opaque")
	nodes[2].fill_color = Color("#89b4fa80")
	mover.refresh_layout()
	check(is_equal_approx(nodes[2].display_fill_color().a, nodes[2].fill_color.a * 0.78), "Custom alpha multiplied, not overwritten")
	nodes[3].container = null
	mover.refresh_layout()
	check(is_equal_approx(nodes[0].display_fill_color().a, pow(0.78, 2)), "Removing child updates ancestors")
	nodes[3].container = nodes[2]
	mover.refresh_layout()
	check(is_equal_approx(nodes[0].display_fill_color().a, pow(0.78, 3)), "Reparent updates ancestors")
	stage.queue_free()
	await process_frame
	print("CONTAINER_OPACITY: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
