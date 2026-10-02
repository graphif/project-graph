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
@export_range(1.0, 20.0, 1.0) var edge_highlight_width := 1.5
# Line2D 使用离散点绘制贝塞尔曲线，该值越大曲线越平滑。
@export_range(4, 128, 1) var preview_curve_segments := 24

# 一次拖拽过程中持续保存的连接状态。
var _drag_start_position := Vector2.ZERO
var _gesture_button := MOUSE_BUTTON_RIGHT
var _drag_threshold_passed := false
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
	if _source != null and event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		cancel_drag()
		get_viewport().set_input_as_handled()
		return
	if event is InputEventWithModifiers and event.alt_pressed:
		return
	# 一次右键事件只查询一次舞台连线，避免每条 LineEdge 重复遍历全图。
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and event.pressed and target_root is Stage:
		if target_root.history._busy:
			return
		var point: Vector2 = get_canvas_transform().affine_inverse() * event.position
		var edge: LineEdge = target_root.edge_at(point)
		if edge != null and not edge.get_node("Caption")._editing:
			target_root.finish_text_editing()
			target_root.select_ids(PackedStringArray([edge.id]))
			target_root.context_requested.emit(point)
			get_viewport().set_input_as_handled()
			return
	# 右键按下开始拖拽，右键松开时尝试创建边。
	if event is InputEventMouseButton and ((event.button_index == MOUSE_BUTTON_RIGHT and int(GraphPreferences.value("right_mode")) == 0) or (event.button_index == MOUSE_BUTTON_LEFT and int(GraphPreferences.value("left_mode")) == 2)):
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
			_update_preview(mouse_position)
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
	_drag_threshold_passed = false
	# 连线预览不改文档；仅实际创建连线时开始历史事务。
	_source = source
	_source_uv = Vector2(0.5, 0.5)
	_target = null
	_update_preview(mouse_position)


func _finish_drag() -> void:
	# 无论是否命中 target，拖拽结束后都关闭临时反馈。
	_preview_line.visible = false
	_source_edge_highlight.visible = false
	_target_edge_highlight.visible = false

	if _target != null and target_root is Stage:
		var history := _get_history()
		if history != null:
			history.begin_transaction()
		var edge: LineEdge = target_root.connect_entities(_source, _target)
		if edge != null:
			target_root.select_ids(PackedStringArray([edge.id]))
			target_root.document_changed.emit()
			target_root.get_node("NodeRepulsion").begin_local_edit([_source, _target], false)
		if history != null:
			history.commit()
	if not _drag_threshold_passed and _gesture_button == MOUSE_BUTTON_RIGHT and target_root is Stage:
		target_root.select_object(_source)
		target_root.context_requested.emit(get_global_mouse_position())
	_source = null
	_target = null


func _update_preview(mouse_position: Vector2) -> void:
	if not _drag_threshold_passed:
		var screen_delta := get_global_transform_with_canvas().basis_xform(mouse_position - _drag_start_position)
		_drag_threshold_passed = screen_delta.length_squared() > 25.0
		if not _drag_threshold_passed:
			_target = null
			_preview_line.hide()
			_source_edge_highlight.hide()
			_target_edge_highlight.hide()
			return
	_preview_line.show()
	_update_drag_state(mouse_position)
	# 预览与正式连线共用选边和曲线，松开鼠标后不会跳回另一条边。
	var origin := LineEdge.connection_rect(_source, _target)
	var destination := LineEdge.connection_rect(_target, _source) if _target != null else Rect2(mouse_position, Vector2.ZERO)
	var anchors := LineEdge.connection_uvs(origin, destination)
	_source_uv = anchors[0]
	_target_uv = anchors[1]
	_update_edge_highlight(_source_edge_highlight, origin, _source_uv, anchors[2])
	if _target != null:
		_update_edge_highlight(_target_edge_highlight, destination, _target_uv, anchors[3])
	else:
		_target_edge_highlight.visible = false
	var points := LineEdge.connection_curve(origin, destination, anchors, preview_curve_segments)
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
		if target_root.has_method("is_overview_hidden") and target_root.is_overview_hidden(entities[i]):
			continue
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


func _process(_delta: float) -> void:
	var screen_scale := maxf(get_global_transform_with_canvas().x.length(), 0.01)
	_preview_line.width = preview_width / screen_scale
	_source_edge_highlight.width = edge_highlight_width / screen_scale
	_target_edge_highlight.width = edge_highlight_width / screen_scale
	if _source != null and (not get_window().has_focus() or not Input.is_mouse_button_pressed(_gesture_button)):
		cancel_drag()
