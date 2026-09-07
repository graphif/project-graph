class_name SelectionFeedback
extends RefCounted


static func draw_dashed_rect(
	canvas_item: CanvasItem,
	rect: Rect2,
	color: Color,
	line_width: float,
	dash_length: float,
	dash_gap: float,
) -> void:
	var corners := PackedVector2Array(
		[
			rect.position,
			Vector2(rect.end.x, rect.position.y),
			rect.end,
			Vector2(rect.position.x, rect.end.y),
		]
	)
	for i in range(corners.size()):
		_draw_dashed_segment(
			canvas_item,
			corners[i],
			corners[(i + 1) % corners.size()],
			color,
			line_width,
			dash_length,
			dash_gap,
		)


static func draw_rounded_rect(
	canvas_item: CanvasItem,
	rect: Rect2,
	color: Color,
	line_width: float,
	corner_radius: float,
) -> void:
	var radius := minf(corner_radius, minf(rect.size.x, rect.size.y) / 2.0)
	if radius <= 0.001:
		canvas_item.draw_rect(rect, color, false, line_width, true)
		return

	canvas_item.draw_line(
		Vector2(rect.position.x + radius, rect.position.y),
		Vector2(rect.end.x - radius, rect.position.y),
		color,
		line_width,
		true,
	)
	canvas_item.draw_line(
		Vector2(rect.end.x, rect.position.y + radius),
		Vector2(rect.end.x, rect.end.y - radius),
		color,
		line_width,
		true,
	)
	canvas_item.draw_line(
		Vector2(rect.end.x - radius, rect.end.y),
		Vector2(rect.position.x + radius, rect.end.y),
		color,
		line_width,
		true,
	)
	canvas_item.draw_line(
		Vector2(rect.position.x, rect.end.y - radius),
		Vector2(rect.position.x, rect.position.y + radius),
		color,
		line_width,
		true,
	)

	var arc_segments := 8
	canvas_item.draw_arc(
		rect.position + Vector2(radius, radius),
		radius,
		PI,
		PI * 1.5,
		arc_segments,
		color,
		line_width,
		true,
	)
	canvas_item.draw_arc(
		Vector2(rect.end.x - radius, rect.position.y + radius),
		radius,
		PI * 1.5,
		TAU,
		arc_segments,
		color,
		line_width,
		true,
	)
	canvas_item.draw_arc(
		rect.end - Vector2(radius, radius),
		radius,
		0.0,
		PI * 0.5,
		arc_segments,
		color,
		line_width,
		true,
	)
	canvas_item.draw_arc(
		Vector2(rect.position.x + radius, rect.end.y - radius),
		radius,
		PI * 0.5,
		PI,
		arc_segments,
		color,
		line_width,
		true,
	)


static func _draw_dashed_segment(
	canvas_item: CanvasItem,
	from: Vector2,
	to: Vector2,
	color: Color,
	line_width: float,
	dash_length: float,
	dash_gap: float,
) -> void:
	var length := from.distance_to(to)
	if is_zero_approx(length):
		return
	var direction := (to - from) / length
	var offset := 0.0
	while offset < length:
		var dash_end := minf(offset + dash_length, length)
		canvas_item.draw_line(
			from + direction * offset,
			from + direction * dash_end,
			color,
			line_width,
			true,
		)
		offset += dash_length + dash_gap
