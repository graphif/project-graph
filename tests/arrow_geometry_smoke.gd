extends SceneTree

var failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)


func settle() -> void:
	for frame in 4:
		await process_frame


func make_node(host: Node2D, title: String, point: Vector2) -> TextNode:
	var node: TextNode = StageObjectRegistry.get_scene("text_node").instantiate()
	node.text = title
	node.position = point
	node.freeze = true
	node.fill_color = Color("#89b4fa")
	host.add_child(node)
	return node


func make_edge(host: Node2D, from: Entity, to: Entity) -> LineEdge:
	var edge: LineEdge = StageObjectRegistry.get_scene("line_edge").instantiate()
	edge.source = from
	edge.target = to
	edge.stroke_color = Color("#20212b")
	host.add_child(edge)
	return edge


func world_head(edge: LineEdge) -> PackedVector2Array:
	var points := PackedVector2Array()
	for point in edge.arrow_head.polygon:
		points.append(edge.arrow_head.to_global(point))
	return points


func _run() -> void:
	root.size = Vector2i(1280, 720)
	var background := ColorRect.new()
	background.color = Color("#e6e9ef")
	background.size = Vector2(root.size)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var backdrop := CanvasLayer.new()
	backdrop.layer = -1
	root.add_child(backdrop)
	backdrop.add_child(background)
	var host := Node2D.new()
	root.add_child(host)
	var upper := make_node(host, "Source A", Vector2(-260, -90))
	var lower := make_node(host, "Source B", Vector2(-260, 90))
	var target := make_node(host, "Project Graph", Vector2(140, 0))
	var first := make_edge(host, upper, target)
	var second := make_edge(host, lower, target)
	await settle()
	var creator := LineEdgeCreator.new()
	creator.target_root = host
	host.add_child(creator)
	creator.set_process(false)
	creator._start_drag(upper, upper.aabb.get_center())
	creator._update_preview(target.aabb.get_center())
	var preview_tip := creator._preview_line.to_global(creator._preview_line.points[-1])
	check(preview_tip.is_equal_approx(first.arrow_head.global_position), "Preview and committed edge share the free port")
	var marker := creator._target_edge_highlight
	var marker_center := (marker.to_global(marker.points[0]) + marker.to_global(marker.points[1])) * 0.5
	check(marker_center.is_equal_approx(preview_tip), "Highlight marks the actual attachment point")
	creator.cancel_drag()
	creator.queue_free()
	var baseline := world_head(first)
	for zoom in [0.5, 1.0, 2.0]:
		root.canvas_transform = Transform2D(0.0, Vector2.ONE * zoom, 0.0, Vector2(640, 360))
		await settle()
		var a := world_head(first)
		var b := world_head(second)
		check(first.arrow_head.visible and second.arrow_head.visible, "Both converging edges retain arrows")
		check(a[0].distance_to(b[0]) > 4.0, "Different approach directions have separate boundary ports")
		for i in a.size():
			check(a[i].is_equal_approx(baseline[i]), "Zoom preserves world head geometry")
		var base := (a[1] + a[2]) * 0.5
		var shaft_end := first.line.to_global(first.line.points[-1])
		check(shaft_end.is_equal_approx(base), "Shaft reaches the triangle base center")
		check(first.distance_to_point((a[0] + a[1] + a[2]) / 3.0) == 0.0, "Arrow itself is selectable")
		var shape := first.collision_shape.shape as ConcavePolygonShape2D
		check(first.collision_shape.to_global(shape.segments[-1]).is_equal_approx(a[0]), "Collision reaches the visible tip")
		if DisplayServer.get_name() != "headless":
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png("/tmp/pg-arrow-merge-%s.png" % zoom)
	for position in [Vector2(-260, 0), Vector2(550, 0), Vector2(140, -220), Vector2(140, 220)]:
		upper.position = position
		await settle()
		var ports := LineEdge.connection_uvs(upper.aabb, target.aabb)
		var head := world_head(first)
		var inward := -ports[3]
		check(head[0].is_equal_approx(LineEdge.anchor(target.aabb, ports[1])), "Tip stays on all four target sides")
		check((head[0] - (head[1] + head[2]) * 0.5).normalized().is_equal_approx(inward), "Arrow follows target side normal")
	upper.position = Vector2(-260, -90)
	for width in [1.0, 2.0, 12.0]:
		first.stroke_width = width
		await settle()
		var head := world_head(first)
		check(head[1].distance_to(head[2]) >= width, "Triangle base covers the stroke at every supported width")
	# Nearly touching and overlapping nodes must not produce oversized/backward heads.
	upper.position = target.position + Vector2(-upper.aabb.size.x - 2.0, 0)
	await settle()
	var anchors := LineEdge.connection_uvs(upper.aabb, target.aabb)
	var direction := -anchors[3]
	var gap := (LineEdge.anchor(target.aabb, anchors[1]) - LineEdge.anchor(upper.aabb, anchors[0])).dot(direction)
	if first.arrow_head.visible:
		var points := world_head(first)
		check(points[0].distance_to((points[1] + points[2]) * 0.5) <= maxf(0.0, gap) * 0.45 + 0.001, "Short gap limits arrow length")
	upper.position = target.position
	await settle()
	check(not first.arrow_head.visible, "Overlapping endpoints suppress inward arrows")
	upper.position = Vector2(-260, -90)
	await settle()
	check(first.arrow_head.visible, "Arrow recovers after separation")
	target.queue_free()
	await settle()
	check(not first.visible and not second.visible, "Deleting target hides both edges")
	host.queue_free()
	await process_frame
	print("ARROW_GEOMETRY: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
