extends SceneTree

var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	for target in [Vector2(400, 120), Vector2(1800, 360), Vector2(240, 600), Vector2(110, 30)]:
		var from := Rect2(Vector2.ZERO, Vector2(100, 60))
		var to := Rect2(target, Vector2(100, 60))
		var anchors := LineEdge.connection_uvs(from, to)
		var reference := LineEdge.connection_curve(from, to, anchors, 1024)
		for zoom in [0.25, 1.0, 2.0, 8.0]:
			var segments := ceili(24.0 * sqrt(maxf(1.0, zoom)))
			var points := LineEdge.connection_curve(from, to, anchors, segments, 0.0, true)
			var worst := 0.0
			for point in reference:
				var distance := INF
				for i in range(points.size() - 1):
					distance = minf(distance, point.distance_to(Geometry2D.get_closest_point_to_segment(point, points[i], points[i + 1])))
				worst = maxf(worst, distance * zoom)
			if worst > 0.35:
				failures.append("screen error %.3f at %s zoom %s" % [worst, target, zoom])
	var horizontal := LineEdge.connection_curve(Rect2(0, 0, 100, 60), Rect2(1000, 0, 100, 60), PackedVector2Array([Vector2(1, 0.5), Vector2(0, 0.5), Vector2.RIGHT, Vector2.LEFT]), 96, 0.0, true)
	if horizontal.size() > 4:
		failures.append("Straight connections should retain sparse geometry")
	for width in [2.0, 3.0, 12.0, 25.0]:
		var texture := LineEdge._stroke_texture(width)
		if texture != LineEdge._stroke_texture(width):
			failures.append("Equal pixel widths must share cached textures")
		if not is_equal_approx(texture.gradient.sample(0.5 / width).a, 0.5):
			failures.append("Half-pixel fringe must have partial coverage")
	for failure in failures:
		push_error(failure)
	print("SMOOTH_CONNECTIONS: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
