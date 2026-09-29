class_name LineEdgeCreator
extends Node2D

const LINE_EDGE = preload("uid://dodce5rghnax4")

# 新创建的 LineEdge 会被添加到该节点下。
@export var target_root: Node
# 拖拽预览曲线的样式。
@export var preview_color := Color("#cba6f7cc")
@export_range(1.0, 20.0, 1.0) var preview_width := 2.0
# source 和 target 当前选中边的提示样式。
@export var source_edge_color := Color("#a6e3a1")
@export var target_edge_color := Color("#89b4fa")
@export_range(1.0, 20.0, 1.0) var edge_highlight_width := 4.0
# Line2D 使用离散点绘制贝塞尔曲线，该值越大曲线越平滑。
@export_range(4, 128, 1) var preview_curve_segments := 24

# 一次拖拽过程中持续保存的连接状态。
var _drag_start_position := Vector2.ZERO
var _gesture_button := MOUSE_BUTTON_RIGHT
var _source: Entity
var _source_uv := Vector2(0.5, 0.5)
var _target: Entity
var _target_uv := Vector2(0.5, 0.5)
var _preview_line: Line2D
var _source_edge_highlight: Line2D
var _target_edge_highlight: Line2D


func _ready() -> void:
	# 三条反馈线独立存在，避免临时提示修改 Entity 自身的样式。
	_preview_line = _create_feedback_line(preview_color, preview_width, 100)
	_source_edge_highlight = _create_feedback_line(source_edge_color, edge_highlight_width, 101)
	_target_edge_highlight = _create_feedback_line(target_edge_color, edge_highlight_width, 101)


func _input(event: InputEvent) -> void:
	if event is InputEventWithModifiers and event.alt_pressed:
		return
	# 右键按下开始拖拽，右键松开时尝试创建边。
	if event is InputEventMouseButton and (event.button_index == MOUSE_BUTTON_RIGHT or (event.button_index == MOUSE_BUTTON_LEFT and int(GraphPreferences.value("left_mode")) == 2)):
		if event.pressed:
			var mouse_position := get_global_mouse_position()
			var entity := _get_entity_at(mouse_position)
			if entity == null:
				return
			if entity is TextNode and entity.text_edit.visible:
				return
			_gesture_button = event.button_index
			_start_drag(entity, mouse_position)
		elif _source != null and event.button_index == _gesture_button:
			var mouse_position := get_global_mouse_position()
			_update_drag_state(mouse_position)
			_finish_drag()
		else:
			return

		get_viewport().set_input_as_handled()
		return

	# 拖拽期间每次鼠标移动都会刷新自动连接边、目标和预览曲线。
	if event is InputEventMouseMotion and _source != null:
		_update_preview(get_global_mouse_position())
		get_viewport().set_input_as_handled()


func _start_drag(source: Entity, mouse_position: Vector2) -> void:
	_drag_start_position = mouse_position
	var history := _get_history()
	if history != null:
		history.begin_transaction()
	_source = source
	_source_uv = Vector2(0.5, 0.5)
	_target = null
	_update_preview(mouse_position)
	_preview_line.visible = true


func _finish_drag() -> void:
	# 无论是否命中 target，拖拽结束后都关闭临时反馈。
	_preview_line.visible = false
	_source_edge_highlight.visible = false
	_target_edge_highlight.visible = false

	if _target != null:
		var line_edge := LINE_EDGE.instantiate() as LineEdge
		line_edge.source = _source
		line_edge.target = _target
		var anchors := LineEdge.connection_uvs(_source.aabb, _target.aabb)
		line_edge.source_uv = anchors[0]
		line_edge.target_uv = anchors[1]
		target_root.add_child(line_edge)
		var history := _get_history()
		if history != null:
			history.commit()

	if _target == null:
		var history := _get_history()
		if history != null:
			history.commit()
	if _target == null and _gesture_button == MOUSE_BUTTON_RIGHT and _drag_start_position.distance_squared_to(get_global_mouse_position()) <= 9.0 and target_root is Stage:
		target_root.select_object(_source)
		target_root.context_requested.emit(get_global_mouse_position())
	_source = null
	_target = null


func _update_preview(mouse_position: Vector2) -> void:
	_update_drag_state(mouse_position)
	# 预览与正式连线共用选边和曲线，松开鼠标后不会跳回另一条边。
	var destination := _target.aabb if _target != null else Rect2(mouse_position, Vector2.ZERO)
	var anchors := LineEdge.connection_uvs(_source.aabb, destination)
	_source_uv = anchors[0]
	_target_uv = anchors[1]
	_update_edge_highlight(_source_edge_highlight, _source.aabb, _source_uv, anchors[2])
	if _target != null:
		_update_edge_highlight(_target_edge_highlight, destination, _target_uv, anchors[3])
	else:
		_target_edge_highlight.visible = false
	var points := LineEdge.connection_curve(_source.aabb, destination, anchors, preview_curve_segments)
	for index in points.size():
		points[index] = to_local(points[index])
	_preview_line.points = points


func _update_drag_state(mouse_position: Vector2) -> void:
	var entity := _get_entity_at(mouse_position)
	_target = entity if entity != _source else null


func _get_entity_at(point: Vector2) -> Entity:
	# 逆序查找，使视觉上靠前的 Entity 优先响应。
	var entities := _get_entities()
	entities.sort_custom(func(a: Entity, b: Entity) -> bool: return a.container_depth() < b.container_depth())
	for i in range(entities.size() - 1, -1, -1):
		if _point_in_collision_box(point, entities[i]):
			return entities[i]
	return null


func _get_collision_box(entity: Entity) -> PackedVector2Array:
	for child in entity.get_children():
		if child is CollisionShape2D and child.shape is RectangleShape2D:
			var shape := child.shape as RectangleShape2D
			var half_size := shape.size / 2.0
			var local_points := PackedVector2Array(
				[
					Vector2(-half_size.x, -half_size.y),
					Vector2(half_size.x, -half_size.y),
					Vector2(half_size.x, half_size.y),
					Vector2(-half_size.x, half_size.y),
				]
			)
			var points := PackedVector2Array()
			for point in local_points:
				points.append(child.to_global(point))
			return points
	return PackedVector2Array()


func _point_in_collision_box(point: Vector2, entity: Entity) -> bool:
	var box := _get_collision_box(entity)
	return box.size() >= 3 and Geometry2D.is_point_in_polygon(point, box)


func _create_feedback_line(color: Color, width: float, line_z_index: int) -> Line2D:
	var feedback_line := Line2D.new()
	feedback_line.default_color = color
	feedback_line.width = width
	feedback_line.z_index = line_z_index
	feedback_line.antialiased = true
	feedback_line.visible = false
	add_child(feedback_line)
	return feedback_line


func _update_edge_highlight(highlight: Line2D, rect: Rect2, uv: Vector2, normal: Vector2) -> void:
	# Mark the actual free port rather than flashing an entire selected side.
	var point := LineEdge.anchor(rect, uv)
	var tangent := normal.orthogonal() * minf(7.0, minf(rect.size.x, rect.size.y) * 0.25)
	highlight.points = PackedVector2Array([
		highlight.to_local(point - tangent),
		highlight.to_local(point + tangent),
	])
	highlight.visible = true


func _get_entities() -> Array[Entity]:
	var result: Array[Entity] = []
	_collect_entities(target_root, result)
	return result


func _collect_entities(node: Node, result: Array[Entity]) -> void:
	# Entity 是待连接的整体，不再递归收集其内部控件。
	for child in node.get_children():
		if child is Entity:
			result.append(child)
			continue
		_collect_entities(child, result)

func _get_history() -> History:
	var node: Node = self
	while node != null:
		var history := node.get_node_or_null("History") as History
		if history != null:
			return history
		node = node.get_parent()
	return null


func cancel_drag() -> void:
	if _source == null:
		return
	_source = null
	_target = null
	_preview_line.hide()
	_source_edge_highlight.hide()
	_target_edge_highlight.hide()
	var history := _get_history()
	if history != null:
		history.commit()
