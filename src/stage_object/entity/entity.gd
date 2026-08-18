class_name Entity
extends StageObject

@export var drag_speed: float = 20.0

var is_dragging: bool = false
var drag_offset: Vector2 = Vector2.ZERO
var _history: History


func _ready() -> void:
	_history = _find_history()


func _on_input_event(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
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
		return

	if event is InputEventMouseMotion and is_dragging:
		_update_drag_velocity()
		get_viewport().set_input_as_handled()


func _physics_process(_delta: float) -> void:
	if is_dragging:
		_update_drag_velocity()


func _update_drag_velocity() -> void:
	var target_position := get_global_mouse_position() - drag_offset
	linear_velocity = (target_position - global_position) * drag_speed


func _find_history() -> History:
	var node: Node = self
	while node != null:
		var history := node.get_node_or_null("History") as History
		if history != null:
			return history
		node = node.get_parent()
	return null
