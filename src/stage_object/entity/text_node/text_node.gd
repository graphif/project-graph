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

var _text_before_edit := ""


func _ready() -> void:
	super()
	label.text = text
	call_deferred("_update_collision_shape")


func _on_label_gui_input(event: InputEvent) -> void:
	# 进入编辑模式
	if label.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			enter_edit_mode()
			get_viewport().set_input_as_handled()
			return

	super._on_input_event(get_viewport(), event, 0)


func _unhandled_input(event: InputEvent) -> void:
	if text_edit.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			if not text_edit.get_global_rect().has_point(event.global_position):
				exit_edit_mode()
				get_viewport().set_input_as_handled()


func enter_edit_mode() -> void:
	_text_before_edit = text
	text_edit.text = text
	text_edit.text_changed.emit()

	label.hide()
	text_edit.show()

	text_edit.grab_focus()
	text_edit.select_all()


func exit_edit_mode() -> void:
	if label.visible:
		return

	if text != text_edit.text:
		if _history != null:
			_history.begin_transaction()
		text = text_edit.text
		if _history != null:
			_history.commit()

	text_edit.hide()
	label.show()


func _update_collision_shape() -> void:
	var shape := RectangleShape2D.new()
	shape.size = label.size
	collision_shape.shape = shape
