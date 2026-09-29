extends Node2D

@export var target_root: Node
@onready var highlight: Line2D = $Highlight
@onready var preview: Line2D = $Preview
@onready var hint: Label = $Hint
@onready var jump_path: Node2D = $JumpPath
@onready var jump_curve: Line2D = $JumpPath/Curve
@onready var jump_shadow: Line2D = $JumpPath/Shadow
@onready var jump_arrow: Line2D = $JumpPath/Arrow
@onready var jump_source: Line2D = $JumpPath/Source

var _active := false
var _cancelled := false
var _continued_drag := false
var _last_positions: Dictionary = {}
var _layout_inputs: Array = []


func _ready() -> void:
	if target_root == null:
		target_root = get_parent()
	process_physics_priority = 90
	process_priority = -10
	hint.add_theme_color_override("font_color", Color("#cdd6f4"))
	cancel()


func entities() -> Array[Entity]:
	var result: Array[Entity] = []
	for object in target_root.get_children():
		if object is Entity and object.is_node_ready() and not object.is_queued_for_deletion():
			result.append(object)
	return result


func selection_roots() -> Array[Entity]:
	var result: Array[Entity] = []
	var selected: Array = target_root.call("selected_objects")
	for object in selected:
		if not object is Entity:
			continue
		var nested := false
		for other in selected:
			if other is Entity and object.is_inside_container(other):
				nested = true
				break
		if not nested:
			result.append(object)
	return result


func handle_input(event: InputEvent) -> bool:
	if not is_visible_in_tree() or int(GraphPreferences.value("left_mode")) != 0:
		cancel()
		return false
	var focus := get_viewport().gui_get_focus_owner()
	if focus is TextEdit or focus is LineEdit or focus is SpinBox:
		cancel()
		return false
	if event is InputEventKey:
		if event.keycode == KEY_ESCAPE and event.pressed and _active:
			cancel()
			return true
		if event.keycode == KEY_ALT:
			if event.pressed and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
				_begin()
			elif not event.pressed:
				cancel()
				_cancelled = false
		return false
	if not event is InputEventMouseButton or event.button_index != MOUSE_BUTTON_LEFT:
		return false
	if event.alt_pressed:
		if event.pressed:
			if selection_roots().is_empty():
				var object := _target_at(get_global_mouse_position(), [])
				if object != null:
					target_root.call("select_object", object)
			_begin()
		elif _active:
			_drop()
		return true
	if _active and not event.pressed:
		cancel()
		return true
	return false


func _begin() -> void:
	if _active or selection_roots().is_empty():
		return
	var history := target_root.get_node("History") as History
	if history._busy:
		return
	history.begin_transaction()
	# 从普通拖动切入 Alt 手势时保留同一次历史，停止惯性和跟手移动。
	_continued_drag = false
	for object in entities():
		_continued_drag = _continued_drag or object.is_dragging
		object.pause_drag_for_layer_move()
	_cancelled = false
	_active = true


func cancel() -> void:
	var was_active := _active
	_active = false
	if is_instance_valid(highlight):
		_hide_feedback()
	if was_active and is_instance_valid(target_root):
		_cancelled = true
		var history := target_root.get_node("History") as History
		if not history.is_transaction_active():
			return
		if _continued_drag:
			history.commit()
		else:
			# 尚未改变对象的 Alt 点击取消后，不启动额外的物理避让。
			history._finish_commit()


func _process(_delta: float) -> void:
	refresh_layout()
	if not is_visible_in_tree():
		cancel()
		return
	if _active and (not Input.is_key_pressed(KEY_ALT) or not get_window().has_focus()):
		cancel()
		return
	if _active and not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		cancel()
		return
	if not Input.is_key_pressed(KEY_ALT):
		_cancelled = false
	var roots := selection_roots()
	var focus := get_viewport().gui_get_focus_owner()
	if _cancelled or focus is TextEdit or focus is LineEdit or focus is SpinBox or not get_window().has_focus() or not Input.is_key_pressed(KEY_ALT) or roots.is_empty() or int(GraphPreferences.value("left_mode")) != 0:
		_hide_feedback()
		return
	var point := get_global_mouse_position()
	var destination := _target_at(point, roots)
	var valid := _valid_destination(destination, roots)
	var color := Color("#a6e3a1") if valid else Color("#f38ba8")
	highlight.visible = destination != null
	if destination != null:
		_outline(highlight, destination.aabb.grow(4.0), color)
	var source_rect := _bounds(roots)
	var rect := source_rect
	rect.position += _drop_delta(point, rect)
	_outline(preview, rect, color)
	_outline(jump_source, source_rect, Color(color, 0.5))
	_update_jump_path(source_rect.get_center(), rect.get_center(), color)
	hint.text = ("松开放入「%s」" % destination.text) if destination != null else "松开移到最外层"
	if not valid:
		hint.text = "不能放入自身或内部方块"
	hint.position = to_local(point + Vector2(16, 18))
	hint.show()


func _target_at(point: Vector2, excluded: Array[Entity]) -> TextNode:
	var best: TextNode
	for object in entities():
		if target_root.has_method("is_overview_hidden") and target_root.is_overview_hidden(object):
			continue
		if not object is TextNode or excluded.has(object) or not object.aabb.has_point(point):
			continue
		if best == null or object.container_depth() > best.container_depth() or (object.container_depth() == best.container_depth() and object.aabb.get_area() < best.aabb.get_area()):
			best = object
	if best == null:
		for object in excluded:
			if object is TextNode and object.aabb.has_point(point):
				return object
	return best


func _valid_destination(destination: Entity, roots: Array[Entity]) -> bool:
	if destination == null:
		return true
	for root in roots:
		if root == destination or destination.is_inside_container(root):
			return false
	return true


func _bounds(objects: Array[Entity]) -> Rect2:
	var rect := objects[0].aabb
	for object in objects:
		rect = rect.merge(object.aabb)
	return rect


func _drop_delta(point: Vector2, rect: Rect2) -> Vector2:
	# 预览和实际放置统一以中心为锚点，跨越方块边界时保持一致。
	return point - rect.get_center()


func _drop() -> void:
	var roots := selection_roots()
	if roots.is_empty():
		cancel()
		return
	var point := get_global_mouse_position()
	var destination := _target_at(point, roots)
	if not _valid_destination(destination, roots):
		cancel()
		return
	var displacement := _drop_delta(point, _bounds(roots))
	var all := entities()
	for object in all:
		for root in roots:
			if object == root or object.is_inside_container(root):
				object.move_without_inertia(object.global_position + displacement)
				break
	for root in roots:
		root.container = destination
	# 新位置作为传播基准，防止下一物理帧对子孙重复施加位移。
	for object in all:
		_last_positions[object] = object.global_position
	refresh_layout()
	_active = false
	_hide_feedback()
	target_root.emit_signal("document_changed")
	(target_root.get_node("History") as History).commit()


func _physics_process(_delta: float) -> void:
	var all := entities()
	var moved := _last_positions.size() != all.size()
	if not moved:
		for object in all:
			if not _last_positions.has(object) or object.global_position != _last_positions[object]:
				moved = true
				break
	if not moved:
		return # The render pass still detects containment, text and size edits.
	all.sort_custom(func(a: Entity, b: Entity) -> bool: return a.container_depth() < b.container_depth())
	for parent in all:
		var old: Vector2 = _last_positions.get(parent, parent.global_position)
		var displacement := parent.global_position - old
		if not displacement.is_zero_approx():
			for child in all:
				if child.container == parent and not child.drag_controlled and not child._release_pending:
					child.move_without_inertia(child.global_position + displacement)
	for object in all:
		_last_positions[object] = object.global_position
	for object in _last_positions.keys():
		if not is_instance_valid(object) or not all.has(object):
			_last_positions.erase(object)
	refresh_layout()


func refresh_layout() -> void:
	var all := entities()
	var inputs := _capture_layout_inputs(all)
	if inputs == _layout_inputs:
		return
	for object in all:
		if not is_instance_valid(object.container):
			object.container = null
		elif not object.container is TextNode or not all.has(object.container) or object.container == object or object.container.is_inside_container(object):
			object.container = null
		object.z_index = mini(object.container_depth(), 64)
	all.sort_custom(func(a: Entity, b: Entity) -> bool: return a.container_depth() > b.container_depth())
	var children_by_parent: Dictionary = {}
	for object in all:
		if is_instance_valid(object.container):
			if not children_by_parent.has(object.container):
				var members: Array[Entity] = []
				children_by_parent[object.container] = members
			children_by_parent[object.container].append(object)
	for object in all:
		if object is TextNode:
			var members: Array[Entity] = children_by_parent.get(object, [] as Array[Entity])
			object.update_container_layout(members)
	_layout_inputs = _capture_layout_inputs(entities())


func _capture_layout_inputs(all: Array[Entity]) -> Array:
	var inputs: Array = []
	for object in all:
		var parent_id := object.container.get_instance_id() if is_instance_valid(object.container) else 0
		var entry := [object.get_instance_id(), parent_id, object.global_transform, object.aabb]
		if object is TextNode:
			entry.append_array([object.label.get_minimum_size(), object.fixed_width, object.fill_color])
		inputs.append(entry)
	return inputs


func reset_tracking() -> void:
	_layout_inputs.clear()
	_last_positions.clear()
	for object in entities():
		_last_positions[object] = object.global_position
	refresh_layout()


func _outline(line: Line2D, rect: Rect2, color: Color) -> void:
	line.default_color = color
	var points: PackedVector2Array = target_root.call("_rounded_selection_rect", rect, 6.0)
	for index in points.size():
		points[index] = line.to_local(points[index])
	line.points = points
	line.closed = true
	line.antialiased = true
	line.joint_mode = Line2D.LINE_JOINT_ROUND
	line.show()


func _hide_feedback() -> void:
	highlight.hide()
	preview.hide()
	hint.hide()
	jump_path.hide()


func _update_jump_path(start: Vector2, end: Vector2, color: Color) -> void:
	# 与 master 的跳跃提示一致：两控制点向上抬起距离的一半，
	# 从选中内容中心连接到实际落点预览的中心。
	jump_path.show()
	var distance := start.distance_to(end)
	var has_span := distance > 1.0
	jump_curve.visible = has_span
	jump_shadow.visible = has_span
	jump_arrow.visible = has_span
	if not has_span:
		return
	var height := distance * 0.5
	var control_1 := start + Vector2(0.0, -height)
	var control_2 := end + Vector2(0.0, -height)
	var points := PackedVector2Array()
	var segments := clampi(int(ceilf(distance / 12.0)), 24, 128)
	for index in range(segments + 1):
		var t := float(index) / float(segments)
		var u := 1.0 - t
		var point := u * u * u * start + 3.0 * u * u * t * control_1 + 3.0 * u * t * t * control_2 + t * t * t * end
		points.append(jump_curve.to_local(point))
	jump_curve.points = points
	jump_curve.gradient.set_color(0, Color(color, 0.0))
	jump_curve.gradient.set_color(1, color)
	jump_shadow.points = PackedVector2Array([jump_shadow.to_local(start), jump_shadow.to_local(end)])
	var line_width := 16.0 if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) else 8.0
	jump_curve.width = line_width
	jump_shadow.width = line_width
	jump_arrow.width = line_width
	jump_arrow.default_color = color
	var arrow_length := 10.0 + distance * 0.01
	jump_arrow.points = PackedVector2Array([
		jump_arrow.to_local(end + Vector2(-arrow_length, -arrow_length * 2.0)),
		jump_arrow.to_local(end),
		jump_arrow.to_local(end + Vector2(arrow_length, -arrow_length * 2.0)),
	])
