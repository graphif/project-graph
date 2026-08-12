class_name LineEdge
extends Association

@onready var line: Line2D = $Line
@onready var arrow_head: Polygon2D = $Head

@export var source: Entity
@export var target: Entity
@export var source_uv: Vector2 = Vector2(0.5, 0.5)
@export var target_uv: Vector2 = Vector2(0.5, 0.5)


func _ready() -> void:
	while line.get_point_count() < 2:
		line.add_point(Vector2.ZERO)


func _process(_delta: float) -> void:
	if not is_instance_valid(source) or not is_instance_valid(target):
		if visible:
			hide()
		return

	if not visible:
		show()

	var p1 = source.position + source.size * source_uv
	var p2 = target.position + target.size * target_uv

	# 更新线段
	line.set_point_position(0, p1)
	line.set_point_position(1, p2)

	# 更新箭头位置和旋转角度
	if arrow_head:
		arrow_head.position = p2
		# 计算从 source 指向 target 的方向角
		var direction = (p2 - p1)
		if direction.length_squared() > 0.001:
			arrow_head.rotation = direction.angle()
