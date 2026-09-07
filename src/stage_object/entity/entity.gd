class_name Entity
extends StageObject

const SELECTION_COLOR := Color(0.25, 0.85, 0.35, 0.95)
const SELECTION_LINE_WIDTH := 3.0
const SELECTION_MARGIN := 4.0
const SELECTION_CORNER_RADIUS := 10.0
const EDIT_DASH_LENGTH := 8.0
const EDIT_DASH_GAP := 5.0

@export var drag_speed: float = 20.0

var is_dragging: bool = false
var drag_offset: Vector2 = Vector2.ZERO
var _history: History
var _last_feedback_zoom_scale := 1.0
# 选中和编辑都是运行时状态，使用私有字段避免写入项目文件。
var _is_selected := false:
	set(value):
		if _is_selected == value:
			return
		_is_selected = value
		queue_redraw()
var _is_editing := false:
	set(value):
		if _is_editing == value:
			return
		_is_editing = value
		queue_redraw()


func _ready() -> void:
	_history = _find_history()
	_last_feedback_zoom_scale = _get_feedback_zoom_scale()


func _on_input_event(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_request_selection()
			if _history != null:
				_history.begin_transaction()
			is_dragging = true
			drag_offset = get_global_mouse_position() - global_position
			linear_velocity = Vector2.ZERO
			angular_velocity = 0.0
		else:
			is_dragging = false
			if _history != null:
				_history.commit()
		get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseMotion and is_dragging:
		_update_drag_velocity()
		get_viewport().set_input_as_handled()


func _physics_process(_delta: float) -> void:
	if is_dragging:
		_update_drag_velocity()


func _process(_delta: float) -> void:
	if not _is_selected and not _is_editing:
		return
	var zoom_scale := _get_feedback_zoom_scale()
	if not is_equal_approx(zoom_scale, _last_feedback_zoom_scale):
		_last_feedback_zoom_scale = zoom_scale
		queue_redraw()


func _update_drag_velocity() -> void:
	var target_position := get_global_mouse_position() - drag_offset
	linear_velocity = (target_position - global_position) * drag_speed


func _draw() -> void:
	# 编辑态的虚线框优先于选中态的实线框。
	if not _is_selected and not _is_editing:
		return

	var feedback_rect := _get_feedback_rect()
	if feedback_rect.size.is_zero_approx():
		return
	var zoom_scale := _get_feedback_zoom_scale()
	_last_feedback_zoom_scale = zoom_scale
	feedback_rect = feedback_rect.grow(SELECTION_MARGIN / zoom_scale)
	if _is_editing:
		SelectionFeedback.draw_dashed_rect(
			self,
			feedback_rect,
			SELECTION_COLOR,
			SELECTION_LINE_WIDTH / zoom_scale,
			EDIT_DASH_LENGTH / zoom_scale,
			EDIT_DASH_GAP / zoom_scale,
		)
	else:
		SelectionFeedback.draw_rounded_rect(
			self,
			feedback_rect,
			SELECTION_COLOR,
			SELECTION_LINE_WIDTH / zoom_scale,
			SELECTION_CORNER_RADIUS / zoom_scale,
		)


func _get_feedback_rect() -> Rect2:
	var result := Rect2()
	var initialized := false
	for child in get_children():
		if not child is CollisionShape2D:
			continue
		var collision_shape := child as CollisionShape2D
		if collision_shape.shape == null:
			continue
		var shape_rect := collision_shape.shape.get_rect()
		var corners := PackedVector2Array(
			[
				shape_rect.position,
				Vector2(shape_rect.end.x, shape_rect.position.y),
				shape_rect.end,
				Vector2(shape_rect.position.x, shape_rect.end.y),
			]
		)
		for corner in corners:
			var local_point := to_local(collision_shape.to_global(corner))
			if not initialized:
				result = Rect2(local_point, Vector2.ZERO)
				initialized = true
			else:
				result = result.expand(local_point)
	return result


func _request_selection() -> void:
	# 由 Stage 统一清理其他节点的选中或编辑状态。
	var stage := _find_stage()
	if stage != null:
		stage.select_only(self)
	else:
		set_selected(true)


func set_selected(value: bool) -> void:
	_is_selected = value


func is_selected() -> bool:
	return _is_selected


func set_editing(value: bool) -> void:
	_is_editing = value


func is_editing() -> bool:
	return _is_editing


func exit_edit_mode() -> void:
	set_editing(false)


func get_interaction_aabb() -> Rect2:
	# 编辑框可能比原碰撞框更大，Stage 用该范围判断鼠标是否仍在节点上。
	var local_rect := _get_feedback_rect()
	var corners := PackedVector2Array(
		[
			local_rect.position,
			Vector2(local_rect.end.x, local_rect.position.y),
			local_rect.end,
			Vector2(local_rect.position.x, local_rect.end.y),
		]
	)
	var result := Rect2()
	for i in range(corners.size()):
		var global_point := to_global(corners[i])
		result = Rect2(global_point, Vector2.ZERO) if i == 0 else result.expand(global_point)
	return result


func _find_stage() -> Stage:
	var node := get_parent()
	while node != null:
		if node is Stage:
			return node as Stage
		node = node.get_parent()
	return null


func _get_feedback_zoom_scale() -> float:
	var active_camera := get_viewport().get_camera_2d()
	return maxf(absf(active_camera.zoom.x), 0.001) if active_camera != null else 1.0


func _find_history() -> History:
	var node: Node = self
	while node != null:
		var history := node.get_node_or_null("History") as History
		if history != null:
			return history
		node = node.get_parent()
	return null
