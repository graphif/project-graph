@tool
class_name StageObjectSlicer
extends Node2D

@export var target_root: Node
@export var line_color := Color(0.95, 0.08, 0.08, 0.95)
@export_range(1.0, 20.0, 1.0) var line_width := 4.0
@export var highlight_color := Color(1.0, 0.05, 0.05, 0.9)
@export_range(1.0, 20.0, 1.0) var highlight_width := 3.0

var _is_slicing := false
var _slice_start := Vector2.ZERO
var _slice_end := Vector2.ZERO
var _slice_line: Line2D
var _collision_highlights: Dictionary[StageObject, Line2D] = {}


func _ready() -> void:
	_slice_line = Line2D.new()
	_slice_line.default_color = line_color
	_slice_line.width = line_width
	_slice_line.z_index = 100
	_slice_line.visible = false
	add_child(_slice_line)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		if event.pressed:
			if _is_point_on_stage_object(get_global_mouse_position()):
				return
			_is_slicing = true
			_slice_start = get_global_mouse_position()
			_slice_end = _slice_start
			_update_line()
		elif _is_slicing:
			var should_handle := _slice_start.distance_squared_to(_slice_end) > 1.0
			_finish_slice()
			if should_handle:
				get_viewport().set_input_as_handled()
		else:
			return
		if event.pressed:
			get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseMotion and _is_slicing:
		_slice_end = get_global_mouse_position()
		_update_line()
		get_viewport().set_input_as_handled()


func _update_line() -> void:
	_slice_line.points = PackedVector2Array([to_local(_slice_start), to_local(_slice_end)])
	_slice_line.visible = true
	_update_collision_highlights()


func _finish_slice() -> void:
	_is_slicing = false
	_slice_line.visible = false
	_clear_collision_highlights()

	if _slice_start.distance_squared_to(_slice_end) <= 1.0:
		return

	for stage_object in _get_stage_objects():
		if _segment_intersects_collision_box(_slice_start, _slice_end, stage_object):
			stage_object.queue_free()


func _get_stage_objects() -> Array[StageObject]:
	var result: Array[StageObject] = []
	_collect_stage_objects(target_root, result)
	return result


func _is_point_on_stage_object(point: Vector2) -> bool:
	for stage_object in _get_stage_objects():
		if _point_on_collision_geometry(point, stage_object):
			return true
	return false


func _collect_stage_objects(node: Node, result: Array[StageObject]) -> void:
	for child in node.get_children():
		if child is StageObject:
			result.append(child)
			continue
		_collect_stage_objects(child, result)


func _get_collision_geometry(stage_object: StageObject) -> PackedVector2Array:
	for child in stage_object.get_children():
		if child is CollisionShape2D and child.shape != null:
			var geometry := _get_shape_geometry(child)
			if not geometry.is_empty():
				return geometry
	return PackedVector2Array()


func _get_shape_geometry(collision_shape: CollisionShape2D) -> PackedVector2Array:
	var shape := collision_shape.shape
	var points := PackedVector2Array()
	if shape is RectangleShape2D:
		var rectangle := shape as RectangleShape2D
		points = _get_polygon_segments(_get_rectangle_points(rectangle.size))
	elif shape is ConvexPolygonShape2D:
		var polygon := shape as ConvexPolygonShape2D
		points = _get_polygon_segments(polygon.points)
	elif shape is ConcavePolygonShape2D:
		var concave_polygon := shape as ConcavePolygonShape2D
		points = concave_polygon.segments
	elif shape is SegmentShape2D:
		var segment := shape as SegmentShape2D
		points = PackedVector2Array([segment.a, segment.b])
	elif shape is CircleShape2D:
		var circle := shape as CircleShape2D
		points = _get_ellipse_segments(circle.radius, circle.radius)
	elif shape is CapsuleShape2D:
		var capsule := shape as CapsuleShape2D
		points = _get_capsule_segments(capsule.radius, capsule.height)
	else:
		points = _get_polygon_segments(_get_rectangle_points(shape.get_rect().size, shape.get_rect().get_center()))

	var global_points := PackedVector2Array()
	for point in points:
		global_points.append(collision_shape.to_global(point))
	return global_points


func _get_rectangle_points(size: Vector2, center := Vector2.ZERO) -> PackedVector2Array:
	var half_size := size / 2.0
	return PackedVector2Array([
		center + Vector2(-half_size.x, -half_size.y), center + Vector2(half_size.x, -half_size.y),
		center + Vector2(half_size.x, half_size.y), center + Vector2(-half_size.x, half_size.y),
	])


func _get_polygon_segments(polygon: PackedVector2Array) -> PackedVector2Array:
	var segments := PackedVector2Array()
	for i in polygon.size():
		segments.append(polygon[i])
		segments.append(polygon[(i + 1) % polygon.size()])
	return segments


func _get_ellipse_segments(radius_x: float, radius_y: float) -> PackedVector2Array:
	var polygon := PackedVector2Array()
	for i in 24:
		var angle := TAU * float(i) / 24.0
		polygon.append(Vector2(cos(angle) * radius_x, sin(angle) * radius_y))
	return _get_polygon_segments(polygon)


func _get_capsule_segments(radius: float, height: float) -> PackedVector2Array:
	var polygon := PackedVector2Array()
	var half_straight := maxf(0.0, height / 2.0 - radius)
	for i in 12:
		var angle := PI + PI * float(i) / 11.0
		polygon.append(Vector2(cos(angle) * radius, -half_straight + sin(angle) * radius))
	for i in 12:
		var angle := PI * float(i) / 11.0
		polygon.append(Vector2(cos(angle) * radius, half_straight + sin(angle) * radius))
	return _get_polygon_segments(polygon)


func _point_on_collision_geometry(point: Vector2, stage_object: StageObject) -> bool:
	var geometry := _get_collision_geometry(stage_object)
	for i in range(0, geometry.size() - 1, 2):
		if Geometry2D.get_closest_point_to_segment(point, geometry[i], geometry[i + 1]).distance_to(point) <= 6.0:
			return true
	return false


func _segment_intersects_collision_box(start: Vector2, end: Vector2, stage_object: StageObject) -> bool:
	var geometry := _get_collision_geometry(stage_object)
	for i in range(0, geometry.size() - 1, 2):
		if Geometry2D.segment_intersects_segment(start, end, geometry[i], geometry[i + 1]) != null:
			return true
	return false


func _update_collision_highlights() -> void:
	var highlighted := {}
	for stage_object in _get_stage_objects():
		if not _segment_intersects_collision_box(_slice_start, _slice_end, stage_object):
			continue
		var highlight := _collision_highlights.get(stage_object) as Line2D
		if highlight == null:
			highlight = Line2D.new()
			highlight.default_color = highlight_color
			highlight.width = highlight_width
			highlight.closed = false
			highlight.z_index = 99
			add_child(highlight)
			_collision_highlights[stage_object] = highlight
		var box := _get_collision_geometry(stage_object)
		var points := PackedVector2Array()
		for point in box:
			points.append(to_local(point))
		highlight.points = points
		highlight.visible = true
		highlighted[stage_object] = true

	for stage_object in _collision_highlights.keys():
		if not highlighted.has(stage_object):
			_collision_highlights[stage_object].queue_free()
			_collision_highlights.erase(stage_object)


func _clear_collision_highlights() -> void:
	for highlight in _collision_highlights.values():
		highlight.queue_free()
	_collision_highlights.clear()
