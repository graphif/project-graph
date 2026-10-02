extends PanelContainer

@export var preferred_width: float = 500.0

var _dragging := false
var _drag_offset := Vector2.ZERO


func _ready() -> void:
	var drag_handle := get_node_or_null("Margin/Content/TitleRow") as Control
	if drag_handle:
		drag_handle.mouse_filter = Control.MOUSE_FILTER_STOP
		drag_handle.gui_input.connect(_on_drag_handle_input)
	get_parent().resized.connect(_queue_layout)
	minimum_size_changed.connect(_queue_layout)
	visibility_changed.connect(_queue_layout)
	_queue_layout()


func _on_drag_handle_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_dragging = event.pressed
		if _dragging:
			_drag_offset = get_local_mouse_position()
		else:
			_drag_offset = Vector2.ZERO
			get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseMotion and _dragging:
		var parent_control := get_parent() as Control
		if parent_control:
			var next_position := parent_control.get_local_mouse_position() - _drag_offset
			var max_position := parent_control.size - size
			position = Vector2(
				clampf(next_position.x, 0.0, max_position.x),
				clampf(next_position.y, 0.0, max_position.y)
			)
		get_viewport().set_input_as_handled()


func _queue_layout() -> void:
	_fit_to_parent.call_deferred()


func _fit_to_parent() -> void:
	var available: Vector2 = get_parent().size
	var horizontal_margin := minf(24.0, maxf(8.0, available.x * 0.05))
	var width := minf(preferred_width, maxf(0.0, available.x - horizontal_margin * 2.0))
	size = Vector2(width, 0.0)
	position = ((available - size) * 0.5).round()
