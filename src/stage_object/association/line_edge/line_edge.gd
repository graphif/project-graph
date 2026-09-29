class_name LineEdge
extends Association

const Palette = preload("res://src/main/theme_palette.gd")
const Corners = preload("res://src/main/continuous_corners.gd")
static var _connection_outlines: Dictionary = {}

@onready var collision_shape: CollisionShape2D = %CollisionShape
@onready var line: Line2D = %Line
@onready var arrow_head: Polygon2D = %Head

@export var text := "":
	set(value):
		if text == value:
			return
		text = value
		_invalidate_caption_peers()

@export var source: Entity:
	set(value):
		if source == value:
			return
		source = value
		_invalidate_caption_peers()
@export var target: Entity:
	set(value):
		if target == value:
			return
		target = value
		_invalidate_caption_peers()
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

@export_range(1.0, 12.0, 0.5) var stroke_width := 2.0:
	set(value):
		stroke_width = clampf(value, 1.0, 12.0)
		if is_node_ready():
			_apply_style()
@export var show_arrow := true:
	set(value):
		show_arrow = value
		_geometry_key.clear()

var _geometry_key: Array = []
var _render_key: Array = []
var _shaft_points := PackedVector2Array()
var _caption_curve := Curve2D.new()
var _head_length := 0.0
@onready var _unscaled_line_width: float = %Line.width


func _ready() -> void:
	_invalidate_caption_peers()
	# Container fills use depths 0..64; keep strokes above those backgrounds.
	z_index = 65
	line.texture = preload("res://assets/line_antialiasing.res")
	line.texture_mode = Line2D.LINE_TEXTURE_TILE
	line.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_apply_style()
	line.points = PackedVector2Array()
	collision_shape.shape = ConcavePolygonShape2D.new()
	$CaptionCollision.shape = $CaptionCollision.shape.duplicate()


func _process(_delta: float) -> void:
	if not is_instance_valid(source) or not is_instance_valid(target):
		hide()
		_geometry_key.clear()
		return
	show()
	# Bake zoom into local geometry so native AA keeps a one-pixel fringe.
	# World anchors/collision stay unchanged through to_local()/to_global().
	var pixel_scale := maxf(get_global_transform_with_canvas().get_scale().x, 0.01)
	var render_scale := Vector2.ONE / pixel_scale
	if line.scale != render_scale:
		line.scale = render_scale
	var render_width := maxf(1.0, _unscaled_line_width * pixel_scale) + 2.0
	if line.width != render_width:
		line.width = render_width
	if arrow_head.scale != render_scale:
		arrow_head.scale = render_scale
	if not arrow_head.antialiased:
		arrow_head.antialiased = true
	var color := display_stroke_color()
	if line.default_color != color:
		line.default_color = color
		arrow_head.color = color
	var source_rect := connection_rect(source, target)
	var target_rect := connection_rect(target, source)
	var render_segments := clampi(ceili(curve_segments * sqrt(maxf(1.0, pixel_scale))), curve_segments, 512)
	var key := [source_rect, target_rect, global_transform, collision_shape.transform,
		(arrow_head.get_parent() as Node2D).global_transform, render_segments]
	if key != _geometry_key:
		_geometry_key = key
		_render_key.clear()
		var anchors := connection_uvs(source_rect, target_rect)
		var span := anchor(target_rect, anchors[1]) - anchor(source_rect, anchors[0])
		var center_direction := (target_rect.get_center() - source_rect.get_center()).normalized()
		modulate.a = smoothstep(0.0, 12.0, maxf(0.0, span.dot(center_direction)))
		var tip := anchor(target_rect, anchors[1])
		var direction := -anchors[3] if anchors.size() > 3 else (Vector2(0.5, 0.5) - anchors[1]).normalized()
		_head_length = arrow_length(source_rect, target_rect, anchors, _unscaled_line_width) if show_arrow else 0.0
		arrow_head.visible = _head_length > 0.0
		_shaft_points = connection_curve(source_rect, target_rect, anchors, render_segments, _head_length, true)
		_caption_curve.clear_points()
		for point in _shaft_points:
			_caption_curve.add_point(point)
		var collision_points := _shaft_points.duplicate()
		if arrow_head.visible:
			arrow_head.global_position = tip
			arrow_head.global_rotation = direction.angle()
			collision_points.append(tip)
		# Camera zoom changes only screen geometry, never world collisions.
		_update_collision_shape(collision_shape.global_transform.affine_inverse() * collision_points)
	var render_key := [pixel_scale, line.global_transform]
	if render_key == _render_key:
		return
	_render_key = render_key
	line.points = line.global_transform.affine_inverse() * _shaft_points
	if arrow_head.visible:
		arrow_head.polygon = PackedVector2Array([
			Vector2.ZERO,
			Vector2(-_head_length, -_head_length * 0.4) * pixel_scale,
			Vector2(-_head_length, _head_length * 0.4) * pixel_scale,
		])


func caption_position(fraction: float) -> Vector2:
	if _caption_curve.point_count == 0:
		return Vector2.ZERO
	return to_local(_caption_curve.sample_baked(_caption_curve.get_baked_length() * fraction))


# A container-to-descendant edge attaches to its title, not the surrounding frame.
static func connection_rect(entity: Entity, other: Entity) -> Rect2:
	if entity is TextNode and is_instance_valid(other) and other.is_inside_container(entity):
		var rect := Rect2(entity.label.global_position, Vector2.ZERO)
		for point in [Vector2.ZERO, Vector2(entity.label.size.x, 0), entity.label.size, Vector2(0, entity.label.size.y)]:
			rect = rect.expand(entity.label.get_global_transform() * point)
		return rect
	return entity.aabb


# Arrow size follows stroke width, but cannot consume the short connection gap.
static func arrow_length(from_rect: Rect2, to_rect: Rect2, anchors: PackedVector2Array, width: float) -> float:
	var direction := -anchors[3] if anchors.size() > 3 else (Vector2(0.5, 0.5) - anchors[1]).normalized()
	var gap := (anchor(to_rect, anchors[1]) - anchor(from_rect, anchors[0])).dot(direction)
	if gap <= 1.0:
		return 0.0
	return minf(maxf(6.0, width * 3.0 + 2.0), gap * 0.45)


# Ports slide around the same continuous outline as the node background.
# The first two entries remain UVs; the last two carry outward tangents' normals.
static func connection_uvs(from_rect: Rect2, to_rect: Rect2) -> PackedVector2Array:
	var direction := to_rect.get_center() - from_rect.get_center()
	if direction.is_zero_approx():
		direction = Vector2.RIGHT
	var from_port := _outline_port(from_rect.size, direction)
	var to_port := _outline_port(to_rect.size, -direction)
	return PackedVector2Array([from_port[0], to_port[0], from_port[1], to_port[1]])


static func _outline_port(size: Vector2, direction: Vector2) -> PackedVector2Array:
	if size.x <= 0.0 or size.y <= 0.0:
		return PackedVector2Array([Vector2(0.5, 0.5), direction.normalized()])
	var points: PackedVector2Array = _connection_outlines.get(size, PackedVector2Array())
	if points.is_empty():
		var raw := Corners.outline(Rect2(-size * 0.5, size), Corners.fitted_radius(size, Corners.PANEL))
		for point in raw:
			if points.is_empty() or not points[-1].is_equal_approx(point):
				points.append(point)
		if _connection_outlines.size() >= 256:
			_connection_outlines.clear()
		_connection_outlines[size] = points
	var ray := direction.normalized() * (size.length() + 1.0)
	for i in points.size():
		var a := points[i]
		var b := points[(i + 1) % points.size()]
		var hit: Variant = Geometry2D.segment_intersects_segment(Vector2.ZERO, ray, a, b)
		if hit == null:
			continue
		var point: Vector2 = hit
		var tangent := (b - a).normalized()
		var previous := (a - points[(i - 1 + points.size()) % points.size()]).normalized()
		var next := (points[(i + 2) % points.size()] - b).normalized()
		var start_normal := (previous + tangent).normalized().orthogonal()
		var end_normal := (tangent + next).normalized().orthogonal()
		var fraction := clampf(a.distance_to(point) / a.distance_to(b), 0.0, 1.0)
		var normal := start_normal.lerp(end_normal, fraction).normalized()
		return PackedVector2Array([point / size + Vector2(0.5, 0.5), normal])
	return PackedVector2Array([Vector2(0.5, 0.5), direction.normalized()])


static func anchor(rect: Rect2, uv: Vector2) -> Vector2:
	return rect.position + rect.size * uv


static func connection_curve(from_rect: Rect2, to_rect: Rect2, anchors: PackedVector2Array, segments: int, end_inset: float = 0.0, adaptive: bool = false) -> PackedVector2Array:
	var start := anchor(from_rect, anchors[0])
	var end := anchor(to_rect, anchors[1])
	var normal := anchors[2] if anchors.size() > 3 else (anchors[0] - Vector2(0.5, 0.5)) * 2.0
	var end_normal := anchors[3] if anchors.size() > 3 else (anchors[1] - Vector2(0.5, 0.5)) * 2.0
	end += end_normal * end_inset
	var gap := maxf(0.0, (end - start).dot(normal))
	# 不设固定最小弯曲半径，近距离连接也不会产生回钩。
	var handle := minf(gap * 0.45, 96.0)
	var control_1 := start + normal * handle
	var control_2 := end + end_normal * handle
	if adaptive:
		# Native adaptive tessellation omits redundant vertices on straight spans.
		var curve := Curve2D.new()
		curve.add_point(start, Vector2.ZERO, control_1 - start)
		curve.add_point(end, control_2 - end, Vector2.ZERO)
		return curve.tessellate(clampi(ceili(log(maxi(segments, 4)) / log(2.0)), 2, 9), 4.0)
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


func apply_theme(light: bool) -> void:
	_appearance_light = light
	_apply_style()
	$Caption._update_style()


func display_stroke_color() -> Color:
	var light: bool = Palette.is_light(str(GraphPreferences.value("theme"))) if _appearance_light == null else bool(_appearance_light)
	return Palette.neutral_edge_color(_stroke_background(light)) if use_theme_color else stroke_color


func _apply_style() -> void:
	line.default_color = display_stroke_color()
	line.width = stroke_width
	_unscaled_line_width = stroke_width
	line.antialiased = true
	arrow_head.color = display_stroke_color()
	_geometry_key.clear()


func distance_to_point(world_point: Vector2) -> float:
	if modulate.a <= 0.01:
		return INF
	if arrow_head.visible and Geometry2D.is_point_in_polygon(arrow_head.to_local(world_point), arrow_head.polygon):
		return 0.0
	if caption_rect().has_point(world_point):
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


func update_caption_collision(size: Vector2, center: Vector2, active: bool) -> void:
	var collision := get_node("CaptionCollision") as CollisionShape2D
	var shape := collision.shape as RectangleShape2D
	if shape.size != size:
		shape.size = size.max(Vector2.ONE)
	if collision.position != center:
		collision.position = center
	if collision.disabled == active:
		collision.disabled = not active


func caption_rect() -> Rect2:
	var collision := get_node("CaptionCollision") as CollisionShape2D
	if collision.disabled or not is_instance_valid(source) or not is_instance_valid(target):
		return Rect2()
	return collision.global_transform * collision.shape.get_rect()


func _invalidate_caption_peers() -> void:
	if is_inside_tree():
		get_parent().remove_meta("caption_peer_fractions")


func _exit_tree() -> void:
	_invalidate_caption_peers()


func caption_fraction() -> float:
	# Rebuild only when edge topology or caption membership changes. Stage
	# metadata owns the cache, so closing a document releases it naturally.
	var stage := get_parent()
	if not stage.has_meta("caption_peer_fractions"):
		var corridors: Dictionary = {}
		for child in stage.get_children():
			if not child is LineEdge or child.is_queued_for_deletion() or child.text.is_empty():
				continue
			if not is_instance_valid(child.source) or not is_instance_valid(child.target):
				continue
			var endpoints := [child.source.get_instance_id(), child.target.get_instance_id()]
			endpoints.sort()
			if not corridors.has(endpoints):
				corridors[endpoints] = []
			corridors[endpoints].append(child)
		var fractions: Dictionary = {}
		for peers in corridors.values():
			peers.sort_custom(func(a: LineEdge, b: LineEdge) -> bool: return a.id < b.id)
			for index in peers.size():
				var peer: LineEdge = peers[index]
				var fraction := float(index + 1) / float(peers.size() + 1)
				fractions[peer.get_instance_id()] = fraction if peer.source.id < peer.target.id else 1.0 - fraction
		stage.set_meta("caption_peer_fractions", fractions)
	return float(stage.get_meta("caption_peer_fractions").get(get_instance_id(), 0.5))


func _input(event: InputEvent) -> void:
	if not is_visible_in_tree() or not event is InputEventMouseButton:
		return
	if not event.pressed or event.button_index != MOUSE_BUTTON_RIGHT or event.alt_pressed:
		return
	var stage := get_parent() as Stage
	if stage == null or stage.history._busy or $Caption._editing:
		return
	var point: Vector2 = get_canvas_transform().affine_inverse() * event.position
	if stage.edge_at(point) != self:
		return
	stage.finish_text_editing()
	stage.select_ids(PackedStringArray([id]))
	stage.context_requested.emit(point)
	get_viewport().set_input_as_handled()
