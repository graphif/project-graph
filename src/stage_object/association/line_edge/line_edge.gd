class_name LineEdge
extends Association

const Palette = preload("res://src/main/theme_palette.gd")

@onready var collision_shape: CollisionShape2D = %CollisionShape
@onready var line: Line2D = %Line
@onready var arrow_head: Polygon2D = %Head

@export var text := ""

@export var source: Entity
@export var target: Entity
# 保留旧文件字段；连接边由实时几何计算，不把派生端点写入历史。
@export var source_uv: Vector2 = Vector2(0.5, 0.5)
@export var target_uv: Vector2 = Vector2(0.5, 0.5)
@export_range(4, 128, 1) var curve_segments := 24

@export var stroke_color := Color("#89b4fa"):
	set(value):
		stroke_color = value
		use_theme_color = false
		if is_node_ready():
			_apply_style()
@export var use_theme_color := true:
	set(value):
		use_theme_color = value
		if is_node_ready():
			_apply_style()

var _appearance_light: Variant = null

var _geometry_key: Array = []
var _arrow_base_polygon := PackedVector2Array()
@onready var _unscaled_line_width: float = %Line.width


func _ready() -> void:
	# Container fills use depths 0..64; keep strokes above those backgrounds.
	z_index = 65
	_arrow_base_polygon = arrow_head.polygon.duplicate()
	line.texture = preload("res://assets/line_antialiasing.res")
	line.texture_mode = Line2D.LINE_TEXTURE_TILE
	line.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_apply_style()
	line.points = PackedVector2Array()
	collision_shape.shape = ConcavePolygonShape2D.new()


func _process(_delta: float) -> void:
	if not is_instance_valid(source) or not is_instance_valid(target):
		hide()
		_geometry_key.clear()
		return
	show()
	# Bake zoom into local geometry so native AA keeps a one-pixel fringe.
	# World anchors/collision stay unchanged through to_local()/to_global().
	var pixel_scale := maxf(get_global_transform_with_canvas().get_scale().x, 0.01)
	line.scale = Vector2.ONE / pixel_scale
	line.width = maxf(1.0, _unscaled_line_width * pixel_scale) + 2.0
	if not is_equal_approx(arrow_head.scale.x, 1.0 / pixel_scale):
		arrow_head.scale = Vector2.ONE / pixel_scale
		var polygon := PackedVector2Array()
		for point in _arrow_base_polygon:
			polygon.append(point * pixel_scale)
		arrow_head.polygon = polygon
	arrow_head.antialiased = true
	var color := display_stroke_color()
	if line.default_color != color:
		line.default_color = color
		arrow_head.color = color
	var source_rect := source.aabb
	var target_rect := target.aabb
	var key := [source_rect, target_rect, global_transform, line.transform,
		collision_shape.transform, (arrow_head.get_parent() as Node2D).global_transform, curve_segments]
	if key == _geometry_key:
		return
	_geometry_key = key
	var anchors := connection_uvs(source_rect, target_rect)
	var render_segments := clampi(ceili(curve_segments * sqrt(maxf(1.0, pixel_scale))), curve_segments, 512)
	var world_points := connection_curve(source_rect, target_rect, anchors, render_segments)
	arrow_head.visible = world_points.size() > 1
	var shaft_points := world_points.duplicate()
	if arrow_head.visible:
		var tip := world_points[world_points.size() - 1]
		# 端点切线沿目标边的内法线，避免离散曲线末段使箭头略微偏斜。
		var direction := (Vector2(0.5, 0.5) - anchors[1]).normalized()
		arrow_head.global_position = tip
		arrow_head.global_rotation = direction.angle()
		# 线身止于三角形底部；继续画到尖端会使尖端变成突出的细线。
		var head_length := 0.0
		for point in arrow_head.polygon:
			head_length = maxf(head_length, (tip - arrow_head.to_global(point)).dot(direction))
		shaft_points = _trim_curve_end(world_points, head_length)
	var local_points := PackedVector2Array()
	var collision_points := PackedVector2Array()
	for point in shaft_points:
		local_points.append(line.to_local(point))
	for point in world_points:
		collision_points.append(collision_shape.to_local(point))
	line.points = local_points
	_update_collision_shape(collision_points)


static func _trim_curve_end(points: PackedVector2Array, distance: float) -> PackedVector2Array:
	var result := points.duplicate()
	var remaining := distance
	while result.size() > 1 and remaining > 0.0:
		var last := result.size() - 1
		var segment_length := result[last].distance_to(result[last - 1])
		if segment_length <= remaining:
			remaining -= segment_length
			result.remove_at(last)
		else:
			result[last] = result[last].move_toward(result[last - 1], remaining)
			break
	return result


# 只选择两矩形之间有间隙的轴；控制点均留在该间隙中，避免曲线绕到节点背面。
# 对角排列时比较两组边中点的距离，同样位置始终得出同样的连接边。
static func connection_uvs(from_rect: Rect2, to_rect: Rect2) -> PackedVector2Array:
	var offset := to_rect.get_center() - from_rect.get_center()
	var horizontal := PackedVector2Array([Vector2(1, 0.5), Vector2(0, 0.5)]) if offset.x >= 0 else PackedVector2Array([Vector2(0, 0.5), Vector2(1, 0.5)])
	var vertical := PackedVector2Array([Vector2(0.5, 1), Vector2(0.5, 0)]) if offset.y >= 0 else PackedVector2Array([Vector2(0.5, 0), Vector2(0.5, 1)])
	var gap_x := absf(offset.x) - (from_rect.size.x + to_rect.size.x) * 0.5
	var gap_y := absf(offset.y) - (from_rect.size.y + to_rect.size.y) * 0.5
	if gap_x > 0 and gap_y <= 0:
		return horizontal
	if gap_y > 0 and gap_x <= 0:
		return vertical
	if gap_x <= 0 and gap_y <= 0:
		# 临时重叠时采用穿透较浅的轴，避让完成后自然恢复。
		return horizontal if gap_x >= gap_y else vertical
	var horizontal_span := anchor(to_rect, horizontal[1]) - anchor(from_rect, horizontal[0])
	var vertical_span := anchor(to_rect, vertical[1]) - anchor(from_rect, vertical[0])
	return horizontal if horizontal_span.length_squared() <= vertical_span.length_squared() else vertical


static func anchor(rect: Rect2, uv: Vector2) -> Vector2:
	return rect.position + rect.size * uv


static func connection_curve(from_rect: Rect2, to_rect: Rect2, anchors: PackedVector2Array, segments: int) -> PackedVector2Array:
	var start := anchor(from_rect, anchors[0])
	var end := anchor(to_rect, anchors[1])
	var normal := (anchors[0] - Vector2(0.5, 0.5)) * 2.0
	var end_normal := (anchors[1] - Vector2(0.5, 0.5)) * 2.0
	var gap := maxf(0.0, (end - start).dot(normal))
	# 不设固定最小弯曲半径，近距离连接也不会产生回钩。
	var handle := minf(gap * 0.45, 96.0)
	var control_1 := start + normal * handle
	var control_2 := end + end_normal * handle
	var points := PackedVector2Array()
	var count := maxi(4, segments)
	for index in range(count + 1):
		var t := float(index) / count
		var u := 1.0 - t
		points.append(u * u * u * start + 3.0 * u * u * t * control_1 + 3.0 * u * t * t * control_2 + t * t * t * end)
	return points


func _update_collision_shape(points: PackedVector2Array) -> void:
	var shape := collision_shape.shape as ConcavePolygonShape2D
	if shape == null:
		shape = ConcavePolygonShape2D.new()
		collision_shape.shape = shape
	var segments := PackedVector2Array()
	for index in range(points.size() - 1):
		segments.append(points[index])
		segments.append(points[index + 1])
	shape.segments = segments


func distance_to_point(world_point: Vector2) -> float:
	var distance := INF
	for index in range(line.points.size() - 1):
		var start := line.to_global(line.points[index])
		var end := line.to_global(line.points[index + 1])
		distance = minf(distance, world_point.distance_to(Geometry2D.get_closest_point_to_segment(world_point, start, end)))
	return distance


func enter_edit_mode() -> void:
	$Caption.begin_edit()


func exit_edit_mode(commit_changes := true) -> void:
	$Caption.finish_edit(commit_changes)


func is_text_dirty() -> bool:
	return $Caption.is_dirty()


func apply_theme(light: bool) -> void:
	_appearance_light = light
	_apply_style()
	$Caption._update_style()


func display_stroke_color() -> Color:
	var light: bool = Palette.is_light(str(GraphPreferences.value("theme"))) if _appearance_light == null else bool(_appearance_light)
	return Palette.neutral_edge_color(_stroke_background(light)) if use_theme_color else stroke_color


func _apply_style() -> void:
	line.default_color = display_stroke_color()
	line.antialiased = true
	arrow_head.color = display_stroke_color()


func _stroke_background(light: bool) -> Color:
	var background := Palette.color(light, "surface.canvas")
	if not is_node_ready() or not is_instance_valid(source) or not is_instance_valid(target):
		return background
	var midpoint := (source.aabb.get_center() + target.aabb.get_center()) * 0.5
	if not line.points.is_empty():
		midpoint = line.to_global(line.points[line.points.size() / 2])
	var containers: Array[Entity] = []
	for endpoint in [source, target]:
		var current: Entity = endpoint.container
		while is_instance_valid(current) and not containers.has(current):
			containers.append(current)
			current = current.container
	containers.sort_custom(func(a: Entity, b: Entity) -> bool: return a.container_depth() < b.container_depth())
	for container in containers:
		if container is TextNode and container.aabb.has_point(midpoint):
			background = background.blend(container.display_fill_color())
	return background
