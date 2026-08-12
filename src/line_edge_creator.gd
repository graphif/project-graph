class_name LineEdgeCreator
extends Node2D

const LINE_EDGE = preload("res://src/stage_object/association/line_edge/line_edge.tscn")

@export var target_root: Node
@export var preview_color := Color(0.9, 0.9, 0.9, 0.8)
@export_range(1.0, 20.0, 1.0) var preview_width := 2.0

var _source: Entity
var _preview_line: Line2D


func _ready() -> void:
	_preview_line = Line2D.new()
	_preview_line.default_color = preview_color
	_preview_line.width = preview_width
	_preview_line.z_index = 100
	_preview_line.visible = false
	add_child(_preview_line)


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		if event.pressed:
			var entity := _get_entity_at(get_global_mouse_position())
			if entity == null:
				return
			_start_drag(entity)
		elif _source != null:
			_finish_drag(_get_entity_at(get_global_mouse_position()))
		else:
			return

		get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseMotion and _source != null:
		_update_preview(get_global_mouse_position())
		get_viewport().set_input_as_handled()


func _start_drag(source: Entity) -> void:
	_source = source
	_update_preview(get_global_mouse_position())
	_preview_line.visible = true


func _finish_drag(target: Entity) -> void:
	_preview_line.visible = false

	if target != null and target != _source:
		var line_edge := LINE_EDGE.instantiate() as LineEdge
		line_edge.source = _source
		line_edge.target = target
		target_root.add_child(line_edge)

	_source = null


func _update_preview(mouse_position: Vector2) -> void:
	var target := _get_entity_at(mouse_position)
	var end_position := mouse_position
	if target != null and target != _source:
		end_position = _get_entity_center(target)

	_preview_line.points = PackedVector2Array(
		[to_local(_get_entity_center(_source)), to_local(end_position)]
	)


func _get_entity_at(point: Vector2) -> Entity:
	var entities := _get_entities()
	for i in range(entities.size() - 1, -1, -1):
		if entities[i].get_global_rect().has_point(point):
			return entities[i]
	return null


func _get_entity_center(entity: Entity) -> Vector2:
	return entity.get_global_rect().get_center()


func _get_entities() -> Array[Entity]:
	var result: Array[Entity] = []
	_collect_entities(target_root, result)
	return result


func _collect_entities(node: Node, result: Array[Entity]) -> void:
	for child in node.get_children():
		if child is Entity:
			result.append(child)
			continue
		_collect_entities(child, result)
