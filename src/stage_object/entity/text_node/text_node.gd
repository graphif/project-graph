class_name TextNode
extends Entity

@onready var collision_shape: CollisionShape2D = %CollisionShape
@onready var label: Label = %Label
@onready var text_edit: TextEdit = %TextEdit

@export var text: String = "":
	set(value):
		text = value
		if is_node_ready():
			label.text = value
			call_deferred("_update_collision_shape")

@export var drag_speed: float = 20.0

var is_dragging: bool = false
var drag_offset: Vector2 = Vector2.ZERO


func _ready() -> void:
	label.text = text
	call_deferred("_update_collision_shape")


func _on_label_gui_input(event: InputEvent) -> void:
	# 进入编辑模式
	if label.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			enter_edit_mode()
			get_viewport().set_input_as_handled()
			return

	# 开始 / 结束拖拽
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				is_dragging = true

				# 记录鼠标相对于刚体中心的位置
				drag_offset = get_global_mouse_position() - global_position

				# 拖拽开始时清除原来的速度
				linear_velocity = Vector2.ZERO
				angular_velocity = 0.0
			else:
				is_dragging = false

			return

	# 拖拽
	if event is InputEventMouseMotion and is_dragging:
		var target_position := get_global_mouse_position() - drag_offset
		var difference := target_position - global_position

		# 让刚体追踪鼠标
		linear_velocity = difference * drag_speed

		get_viewport().set_input_as_handled()
		return


func _physics_process(_delta: float) -> void:
	if is_dragging:
		var target_position := get_global_mouse_position() - drag_offset
		var difference := target_position - global_position

		linear_velocity = difference * drag_speed


func _unhandled_input(event: InputEvent) -> void:
	if text_edit.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			if not text_edit.get_global_rect().has_point(event.global_position):
				exit_edit_mode()
				get_viewport().set_input_as_handled()


func enter_edit_mode() -> void:
	text_edit.text = text
	text_edit.text_changed.emit()

	label.hide()
	text_edit.show()

	text_edit.grab_focus()
	text_edit.select_all()


func exit_edit_mode() -> void:
	if label.visible:
		return

	text = text_edit.text

	text_edit.hide()
	label.show()


func _update_collision_shape() -> void:
	var shape := RectangleShape2D.new()
	shape.size = label.size
	collision_shape.shape = shape
