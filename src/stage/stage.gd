class_name Stage
extends Node2D

signal file_error(message: String)
signal file_saved(path: String)
signal file_loaded(path: String)
signal selection_changed
signal document_changed
signal context_requested(world_position: Vector2)

@onready var history: History = %History
@onready var camera: Camera2D = $Camera

var current_file_path := ""
var created_at := ""
var selected_ids := PackedStringArray()
var _saved_snapshot: Dictionary = {}
var _selection_lines: Dictionary = {}
var _marquee_start := Vector2.ZERO
var _marquee_active := false
var _marquee_toggle := false
var _stroke: PenStroke



func _ready() -> void:
	_saved_snapshot = StageObjectRegistry.capture(self)
	apply_preferences()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventWithModifiers and event.alt_pressed:
		return
	if not event is InputEventMouseButton or not event.pressed or event.button_index != MOUSE_BUTTON_LEFT:
		return
	var world_position: Vector2 = get_canvas_transform().affine_inverse() * event.position
	var mode := int(GraphPreferences.value("left_mode"))
	if mode == 1:
		history.begin_transaction()
		_stroke = StageObjectRegistry.get_scene("pen_stroke").instantiate() as PenStroke
		_stroke.position = world_position
		add_child(_stroke)
		_stroke.points = PackedVector2Array([Vector2.ZERO])
	elif mode == 0 and edge_at(world_position) != null:
		var edge := edge_at(world_position)
		select_object(edge, event.ctrl_pressed or event.meta_pressed)
		if event.double_click:
			edge.enter_edit_mode()
	elif mode == 0 and event.double_click:
		var node := create_text_node("...", world_position)
		node.enter_edit_mode()
	elif mode == 0:
		_marquee_start = world_position
		_marquee_active = true
		_marquee_toggle = event.ctrl_pressed or event.meta_pressed
		if not _marquee_toggle:
			select_ids(PackedStringArray())
	else:
		return
	get_viewport().set_input_as_handled()


func _input(event: InputEvent) -> void:
	if $EntityLayerMover.handle_input(event):
		get_viewport().set_input_as_handled()
		return
	if _stroke != null and is_instance_valid(_stroke):
		if event is InputEventMouseMotion:
			var point := _stroke.to_local(get_global_mouse_position())
			if _stroke.points[-1].distance_squared_to(point) > 4.0:
				var points := _stroke.points
				points.append(point)
				_stroke.points = points
			get_viewport().set_input_as_handled()
		elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
			finish_interaction()
			get_viewport().set_input_as_handled()
	elif _marquee_active:
		if event is InputEventMouseMotion:
			_update_marquee()
			get_viewport().set_input_as_handled()
		elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
			_finish_marquee()
			get_viewport().set_input_as_handled()


func _process(_delta: float) -> void:
	_refresh_selection_outlines()
	if (_marquee_active or is_instance_valid(_stroke)) and not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		finish_interaction()


func create_text_node(content: String, world_position: Vector2, record_history := true) -> TextNode:
	if record_history:
		history.begin_transaction()
	var node: TextNode = StageObjectRegistry.get_scene("text_node").instantiate()
	node.text = content
	node.position = world_position
	add_child(node)
	apply_object_preferences(node)
	select_ids(PackedStringArray([node.id]))
	if record_history:
		history.commit()
	document_changed.emit()
	return node


func stage_objects() -> Array[StageObject]:
	var result: Array[StageObject] = []
	for child in get_children():
		if child is StageObject and not child.is_queued_for_deletion():
			result.append(child)
	return result


func drag_entities() -> Array[Entity]:
	return $EntityLayerMover.selection_roots()


func selected_objects() -> Array[StageObject]:
	var result: Array[StageObject] = []
	for object in stage_objects():
		if selected_ids.has(object.id):
			result.append(object)
	return result


func select_ids(ids: PackedStringArray) -> void:
	selected_ids = ids
	selection_changed.emit()


func select_object(object: StageObject, toggle := false) -> void:
	if toggle:
		var index := selected_ids.find(object.id)
		if index >= 0:
			selected_ids.remove_at(index)
		else:
			selected_ids.append(object.id)
	elif not selected_ids.has(object.id):
		selected_ids = PackedStringArray([object.id])
	selection_changed.emit()


func select_all() -> void:
	var ids := PackedStringArray()
	for object in stage_objects():
		ids.append(object.id)
	select_ids(ids)


func _update_marquee() -> void:
	var end := get_global_mouse_position()
	var rect := Rect2(_marquee_start, end - _marquee_start).abs()
	var line := $SelectionOverlay/Marquee as Line2D
	line.points = PackedVector2Array([rect.position, Vector2(rect.end.x, rect.position.y), rect.end, Vector2(rect.position.x, rect.end.y)])
	line.show()


func _finish_marquee() -> void:
	var end := get_global_mouse_position()
	var rect := Rect2(_marquee_start, end - _marquee_start).abs()
	_marquee_active = false
	$SelectionOverlay/Marquee.hide()
	if rect.size.length_squared() < 9.0:
		return
	var ids := selected_ids.duplicate() if _marquee_toggle else PackedStringArray()
	for object in stage_objects():
		var hit := rect.encloses(object.aabb) if end.x >= _marquee_start.x else rect.intersects(object.aabb)
		if hit:
			var index := ids.find(object.id)
			if _marquee_toggle and index >= 0:
				ids.remove_at(index)
			else:
				ids.append(object.id)
	select_ids(ids)


func _refresh_selection_outlines() -> void:
	var live := {}
	for object in selected_objects():
		live[object.id] = true
		var line := _selection_lines.get(object.id) as Line2D
		if line == null:
			line = Line2D.new()
			line.default_color = Color("#cba6f7")
			line.closed = true
			line.antialiased = true
			line.joint_mode = Line2D.LINE_JOINT_ROUND
			$SelectionOverlay.add_child(line)
			_selection_lines[object.id] = line
		line.width = 2.0 / maxf(camera.zoom.x, 0.01)
		line.default_color = Color("#418856") if _applied_theme_light == 1 else Color("#cba6f7")
		var rect: Rect2 = object.get_visual_rect() if object is TextNode else object.aabb
		var points := _rounded_selection_rect(rect, 6.0)
		for i in points.size():
			var world_point := object.to_global(points[i]) if object is TextNode else points[i]
			points[i] = line.to_local(world_point)
		line.points = points
	for id in _selection_lines.keys():
		if not live.has(id):
			_selection_lines[id].queue_free()
			_selection_lines.erase(id)


func delete_objects(objects: Array[StageObject]) -> void:
	if objects.is_empty():
		return
	$EntityLayerMover.cancel()
	finish_text_editing()
	var targets := objects.duplicate()
	# 删除容器同时删除其内容；引用这些对象的连线随后一并清理。
	for object in stage_objects():
		if object is Entity:
			for root in objects:
				if root is Entity and object.is_inside_container(root) and not targets.has(object):
					targets.append(object)
					break
	for object in stage_objects():
		if object is LineEdge and (targets.has(object.source) or targets.has(object.target)) and not targets.has(object):
			targets.append(object)
	history.begin_transaction()
	for object in targets:
		remove_child(object)
		object.queue_free()
	$EntityLayerMover.reset_tracking()
	select_ids(PackedStringArray())
	history.commit()
	document_changed.emit()


func finish_interaction() -> void:
	$EntityLayerMover.cancel()
	$LineEdgeCreator.cancel_drag()
	$StageObjectSlicer._cancel_slice()
	if is_instance_valid(_stroke):
		if _stroke.points.size() < 2:
			remove_child(_stroke)
			_stroke.queue_free()
		_stroke = null
		history.commit()
	if _marquee_active:
		_finish_marquee()
	for object in stage_objects():
		if object is Entity:
			object.finish_drag()


func is_dirty() -> bool:
	for object in stage_objects():
		if object is LineEdge and object.is_text_dirty():
			return true
		if object is TextNode and object.text_edit.visible and object.text_edit.text != object.text:
			return true
	return JSON.stringify(StageObjectRegistry.capture(self)) != JSON.stringify(_saved_snapshot)


func apply_object_preferences(object: StageObject, theme_light: Variant = null) -> void:
	if object is TextNode:
		object._apply_appearance(false, theme_light)
	if object is Entity:
		object.collision_mask = 0


# -1 表示尚未同步；后台标签页在重新显示前调用 apply_theme。
var _applied_theme_light := -1


func apply_theme(light: bool) -> void:
	if _applied_theme_light == int(light):
		return
	var grid_material := $CanvasLayer/Grid.material as ShaderMaterial
	if grid_material != null:
		grid_material.set_shader_parameter("bg_color", Color("#ffffff") if light else Color("#1e1e2e"))
		grid_material.set_shader_parameter("grid_color", Color("#dce0e8") if light else Color("#313244"))
	for object in stage_objects():
		if object is TextNode:
			object._apply_appearance(false, light)
	_applied_theme_light = int(light)


func apply_preferences(theme_light: Variant = null) -> void:
	var light: bool = GraphPreferences.value("theme") == "light" if theme_light == null else bool(theme_light)
	camera.max_speed = float(GraphPreferences.value("camera_speed"))
	var grid_material := $CanvasLayer/Grid.material as ShaderMaterial
	if grid_material != null:
		grid_material.set_shader_parameter("show_horizontal", GraphPreferences.value("grid_h"))
		grid_material.set_shader_parameter("show_vertical", GraphPreferences.value("grid_v"))
		grid_material.set_shader_parameter("show_dots", GraphPreferences.value("grid_dots"))
	$SelectionOverlay/Marquee.default_color = Color("#cba6f7")
	for object in stage_objects():
		apply_object_preferences(object, light)
	# 完整设置更新也覆盖刚加载、恢复的对象。
	_applied_theme_light = -1
	apply_theme(light)


func focus_objects(objects: Array[StageObject]) -> void:
	if objects.is_empty():
		return
	var bounds := objects[0].aabb
	for object in objects:
		bounds = bounds.merge(object.aabb)
	camera.target_position = bounds.get_center()
	var available := Vector2(get_viewport_rect().size) - Vector2(160, 140)
	var factor := minf(available.x / maxf(bounds.size.x, 1.0), available.y / maxf(bounds.size.y, 1.0))
	factor = clampf(factor, camera.min_zoom, camera.max_zoom)
	camera.target_zoom = Vector2.ONE * factor
	camera.velocity = Vector2.ZERO


func finish_text_editing() -> void:
	for child in get_children():
		if child is TextNode or child is LineEdge:
			child.exit_edit_mode()


func save_to_file(path: String) -> bool:
	finish_interaction()
	finish_text_editing()
	$EntityLayerMover.refresh_layout()
	var snapshot := StageObjectRegistry.capture(self)
	var camera_state := {
		"position": [camera.target_position.x, camera.target_position.y],
		"zoom": camera.target_zoom.x,
	}
	var result := ProjectFile.save(path, snapshot, camera_state, created_at)
	if not result.ok:
		file_error.emit(result.error)
		return false
	current_file_path = path
	created_at = result.created_at
	_saved_snapshot = snapshot.duplicate(true)
	file_saved.emit(path)
	return true


func load_from_file(path: String) -> bool:
	var result := ProjectFile.load(path)
	if not result.ok:
		file_error.emit(result.error)
		return false
	await StageObjectRegistry.restore(self, result.graph)
	var camera_state: Dictionary = result.graph.get("camera", { })
	var position: Variant = _decode_vector2(camera_state.get("position"))
	if position != null:
		camera.target_position = position
	if camera_state.get("zoom") is float or camera_state.get("zoom") is int:
		var zoom := float(camera_state.zoom)
		camera.target_zoom = Vector2(zoom, zoom)
	history.clear()
	current_file_path = path
	created_at = str(result.metadata.get("created_at", ""))
	_saved_snapshot = StageObjectRegistry.capture(self)
	apply_preferences()
	select_ids(PackedStringArray())
	file_loaded.emit(path)
	return true


func _decode_vector2(value):
	if not value is Array or value.size() != 2:
		return null
	if not(value[0] is float or value[0] is int) or not(value[1] is float or value[1] is int):
		return null
	return Vector2(float(value[0]), float(value[1]))


func _rounded_selection_rect(rect: Rect2, radius: float) -> PackedVector2Array:
	var points := PackedVector2Array()
	radius = minf(radius, minf(rect.size.x, rect.size.y) * 0.5)
	var centers := [rect.position + Vector2(radius, radius),
		Vector2(rect.end.x - radius, rect.position.y + radius),
		rect.end - Vector2(radius, radius),
		Vector2(rect.position.x + radius, rect.end.y - radius)]
	for corner in 4:
		for step in 9:
			var angle := PI + float(corner) * PI * 0.5 + float(step) / 8.0 * PI * 0.5
			points.append(centers[corner] + Vector2.from_angle(angle) * radius)
	return points


func edge_at(world_point: Vector2) -> LineEdge:
	var nearest: LineEdge
	var distance := 7.0 / maxf(camera.zoom.x, 0.01)
	for object in stage_objects():
		if object is LineEdge and object.is_visible_in_tree():
			var candidate: float = object.distance_to_point(world_point)
			if candidate < distance:
				distance = candidate
				nearest = object
	return nearest
