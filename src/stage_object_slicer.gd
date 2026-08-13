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
			_finish_slice()
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
	var data = PhysicsServer2D.shape_get_data(collision_shape.shape.get_rid())
	var points := PackedVector2Array()
	if data is PackedVector2Array:
		for point in data:
			points.append(collision_shape.to_global(point))
	elif data is Vector2:
		var size: Vector2 = data
		var half_size := size / 2.0
		var corners := PackedVector2Array([
			Vector2(-half_size.x, -half_size.y), Vector2(half_size.x, -half_size.y),
			Vector2(half_size.x, half_size.y), Vector2(-half_size.x, half_size.y),
		])
		for i in corners.size():
			points.append(collision_shape.to_global(corners[i]))
			points.append(collision_shape.to_global(corners[(i + 1) % corners.size()]))
	elif data is float or data is int:
		var radius: float = float(data)
		var segments := 24
		for i in segments:
			var a := TAU * float(i) / segments
			var b := TAU * float(i + 1) / segments
			points.append(collision_shape.to_global(Vector2(cos(a) * radius, sin(a) * radius)))
			points.append(collision_shape.to_global(Vector2(cos(b) * radius, sin(b) * radius)))
	else:
		var rect := collision_shape.shape.get_rect()
		var corners := PackedVector2Array([rect.position, Vector2(rect.end.x, rect.position.y), rect.end, Vector2(rect.position.x, rect.end.y)])
		for i in corners.size():
			points.append(collision_shape.to_global(corners[i]))
			points.append(collision_shape.to_global(corners[(i + 1) % corners.size()]))
	return points


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
