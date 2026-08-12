class_name TextNode
extends Entity

@onready var label: Label = $Label
@onready var text_edit: TextEdit = $TextEdit

@export var text: String = "":
	set(value):
		text = value
		if is_node_ready():
			label.text = value


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	super._ready()
	label.text = text


func _gui_input(event: InputEvent) -> void:
	if label.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			enter_edit_mode()
			get_viewport().set_input_as_handled()


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


func exit_edit_mode() -> void:
	if label.visible:
		return
	text = text_edit.text
	text_edit.hide()
	label.show()
