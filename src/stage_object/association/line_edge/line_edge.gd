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
@onready var _unscaled_line_width: float = %Line.width


func _ready() -> void:
	# Container fills use depths 0..64; keep strokes above those backgrounds.
	z_index = 65
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
	arrow_head.scale = Vector2.ONE / pixel_scale
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
	var tip := anchor(target_rect, anchors[1])
	var direction := (Vector2(0.5, 0.5) - anchors[1]).normalized()
	var head_length := arrow_length(source_rect, target_rect, anchors, _unscaled_line_width)
	arrow_head.visible = head_length > 0.0
	# End the Bezier at the head base with the same tangent as the triangle.
	# All edges on a shared port now have identical head orientation.
	var shaft_points := connection_curve(source_rect, target_rect, anchors, render_segments, head_length)
	var world_points := shaft_points.duplicate()
	if arrow_head.visible:
		arrow_head.global_position = tip
		arrow_head.global_rotation = direction.angle()
		var half_width := head_length * 0.4
		arrow_head.polygon = PackedVector2Array([
			Vector2.ZERO,
			Vector2(-head_length, -half_width) * pixel_scale,
			Vector2(-head_length, half_width) * pixel_scale,
		])
		world_points.append(tip)
	var local_points := PackedVector2Array()
	var collision_points := PackedVector2Array()
	for point in shaft_points:
		local_points.append(line.to_local(point))
	for point in world_points:
		collision_points.append(collision_shape.to_local(point))
	line.points = local_points
	_update_collision_shape(collision_points)


# Arrow size follows stroke width, but cannot consume the short connection gap.
static func arrow_length(from_rect: Rect2, to_rect: Rect2, anchors: PackedVector2Array, width: float) -> float:
	var direction := (Vector2(0.5, 0.5) - anchors[1]).normalized()
	var gap := (anchor(to_rect, anchors[1]) - anchor(from_rect, anchors[0])).dot(direction)
	if gap <= 1.0:
		return 0.0
	return minf(maxf(6.0, width * 3.0 + 2.0), gap * 0.45)


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


static func connection_curve(from_rect: Rect2, to_rect: Rect2, anchors: PackedVector2Array, segments: int, end_inset: float = 0.0) -> PackedVector2Array:
	var start := anchor(from_rect, anchors[0])
	var end := anchor(to_rect, anchors[1])
	var normal := (anchors[0] - Vector2(0.5, 0.5)) * 2.0
	var end_normal := (anchors[1] - Vector2(0.5, 0.5)) * 2.0
	end += end_normal * end_inset
	var gap := maxf(0.0, (end - start).dot(normal))
	# 不设固定最小弯曲半径，近距离连接也不会产生回钩。
	var handle := minf(gap * 0.45, 96.0)
	var control_1 := start + normal * handle
	var control_2 := end + end_normal * handle
	var points := PackedVector2Array()
	var count := maxi(4, segments)
	for index in range(count + 1):
		var t := float(index) / count
		points.append(start.bezier_interpolate(control_1, control_2, end, t))
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
	if arrow_head.visible and Geometry2D.is_point_in_polygon(arrow_head.to_local(world_point), arrow_head.polygon):
		return 0.0
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
