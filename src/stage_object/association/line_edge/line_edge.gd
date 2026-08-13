class_name LineEdge
extends Association

@onready var collision_shape: CollisionShape2D = %CollisionShape
@onready var line: Line2D = %Line
@onready var arrow_head: Polygon2D = %Head

@export var source: Entity
@export var target: Entity
@export var source_uv: Vector2 = Vector2(0.5, 0.5)
@export var target_uv: Vector2 = Vector2(0.5, 0.5)
@export_range(4, 128, 1) var curve_segments := 24


func _ready() -> void:
	line.points = PackedVector2Array()


func _process(_delta: float) -> void:
	if not is_instance_valid(source) or not is_instance_valid(target):
		if visible:
			hide()
		return

	if not visible:
		show()

	var source_inner := source.aabb.position + source.aabb.size * source_uv
	var target_inner := target.aabb.position + target.aabb.size * target_uv
	var inner_direction := target_inner - source_inner
	var p1 := _get_connection_point(source, source_uv, inner_direction)
	var p2 := _get_connection_point(target, target_uv, -inner_direction)
	var offset: Vector2 = p2 - p1
	var distance := offset.length()

	if distance <= 0.001:
		line.points = PackedVector2Array([p1, p2])
		_update_collision_shape(line.points)
		if arrow_head:
			arrow_head.position = p2
		return

	var line_direction := offset / distance
	var source_direction := _get_normal_by_uv(source_uv)
	if source_direction == Vector2.ZERO:
		source_direction = _get_rectangle_normal(source, p1, line_direction)

	var target_direction := _get_normal_by_uv(target_uv)
	if target_direction == Vector2.ZERO:
		target_direction = _get_rectangle_normal(target, p2, -line_direction)

	var control_distance: float = maxf(
		line.width * 25.0,
		minf(absf(offset.x), absf(offset.y)) / 2.0,
	)

	var control_1: Vector2 = p1 + source_direction * control_distance
	var control_2: Vector2 = p2 + target_direction * control_distance

	var curve_points := PackedVector2Array()
	for i in range(curve_segments + 1):
		var t := float(i) / curve_segments
		curve_points.append(_cubic_bezier(p1, control_1, control_2, p2, t))

	line.points = curve_points
	_update_collision_shape(curve_points)

	if arrow_head:
		arrow_head.position = p2
	arrow_head.rotation = (p2 - control_2).angle()


func _update_collision_shape(points: PackedVector2Array) -> void:
	if not collision_shape:
		return

	if points.size() < 2:
		collision_shape.shape = null
		return

	var shape := ConcavePolygonShape2D.new()
	var segments := PackedVector2Array()

	for i in range(points.size() - 1):
		segments.append(points[i])
		segments.append(points[i + 1])

	shape.segments = segments
	collision_shape.shape = shape


func _get_connection_point(entity: Entity, uv: Vector2, direction: Vector2) -> Vector2:
	var inner := entity.aabb.position + entity.aabb.size * uv
	if not uv.is_equal_approx(Vector2(0.5, 0.5)):
		return inner
	return _get_rectangle_intersection(entity, direction)


func _get_rectangle_intersection(entity: Entity, direction: Vector2) -> Vector2:
	var center := entity.aabb.position + entity.aabb.size / 2.0
	if direction.length_squared() <= 0.001:
		return center

	var half_size := entity.aabb.size / 2.0
	var scale_x: float = INF if is_zero_approx(direction.x) else half_size.x / absf(direction.x)
	var scale_y: float = INF if is_zero_approx(direction.y) else half_size.y / absf(direction.y)
	return center + direction * minf(scale_x, scale_y)


func _get_normal_by_uv(uv: Vector2) -> Vector2:
	var normal := Vector2.ZERO
	if is_zero_approx(uv.x):
		normal.x = -1.0
	elif is_equal_approx(uv.x, 1.0):
		normal.x = 1.0
	if is_zero_approx(uv.y):
		normal.y = -1.0
	elif is_equal_approx(uv.y, 1.0):
		normal.y = 1.0
	return normal.normalized()


func _get_rectangle_normal(entity: Entity, point: Vector2, fallback: Vector2) -> Vector2:
	var local_point := point - entity.position
	var distances := PackedFloat32Array(
		[local_point.x, entity.size.x - local_point.x, local_point.y, entity.size.y - local_point.y]
	)
	var closest_side := 0
	for i in range(1, distances.size()):
		if distances[i] < distances[closest_side]:
			closest_side = i
	match closest_side:
		0:
			return Vector2.LEFT
		1:
			return Vector2.RIGHT
		2:
			return Vector2.UP
		3:
			return Vector2.DOWN
	return fallback


func _cubic_bezier(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2, t: float) -> Vector2:
	var one_minus_t := 1.0 - t
	return (
		one_minus_t * one_minus_t * one_minus_t * p0 + 3.0 * one_minus_t * one_minus_t * t * p1
		+ 3.0 * one_minus_t * t * t * p2 + t * t * t * p3
	)
