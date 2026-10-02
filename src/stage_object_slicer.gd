class_name StageObjectSlicer
extends Node2D

@export var target_root: Node
@export var line_color := Color("#f38ba8b3")
@export_range(1.0, 20.0, 1.0) var line_width := 1.5
@export var highlight_color := Color("#f38ba899")
@export_range(1.0, 20.0, 1.0) var highlight_width := 1.5

var _is_slicing := false
var _slice_button := MOUSE_BUTTON_RIGHT
var _slice_start := Vector2.ZERO
var _slice_end := Vector2.ZERO
var _slice_targets: Dictionary[StageObject, bool] = { }
var _slice_line: Line2D
var _collision_highlights: Dictionary[StageObject, Line2D] = { }
var _fragments: Array[Dictionary] = []
var _flashes: Array[Dictionary] = []
var _contact_flares: Array[Dictionary] = []
var _flare_texture: GradientTexture2D
var _last_contact_us := 0


func _ready() -> void:
	if target_root == null:
		target_root = get_parent()
	_slice_line = Line2D.new()
	_slice_line.default_color = line_color
	_slice_line.width = line_width
	_slice_line.antialiased = true
	_slice_line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_slice_line.end_cap_mode = Line2D.LINE_CAP_ROUND
	_slice_line.z_index = 100
	_slice_line.visible = false
	add_child(_slice_line)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == (MOUSE_BUTTON_RIGHT if int(GraphPreferences.value("right_mode")) == 0 else MOUSE_BUTTON_MIDDLE) and event.pressed:
		_slice_button = event.button_index
		if _slice_button == MOUSE_BUTTON_RIGHT and target_root is Stage:
			var edge: LineEdge = target_root.edge_at(get_global_mouse_position())
			if edge != null:
				target_root.select_object(edge)
				target_root.context_requested.emit(get_global_mouse_position())
				get_viewport().set_input_as_handled()
				return
		if _is_point_on_stage_object(get_global_mouse_position()):
			return
		_is_slicing = true
		_slice_start = get_global_mouse_position()
		_slice_end = _slice_start
		_slice_targets.clear()
		_update_line()
		get_viewport().set_input_as_handled()


func _input(event: InputEvent) -> void:
	if event is InputEventPanGesture and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		if event.is_canceled():
			return
		_handle_pressed_touchpad_pan()
		get_viewport().set_input_as_handled()
		return
	if not _is_slicing:
		return
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		_cancel_slice()
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion:
		_update_slice_endpoint(get_global_mouse_position())
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.button_index == _slice_button and not event.pressed:
		_update_slice_endpoint(get_global_mouse_position())
		_finish_slice()
		get_viewport().set_input_as_handled()


func _process(delta: float) -> void:
	_update_effects(delta)
	if _slice_line != null:
		_slice_line.width = line_width / _screen_scale()
	for highlight in _collision_highlights.values():
		highlight.width = highlight_width / _screen_scale()
	if not _is_slicing:
		return
	# 主分支移出窗口时按当前终点释放切割。
	var mouse := get_viewport().get_mouse_position()
	if not get_viewport_rect().has_point(mouse):
		_update_slice_endpoint(get_global_mouse_position())
		_finish_slice()
	elif not Input.is_mouse_button_pressed(_slice_button):
		_update_slice_endpoint(get_global_mouse_position())
		_finish_slice()
	elif not get_window().has_focus():
		_cancel_slice()


func _handle_pressed_touchpad_pan() -> void:
	if not _is_slicing:
		_slice_button = MOUSE_BUTTON_LEFT
		if target_root is Stage:
			target_root.cancel_marquee_selection()
		if _is_point_on_stage_object(get_global_mouse_position()):
			return
		_is_slicing = true
		_slice_start = get_global_mouse_position()
		_slice_end = _slice_start
		_slice_targets.clear()
	_update_slice_endpoint(get_global_mouse_position())


func _update_slice_endpoint(point: Vector2) -> void:
	_slice_end = point
	_slice_targets.clear()
	if _has_slice_motion():
		for stage_object in _get_stage_objects():
			if _segment_intersects_collision_box(_slice_start, _slice_end, stage_object):
				_slice_targets[stage_object] = true
	_update_line()


func _include_connected_edges() -> void:
	for stage_object in _get_stage_objects():
		if stage_object is LineEdge:
			if _slice_targets.has(stage_object.source) or _slice_targets.has(stage_object.target):
				_slice_targets[stage_object] = true


func _update_line() -> void:
	_slice_line.points = PackedVector2Array([to_local(_slice_start), to_local(_slice_end)])
	_slice_line.visible = _has_slice_motion()
	_update_collision_highlights()
	_update_contact_marks()


func _cancel_slice() -> void:
	_is_slicing = false
	_slice_line.visible = false
	_slice_line.clear_points()
	_slice_targets.clear()
	_clear_collision_highlights()


func _finish_slice() -> void:
	if not _has_slice_motion():
		_cancel_slice()
		if target_root is Stage and _slice_button == MOUSE_BUTTON_RIGHT:
			target_root.select_ids(PackedStringArray())
			target_root.context_requested.emit(_slice_end)
		return
	# 特效只来自切线直接命中的实体；关联线只在删除时连带清理。
	for stage_object in _slice_targets:
		if is_instance_valid(stage_object) and stage_object is Entity:
			_spawn_split_effect(stage_object)
	if not _slice_targets.is_empty():
		_spawn_cut_flash()
	_include_connected_edges()
	var targets: Array[StageObject] = []
	for stage_object in _slice_targets:
		if is_instance_valid(stage_object) and not stage_object.is_queued_for_deletion():
			targets.append(stage_object)
	_cancel_slice()
	if targets.is_empty():
		return
	if target_root is Stage:
		# 与删除菜单共用容器级联删除和连线清理，保持同一步历史。
		target_root.delete_objects(targets)
		return
	var history := _get_history()
	if history != null:
		history.begin_transaction()
	for stage_object in targets:
		# 立即移出舞台，使快速撤销或保存也能捕获删除后的快照。
		stage_object.get_parent().remove_child(stage_object)
		stage_object.queue_free()
	if history != null:
		history.commit()


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
			if target_root.has_method("is_overview_hidden") and target_root.is_overview_hidden(child):
				continue
			if not child.is_queued_for_deletion() and child.is_visible_in_tree():
				result.append(child)
			continue
		_collect_stage_objects(child, result)


func _get_collision_geometry(stage_object: StageObject) -> PackedVector2Array:
	for child in stage_object.get_children():
		if child is CollisionShape2D and not child.disabled and child.shape != null:
			var geometry := _get_shape_geometry(child)
			if not geometry.is_empty():
				return geometry
	return PackedVector2Array()


func _get_shape_geometry(collision_shape: CollisionShape2D) -> PackedVector2Array:
	var shape := collision_shape.shape
	var points := PackedVector2Array()
	if shape is RectangleShape2D:
		var rectangle := shape as RectangleShape2D
		points = _get_polygon_segments(_get_rectangle_points(rectangle.size))
	elif shape is ConvexPolygonShape2D:
		var polygon := shape as ConvexPolygonShape2D
		points = _get_polygon_segments(polygon.points)
	elif shape is ConcavePolygonShape2D:
		var concave_polygon := shape as ConcavePolygonShape2D
		points = concave_polygon.segments
	elif shape is SegmentShape2D:
		var segment := shape as SegmentShape2D
		points = PackedVector2Array([segment.a, segment.b])
	elif shape is CircleShape2D:
		var circle := shape as CircleShape2D
		points = _get_ellipse_segments(circle.radius, circle.radius)
	elif shape is CapsuleShape2D:
		var capsule := shape as CapsuleShape2D
		points = _get_capsule_segments(capsule.radius, capsule.height)
	else:
		points = _get_polygon_segments(
			_get_rectangle_points(shape.get_rect().size, shape.get_rect().get_center())
		)

	var global_points := PackedVector2Array()
	for point in points:
		global_points.append(collision_shape.to_global(point))
	return global_points


func _get_rectangle_points(size: Vector2, center := Vector2.ZERO) -> PackedVector2Array:
	var half_size := size / 2.0
	return PackedVector2Array(
		[
			center + Vector2(-half_size.x, -half_size.y),
			center + Vector2(half_size.x, -half_size.y),
			center + Vector2(half_size.x, half_size.y),
			center + Vector2(-half_size.x, half_size.y),
		]
	)


func _get_polygon_segments(polygon: PackedVector2Array) -> PackedVector2Array:
	var segments := PackedVector2Array()
	for i in polygon.size():
		segments.append(polygon[i])
		segments.append(polygon[(i + 1) % polygon.size()])
	return segments


func _get_ellipse_segments(radius_x: float, radius_y: float) -> PackedVector2Array:
	var polygon := PackedVector2Array()
	for i in 24:
		var angle := TAU * float(i) / 24.0
		polygon.append(Vector2(cos(angle) * radius_x, sin(angle) * radius_y))
	return _get_polygon_segments(polygon)


func _get_capsule_segments(radius: float, height: float) -> PackedVector2Array:
	var polygon := PackedVector2Array()
	var half_straight := maxf(0.0, height / 2.0 - radius)
	for i in 12:
		var angle := PI + PI * float(i) / 11.0
		polygon.append(Vector2(cos(angle) * radius, -half_straight + sin(angle) * radius))
	for i in 12:
		var angle := PI * float(i) / 11.0
		polygon.append(Vector2(cos(angle) * radius, half_straight + sin(angle) * radius))
	return _get_polygon_segments(polygon)


func _point_on_collision_geometry(point: Vector2, stage_object: StageObject) -> bool:
	var polygon := _get_solid_polygon(stage_object)
	if polygon.size() >= 3 and Geometry2D.is_point_in_polygon(point, polygon):
		return true
	var geometry := _get_collision_geometry(stage_object)
	for i in range(0, geometry.size() - 1, 2):
		if Geometry2D.get_closest_point_to_segment(point, geometry[i], geometry[i + 1]).distance_to(
			point
		) <= 6.0:
			return true
	return false


func _segment_intersects_collision_box(
	start: Vector2,
	end: Vector2,
	stage_object: StageObject,
) -> bool:
	var polygon := _get_solid_polygon(stage_object)
	if polygon.size() >= 3 and (Geometry2D.is_point_in_polygon(start, polygon) or Geometry2D.is_point_in_polygon(end, polygon)):
		return true
	var geometry := _get_collision_geometry(stage_object)
	for i in range(0, geometry.size() - 1, 2):
		if Geometry2D.segment_intersects_segment(start, end, geometry[i], geometry[i + 1]) != null:
			return true
	return false


func _update_collision_highlights() -> void:
	var highlighted := { }
	for stage_object in _get_stage_objects():
		if not _slice_targets.has(stage_object):
			continue
		var highlight := _collision_highlights.get(stage_object) as Line2D
		if highlight == null:
			highlight = Line2D.new()
			highlight.default_color = highlight_color
			highlight.width = highlight_width
			highlight.antialiased = true
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

func _get_history() -> History:
	var node: Node = self
	while node != null:
		var history := node.get_node_or_null("History") as History
		if history != null:
			return history
		node = node.get_parent()
	return null


# 以下反馈均为临时节点，不进入舞台对象注册表或历史快照。
func _get_solid_polygon(stage_object: StageObject) -> PackedVector2Array:
	for child in stage_object.get_children():
		if not child is CollisionShape2D or child.disabled or child.shape == null:
			continue
		if child.shape is ConcavePolygonShape2D or child.shape is SegmentShape2D:
			continue
		var segments := _get_shape_geometry(child)
		var polygon := PackedVector2Array()
		for i in range(0, segments.size(), 2):
			polygon.append(segments[i])
		return polygon
	return PackedVector2Array()


func _get_cut_contacts(stage_object: StageObject) -> PackedVector2Array:
	var contacts := PackedVector2Array()
	var geometry := _get_collision_geometry(stage_object)
	for i in range(0, geometry.size() - 1, 2):
		var point: Variant = Geometry2D.segment_intersects_segment(_slice_start, _slice_end, geometry[i], geometry[i + 1])
		if point == null:
			continue
		var duplicate := false
		for contact in contacts:
			if contact.distance_squared_to(point) < 0.01:
				duplicate = true
				break
		if not duplicate:
			contacts.append(point)
	return contacts


func _update_contact_marks() -> void:
	if not GraphPreferences.value("effects"):
		return
	var now := Time.get_ticks_usec()
	if now - _last_contact_us < 16000:
		return
	_last_contact_us = now
	if _flare_texture == null:
		var gradient := Gradient.new()
		gradient.colors = PackedColorArray([Color.WHITE, Color(1, 1, 1, 0)])
		_flare_texture = GradientTexture2D.new()
		_flare_texture.gradient = gradient
		_flare_texture.width = 32
		_flare_texture.height = 32
		_flare_texture.fill = GradientTexture2D.FILL_RADIAL
		_flare_texture.fill_from = Vector2(0.5, 0.5)
		_flare_texture.fill_to = Vector2(1.0, 0.5)
	var count := 0
	for stage_object in _slice_targets:
		if not stage_object is Entity:
			continue
		for point in _get_cut_contacts(stage_object):
			if count >= 24:
				return
			count += 1
			if _contact_flares.size() >= 128:
				var oldest: Dictionary = _contact_flares.pop_front()
				oldest.node.queue_free()
			var flare := Sprite2D.new()
			flare.texture = _flare_texture
			flare.z_index = 101
			flare.scale = Vector2.ONE * 0.05
			add_child(flare)
			flare.global_position = point
			_contact_flares.append({"node": flare, "age": 0.0})


func _get_effect_polygon(entity: Entity) -> PackedVector2Array:
	if entity is TextNode:
		var stage := target_root as Stage
		var outline: PackedVector2Array = stage.group_overview.outline_for(entity) if stage != null else entity.get_visual_outline()
		var world := PackedVector2Array()
		for point in outline:
			world.append(entity.to_global(point))
		return world
	return _get_solid_polygon(entity)


func _spawn_split_effect(entity: Entity) -> void:
	if not GraphPreferences.value("effects"):
		return
	var polygon := _get_effect_polygon(entity)
	if polygon.size() < 3:
		return
	var pieces: Array[PackedVector2Array] = []
	var interior := Geometry2D.is_point_in_polygon(_slice_end, polygon)
	for i in polygon.size():
		if Geometry2D.get_closest_point_to_segment(_slice_end, polygon[i], polygon[(i + 1) % polygon.size()]).distance_squared_to(_slice_end) < 0.01:
			interior = false
	if interior:
		# Keep four pieces for rounded text nodes; one triangle per outline
		# segment would turn a smooth corner into dozens of tiny fragments.
		var sectors := _get_solid_polygon(entity)
		for i in sectors.size():
			var triangle := PackedVector2Array([sectors[i], sectors[(i + 1) % sectors.size()], _slice_end])
			pieces.append_array(Geometry2D.intersect_polygons(polygon, triangle))
	else:
		if _get_cut_contacts(entity).size() != 2:
			return
		var first := _clip_to_cut_side(polygon, 1.0)
		var second := _clip_to_cut_side(polygon, -1.0)
		if first.size() < 3 or second.size() < 3:
			return
		pieces.append(first)
		pieces.append(second)
	var fill := Color.TRANSPARENT
	var border := Color.WHITE
	if entity is TextNode:
		border = entity.label.get_theme_color("font_color")
		var control: Control = entity.container_panel if entity._container_active else entity.label
		var style_key: StringName = &"panel" if entity._container_active else &"normal"
		if control.has_theme_stylebox(style_key):
			var style := preload("res://src/main/continuous_corners.gd").source(control.get_theme_stylebox(style_key))
			if style != null:
				fill = style.bg_color
				border = style.border_color
	# 按左右排序后向外飞散，与主分支的两半运动方向一致。
	pieces.sort_custom(func(left: PackedVector2Array, right: PackedVector2Array) -> bool:
		return _polygon_center(left).x < _polygon_center(right).x
	)
	for i in pieces.size():
		var velocity := Vector2(randf_range(60.0, 600.0) * (-1.0 if i == 0 else 1.0), -randf_range(0.0, 180.0))
		if interior:
			velocity = Vector2(0.0, -randf_range(60.0, 600.0)).rotated(randf_range(-PI / 4.0, PI / 4.0))
		_spawn_fragment(pieces[i], fill, border, velocity)


func _clip_to_cut_side(polygon: PackedVector2Array, side: float) -> PackedVector2Array:
	var result := PackedVector2Array()
	var direction := _slice_end - _slice_start
	for i in polygon.size():
		var current := polygon[i]
		var next := polygon[(i + 1) % polygon.size()]
		var current_distance := direction.cross(current - _slice_start) * side
		var next_distance := direction.cross(next - _slice_start) * side
		if current_distance >= 0.0:
			result.append(current)
		if (current_distance > 0.0 and next_distance < 0.0) or (current_distance < 0.0 and next_distance > 0.0):
			result.append(current.lerp(next, current_distance / (current_distance - next_distance)))
	return result


func _polygon_center(polygon: PackedVector2Array) -> Vector2:
	var bounds := Rect2(polygon[0], Vector2.ZERO)
	for point in polygon:
		bounds = bounds.expand(point)
	return bounds.get_center()


func _spawn_fragment(polygon: PackedVector2Array, fill: Color, border: Color, velocity: Vector2) -> void:
	var fragment := Node2D.new()
	fragment.z_index = 100
	add_child(fragment)
	fragment.global_position = _polygon_center(polygon)
	var points := PackedVector2Array()
	for point in polygon:
		points.append(fragment.to_local(point))
	var surface := Polygon2D.new()
	surface.polygon = points
	surface.color = fill
	fragment.add_child(surface)
	var outline := Line2D.new()
	outline.points = points
	outline.closed = true
	outline.width = 2.0
	outline.default_color = border
	outline.antialiased = true
	outline.joint_mode = Line2D.LINE_JOINT_ROUND
	fragment.add_child(outline)
	_fragments.append({"node": fragment, "velocity": velocity, "age": 0.0})


func _spawn_cut_flash() -> void:
	if not GraphPreferences.value("effects") or _slice_start.distance_squared_to(_slice_end) <= 1.0:
		return
	var flash := Node2D.new()
	flash.z_index = 102
	add_child(flash)
	# 保留 master 的尖头反馈，限制为细窄的屏幕像素宽度。
	for i in 4:
		var blade := Polygon2D.new()
		blade.antialiased = true
		blade.color = Color(line_color, 0.08 + float(i) * 0.04) if i < 3 else Color.WHITE
		flash.add_child(blade)
	var effect := {"node": flash, "start": _slice_start, "end": _slice_end,
		"width": 3.0, "age": 0.0}
	_flashes.append(effect)
	_update_flash_shape(effect, 0.0)


func _update_flash_shape(effect: Dictionary, progress: float) -> void:
	var flash: Node2D = effect.node
	var end: Vector2 = effect.end
	var start: Vector2 = (effect.start as Vector2).lerp(end, progress)
	var direction := (end - start).normalized()
	var normal := direction.orthogonal()
	var width := float(effect.width) * (1.0 - progress) / _screen_scale()
	var shoulder := end - direction * minf(20.0, start.distance_to(end) * 0.5)
	for i in flash.get_child_count():
		var blade := flash.get_child(i) as Polygon2D
		var spread := float(3 - i) * 0.5 * (1.0 - progress) / _screen_scale()
		blade.polygon = PackedVector2Array([
			flash.to_local(start - direction * spread),
			flash.to_local(shoulder + normal * (width * 0.5 + spread)),
			flash.to_local(end + direction * spread),
			flash.to_local(shoulder - normal * (width * 0.5 + spread))])
	flash.modulate.a = 1.0 - progress


func _update_effects(delta: float) -> void:
	for i in range(_contact_flares.size() - 1, -1, -1):
		var effect: Dictionary = _contact_flares[i]
		effect.age += delta
		var progress: float = effect.age / (5.0 / 60.0)
		if progress >= 1.0:
			effect.node.queue_free()
			_contact_flares.remove_at(i)
			continue
		effect.node.scale = Vector2.ONE * (8.0 / 32.0) * progress / _screen_scale()
		effect.node.modulate.a = 1.0 - progress
	for i in range(_fragments.size() - 1, -1, -1):
		var effect: Dictionary = _fragments[i]
		effect.age += delta
		var fragment := effect.node as Node2D
		if effect.age >= 50.0 / 60.0:
			fragment.queue_free()
			_fragments.remove_at(i)
			continue
		var velocity: Vector2 = effect.velocity
		fragment.global_position += velocity * delta + Vector2(0.0, 900.0 * delta * delta)
		effect.velocity = velocity + Vector2(0.0, 1800.0 * delta)
		fragment.modulate.a = 1.0 - effect.age / (50.0 / 60.0)
	for i in range(_flashes.size() - 1, -1, -1):
		var effect: Dictionary = _flashes[i]
		effect.age += delta
		var flash := effect.node as Node2D
		var progress: float = effect.age / 0.25
		if progress >= 1.0:
			flash.queue_free()
			_flashes.remove_at(i)
			continue
		_update_flash_shape(effect, progress)


func _screen_scale() -> float:
	return maxf(get_global_transform_with_canvas().x.length(), 0.01)


func _has_slice_motion() -> bool:
	return get_global_transform_with_canvas().basis_xform(_slice_end - _slice_start).length_squared() > 25.0
