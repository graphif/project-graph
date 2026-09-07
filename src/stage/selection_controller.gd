class_name SelectionController
extends Node2D

# 统一管理 Stage 内的单选、框选、编辑退出和框选视觉反馈。
signal blank_double_clicked(world_position: Vector2)

const BOX_COLOR := Color(0.25, 0.85, 0.35, 0.95)
const BOX_FILL_COLOR := Color(0.25, 0.85, 0.35, 0.10)
const BOX_LINE_WIDTH := 2.0
const BOX_DASH_LENGTH := 8.0
const BOX_DASH_GAP := 5.0
const BOX_DRAG_THRESHOLD := 3.0
const HINT_FONT := preload("res://assets/MiSans-Medium.ttf")
const HINT_FONT_SIZE := 18
const HINT_PADDING := 6.0
const CROSSING_HINT := "碰撞框选"
const ENCLOSURE_HINT := "完全覆盖框选"

@export var target_root: Node
@export var camera: Camera2D

var _entities: Array[Entity] = []
var _selected_entities: Array[Entity] = []
var _is_box_selecting := false
var _box_start := Vector2.ZERO
var _box_end := Vector2.ZERO
var _last_zoom_scale := 1.0


func _ready() -> void:
	if target_root == null:
		target_root = get_parent()
	if camera == null:
		camera = get_viewport().get_camera_2d()

	_entities.clear()
	_selected_entities.clear()
	# StageObject 由 Stage 直接持有，使用子节点信号避免拖拽期间反复扫描整棵场景树。
	for child in target_root.get_children():
		_register_entity(child)
	if not target_root.child_entered_tree.is_connected(_register_entity):
		target_root.child_entered_tree.connect(_register_entity)
	if not target_root.child_exiting_tree.is_connected(_unregister_entity):
		target_root.child_exiting_tree.connect(_unregister_entity)
	_last_zoom_scale = _get_zoom_scale()
	set_process(false)


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var mouse_position := _get_event_world_position(event)
		if event.pressed:
			var entity_at_mouse := _get_entity_at(mouse_position)
			if event.double_click:
				if entity_at_mouse == null:
					blank_double_clicked.emit(mouse_position)
					get_viewport().set_input_as_handled()
				return
			if entity_at_mouse != null:
				return
			_begin_box_selection(mouse_position)
		else:
			if not _is_box_selecting:
				return
			_box_end = mouse_position
			_finish_box_selection()
		get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseMotion and _is_box_selecting:
		_box_end = _get_event_world_position(event)
		_update_box_selection()
		queue_redraw()
		get_viewport().set_input_as_handled()


func _process(_delta: float) -> void:
	var zoom_scale := _get_zoom_scale()
	if not is_equal_approx(zoom_scale, _last_zoom_scale):
		_last_zoom_scale = zoom_scale
		queue_redraw()


func _draw() -> void:
	if not _is_box_selecting:
		return
	var selection_rect := _get_box_rect()
	if selection_rect.size.is_zero_approx():
		return

	draw_rect(selection_rect, BOX_FILL_COLOR, true)
	var zoom_scale := _get_zoom_scale()
	if _is_crossing_selection():
		draw_rect(selection_rect, BOX_COLOR, false, BOX_LINE_WIDTH / zoom_scale, true)
	else:
		SelectionFeedback.draw_dashed_rect(
			self,
			selection_rect,
			BOX_COLOR,
			BOX_LINE_WIDTH / zoom_scale,
			BOX_DASH_LENGTH / zoom_scale,
			BOX_DASH_GAP / zoom_scale,
		)
	_draw_hint(selection_rect)


func select_only(entity: Entity) -> void:
	_register_entity(entity)
	for candidate in _get_entities():
		if candidate != entity and candidate.is_editing():
			candidate.exit_edit_mode()
		_set_selected(candidate, candidate == entity)


func get_selected_entities() -> Array[Entity]:
	var result: Array[Entity] = []
	for entity in _selected_entities:
		if is_instance_valid(entity) and not entity.is_queued_for_deletion():
			result.append(entity)
	return result


func clear_selection(exit_editing := true) -> void:
	for entity in _get_entities():
		if exit_editing and entity.is_editing():
			entity.exit_edit_mode()
		_set_selected(entity, false)


func _begin_box_selection(mouse_position: Vector2) -> void:
	_is_box_selecting = true
	_box_start = mouse_position
	_box_end = mouse_position
	clear_selection()
	_last_zoom_scale = _get_zoom_scale()
	set_process(true)
	queue_redraw()


func _finish_box_selection() -> void:
	var threshold := BOX_DRAG_THRESHOLD / _get_zoom_scale()
	if _box_start.distance_to(_box_end) >= threshold:
		_update_box_selection()
	else:
		clear_selection(false)
	_is_box_selecting = false
	set_process(false)
	queue_redraw()


func _update_box_selection() -> void:
	var selection_rect := _get_box_rect()
	var is_crossing := _is_crossing_selection()
	for entity in _get_entities():
		var entity_rect := entity.aabb
		_set_selected(
			entity,
			selection_rect.intersects(entity_rect, true)
			if is_crossing
			else selection_rect.encloses(entity_rect),
		)


func _set_selected(entity: Entity, value: bool) -> void:
	entity.set_selected(value)
	if value:
		if not _selected_entities.has(entity):
			_selected_entities.append(entity)
	else:
		_selected_entities.erase(entity)


func _get_box_rect() -> Rect2:
	var top_left := Vector2(
		minf(_box_start.x, _box_end.x),
		minf(_box_start.y, _box_end.y),
	)
	return Rect2(
		top_left,
		Vector2(absf(_box_end.x - _box_start.x), absf(_box_end.y - _box_start.y)),
	)


func _get_event_world_position(event: InputEventMouse) -> Vector2:
	return get_canvas_transform().affine_inverse() * event.position


func _is_crossing_selection() -> bool:
	return _box_end.x >= _box_start.x


func _draw_hint(selection_rect: Rect2) -> void:
	var hint := CROSSING_HINT if _is_crossing_selection() else ENCLOSURE_HINT
	if not _hint_fits(selection_rect, hint):
		return

	var hint_anchor := Vector2(selection_rect.position.x, selection_rect.end.y)
	var inverse_zoom := Vector2(
		1.0 / maxf(absf(camera.zoom.x), 0.001),
		1.0 / maxf(absf(camera.zoom.y), 0.001),
	)
	draw_set_transform(hint_anchor, 0.0, inverse_zoom)
	draw_string(
		HINT_FONT,
		Vector2(
			HINT_PADDING,
			-HINT_PADDING - HINT_FONT.get_descent(HINT_FONT_SIZE),
		),
		hint,
		HORIZONTAL_ALIGNMENT_LEFT,
		-1.0,
		HINT_FONT_SIZE,
		BOX_COLOR,
	)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _hint_fits(selection_rect: Rect2, hint: String) -> bool:
	var text_size := HINT_FONT.get_string_size(
		hint,
		HORIZONTAL_ALIGNMENT_LEFT,
		-1,
		HINT_FONT_SIZE,
	)
	var screen_rect_size := selection_rect.size * camera.zoom.abs()
	var required_screen_size := Vector2(
		text_size.x + HINT_PADDING * 2.0,
		HINT_FONT.get_height(HINT_FONT_SIZE) + HINT_PADDING * 2.0,
	)
	return screen_rect_size.x >= required_screen_size.x and screen_rect_size.y >= required_screen_size.y


func _get_entity_at(point: Vector2) -> Entity:
	var entities := _get_entities()
	for i in range(entities.size() - 1, -1, -1):
		if entities[i].get_interaction_aabb().has_point(point):
			return entities[i]
	return null


func _get_entities() -> Array[Entity]:
	var result: Array[Entity] = []
	for entity in _entities:
		if is_instance_valid(entity) and not entity.is_queued_for_deletion():
			result.append(entity)
	return result


func _register_entity(node: Node) -> void:
	if node is Entity and not _entities.has(node):
		var entity := node as Entity
		_entities.append(entity)
		if entity.is_selected() and not _selected_entities.has(entity):
			_selected_entities.append(entity)


func _unregister_entity(node: Node) -> void:
	if node is Entity:
		_entities.erase(node)
		_selected_entities.erase(node)


func _get_zoom_scale() -> float:
	return maxf(absf(camera.zoom.x), 0.001) if camera != null else 1.0
