@tool
class_name StageObjectSlicer
extends Node2D

@export var target_root: Node
@export var line_color := Color(0.95, 0.08, 0.08, 0.95)
@export_range(1.0, 20.0, 1.0) var line_width := 4.0

var _is_slicing := false
var _slice_start := Vector2.ZERO
var _slice_end := Vector2.ZERO
var _slice_line: Line2D


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


func _finish_slice() -> void:
	_is_slicing = false
	_slice_line.visible = false

	if _slice_start.distance_squared_to(_slice_end) <= 1.0:
		return

	for stage_object in _get_stage_objects():
		if _segment_intersects_rect(_slice_start, _slice_end, _get_object_rect(stage_object)):
			stage_object.queue_free()


func _get_stage_objects() -> Array[StageObject]:
	var result: Array[StageObject] = []
	var root := target_root if target_root else get_parent()
	_collect_stage_objects(root, result)
	return result


func _collect_stage_objects(node: Node, result: Array[StageObject]) -> void:
	for child in node.get_children():
		if child is StageObject:
			result.append(child)
			continue
		_collect_stage_objects(child, result)


func _get_object_rect(object: Control) -> Rect2:
	var rect := Rect2()
	var has_rect := false
	var controls: Array[Node] = [object]

	while not controls.is_empty():
		var current: Node = controls.pop_back()
		if current is Control:
			var current_rect: Rect2 = current.get_global_rect()
			if current_rect.size.x > 0.0 and current_rect.size.y > 0.0:
				rect = current_rect if not has_rect else rect.merge(current_rect)
				has_rect = true

		for child in current.get_children():
			controls.push_back(child)

	return rect


func _segment_intersects_rect(start: Vector2, end: Vector2, rect: Rect2) -> bool:
	if rect.has_point(start) or rect.has_point(end):
		return true

	var top_left := rect.position
	var top_right := Vector2(rect.end.x, rect.position.y)
	var bottom_right := rect.end
	var bottom_left := Vector2(rect.position.x, rect.end.y)

	return (
		Geometry2D.segment_intersects_segment(start, end, top_left, top_right) != null
		or Geometry2D.segment_intersects_segment(start, end, top_right, bottom_right) != null
		or Geometry2D.segment_intersects_segment(start, end, bottom_right, bottom_left) != null
		or Geometry2D.segment_intersects_segment(start, end, bottom_left, top_left) != null
	)
