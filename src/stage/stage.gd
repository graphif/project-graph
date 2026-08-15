extends Node2D

@onready var history: History = %History
const TEXT_NODE = preload("uid://btnefrbc5lowu")


func _process(delta):
	if Input.is_action_just_pressed("history_undo", true):
		history.undo()
	if Input.is_action_just_pressed("history_redo", true):
		history.redo()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			var node: TextNode = TEXT_NODE.instantiate()
			node.text = "..."
			node.position = get_global_mouse_position()
			add_child(node)
			get_viewport().set_input_as_handled()
			history.commit()
		#elif event.button_index == MOUSE_BUTTON_RIGHT and not event.pressed:
		#popup_menu.position = get_tree().root.get_mouse_position()
		#popup_menu.popup()
		#get_viewport().set_input_as_handled()
