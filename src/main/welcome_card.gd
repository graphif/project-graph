extends PanelContainer

@export var preferred_width: float = 500.0


func _ready() -> void:
	get_parent().resized.connect(_queue_layout)
	minimum_size_changed.connect(_queue_layout)
	visibility_changed.connect(_queue_layout)
	_queue_layout()


func _queue_layout() -> void:
	_fit_to_parent.call_deferred()


func _fit_to_parent() -> void:
	var available: Vector2 = get_parent().size
	var width := minf(preferred_width, maxf(280.0, available.x - 48.0))
	size = Vector2(width, 0.0)
	position = ((available - size) * 0.5).round()
