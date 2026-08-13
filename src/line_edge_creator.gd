class_name LineEdgeCreator
extends Node2D

const LINE_EDGE = preload("res://src/stage_object/association/line_edge/line_edge.tscn")

# 新创建的 LineEdge 会被添加到该节点下。
@export var target_root: Node
# 拖拽预览曲线的样式。
@export var preview_color := Color(0.9, 0.9, 0.9, 0.8)
@export_range(1.0, 20.0, 1.0) var preview_width := 2.0
# source 和 target 当前选中边的提示样式。
@export var source_edge_color := Color(0.33, 0.85, 0.35)
@export var target_edge_color := Color(0.2, 0.75, 1.0)
@export_range(1.0, 20.0, 1.0) var edge_highlight_width := 4.0
# Line2D 使用离散点绘制贝塞尔曲线，该值越大曲线越平滑。
@export_range(4, 128, 1) var preview_curve_segments := 24

# 一次拖拽过程中持续保存的连接状态。
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
	# 右键按下开始拖拽，右键松开时尝试创建边。
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		if event.pressed:
			var mouse_position := get_global_mouse_position()
			var entity := _get_entity_at(mouse_position)
			if entity == null:
				return
			_start_drag(entity, mouse_position)
		elif _source != null:
			var mouse_position := get_global_mouse_position()
			_update_drag_state(mouse_position)
			_finish_drag()
		else:
			return

		get_viewport().set_input_as_handled()
		return

	# 拖拽期间每次鼠标移动都会刷新 UV、目标、高亮边和预览曲线。
	if event is InputEventMouseMotion and _source != null:
		_update_preview(get_global_mouse_position())
		get_viewport().set_input_as_handled()


func _start_drag(source: Entity, mouse_position: Vector2) -> void:
	_source = source
	_source_uv = _get_uv_at(source, mouse_position)
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
		line_edge.source_uv = _source_uv
		line_edge.target_uv = _target_uv
		target_root.add_child(line_edge)

	_source = null
	_target = null


func _update_preview(mouse_position: Vector2) -> void:
	_update_drag_state(mouse_position)
	# 命中 target 时吸附到选中边中点，否则曲线终点跟随鼠标。
	var end_position := mouse_position
	if _target != null:
		end_position = _get_position_by_uv(_target, _target_uv)

	_update_edge_highlight(_source_edge_highlight, _source, _source_uv)
	if _target != null:
		_update_edge_highlight(_target_edge_highlight, _target, _target_uv)
	else:
		_target_edge_highlight.visible = false

	var start_position := _get_position_by_uv(_source, _source_uv)
	_preview_line.points = _get_preview_curve(start_position, end_position)


func _update_drag_state(mouse_position: Vector2) -> void:
	var entity := _get_entity_at(mouse_position)
	if entity == _source:
		# 鼠标重新经过 source 时允许切换 source 的连接边。
		_source_uv = _get_uv_at(_source, mouse_position)
		_target = null
	elif entity != null:
		# 任意非 source 实体都可成为 target，并持续更新其连接边。
		_target = entity
		_target_uv = _get_uv_at(entity, mouse_position)
	else:
		_target = null


func _get_entity_at(point: Vector2) -> Entity:
	# 逆序查找，使视觉上靠前的 Entity 优先响应。
	var entities := _get_entities()
	for i in range(entities.size() - 1, -1, -1):
		if _point_in_collision_box(point, entities[i]):
			return entities[i]
	return null


func _get_collision_box(entity: Entity) -> PackedVector2Array:
	for child in entity.get_children():
		if child is CollisionShape2D and child.shape is RectangleShape2D:
			var shape := child.shape as RectangleShape2D
			var half_size := shape.size / 2.0
			var local_points := PackedVector2Array([
				Vector2(-half_size.x, -half_size.y), Vector2(half_size.x, -half_size.y),
				Vector2(half_size.x, half_size.y), Vector2(-half_size.x, half_size.y),
			])
			var points := PackedVector2Array()
			for point in local_points:
				points.append(child.to_global(point))
			return points
	return PackedVector2Array()


func _point_in_collision_box(point: Vector2, entity: Entity) -> bool:
	var box := _get_collision_box(entity)
	return box.size() >= 3 and Geometry2D.is_point_in_polygon(point, box)


func _get_uv_at(entity: Entity, point: Vector2) -> Vector2:
	# 在归一化矩形中比较相对中心的 x/y 距离，相当于用两条对角线
	# 将矩形分成上、下、左、右四个三角形。
	var normalized := (point - entity.aabb.position) / entity.aabb.size - Vector2(0.5, 0.5)
	if absf(normalized.x) > absf(normalized.y):
		return Vector2(0.0, 0.5) if normalized.x < 0.0 else Vector2(1.0, 0.5)
	return Vector2(0.5, 0.0) if normalized.y < 0.0 else Vector2(0.5, 1.0)


func _get_position_by_uv(entity: Entity, uv: Vector2) -> Vector2:
	# 四个方向 UV 对应 Entity 四条边的中点。
	return entity.aabb.position + entity.aabb.size * uv


func _create_feedback_line(color: Color, width: float, line_z_index: int) -> Line2D:
	var feedback_line := Line2D.new()
	feedback_line.default_color = color
	feedback_line.width = width
	feedback_line.z_index = line_z_index
	feedback_line.antialiased = true
	feedback_line.visible = false
	add_child(feedback_line)
	return feedback_line


func _update_edge_highlight(highlight: Line2D, entity: Entity, uv: Vector2) -> void:
	# 根据方向 UV 取出整条矩形边，并转换到 Creator 的局部坐标系绘制。
	var box := _get_collision_box(entity)
	if box.size() < 4:
		highlight.visible = false
		return
	var edge_points := PackedVector2Array()
	if is_zero_approx(uv.y):
		edge_points = PackedVector2Array([box[0], box[1]])
	elif is_equal_approx(uv.y, 1.0):
		edge_points = PackedVector2Array([box[3], box[2]])
	elif is_zero_approx(uv.x):
		edge_points = PackedVector2Array([box[0], box[3]])
	else:
		edge_points = PackedVector2Array([box[1], box[2]])

	for point in edge_points:
		highlight.add_point(to_local(point))
	while highlight.get_point_count() > edge_points.size():
		highlight.remove_point(0)
	highlight.visible = true


func _get_preview_curve(start: Vector2, end: Vector2) -> PackedVector2Array:
	# 预览曲线使用与 LineEdge 相同的两端法线和对称控制距离。
	var offset := end - start
	var distance := offset.length()
	if distance <= 0.001:
		return PackedVector2Array([to_local(start), to_local(end)])

	var line_direction := offset / distance
	var start_direction := _get_normal_by_uv(_source_uv)
	var end_direction := -line_direction
	if _target != null:
		end_direction = _get_normal_by_uv(_target_uv)
	else:
		# 尚未命中 target 时，让末端沿鼠标方向的主轴进入终点。
		end_direction = _get_dominant_direction(-line_direction)

	var control_distance := maxf(preview_width * 25.0, minf(absf(offset.x), absf(offset.y)) / 2.0)
	var control_1 := start + start_direction * control_distance
	var control_2 := end + end_direction * control_distance
	var curve_points := PackedVector2Array()
	for i in range(preview_curve_segments + 1):
		var t := float(i) / preview_curve_segments
		curve_points.append(to_local(_cubic_bezier(start, control_1, control_2, end, t)))
	return curve_points


func _get_normal_by_uv(uv: Vector2) -> Vector2:
	# 将边中点 UV 映射为对应的矩形外法线。
	return (uv - Vector2(0.5, 0.5)) * 2.0


func _get_dominant_direction(direction: Vector2) -> Vector2:
	if absf(direction.x) >= absf(direction.y):
		return Vector2(signf(direction.x), 0.0)
	return Vector2(0.0, signf(direction.y))


func _cubic_bezier(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2, t: float) -> Vector2:
	var one_minus_t := 1.0 - t
	return (
		one_minus_t * one_minus_t * one_minus_t * p0 + 3.0 * one_minus_t * one_minus_t * t * p1
		+ 3.0 * one_minus_t * t * t * p2 + t * t * t * p3
	)


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
