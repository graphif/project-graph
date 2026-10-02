class_name PenStroke
extends Entity

@export var points := PackedVector2Array():
	set(value):
		points = value
		notify_persistent_change()
		if is_node_ready():
			_update_geometry()
@export var stroke_color := Color("#cba6f7"):
	set(value):
		stroke_color = value
		notify_persistent_change()
		if is_node_ready():
			_update_geometry()
@export var stroke_width := 4.0:
	set(value):
		stroke_width = maxf(1.0, value)
		notify_persistent_change()
		if is_node_ready():
			_update_geometry()
@onready var line: Line2D = $Line
@onready var collision: CollisionShape2D = $CollisionShape


func _ready() -> void:
	super()
	_update_geometry()


func _update_geometry() -> void:
	invalidate_geometry()
	line.points = points
	line.default_color = stroke_color
	line.width = stroke_width
	if points.size() < 2:
		collision.shape = null
		return
	var bounds := Rect2(points[0], Vector2.ZERO)
	for point in points:
		bounds = bounds.expand(point)
	var shape := RectangleShape2D.new()
	shape.size = bounds.size.max(Vector2.ONE * stroke_width)
	collision.shape = shape
	collision.position = bounds.get_center()
