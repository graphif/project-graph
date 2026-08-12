extends Node2D

const TEXT_NODE = preload("uid://btnefrbc5lowu")
@onready var popup_menu: PopupMenu = %PopupMenu


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			var node: TextNode = TEXT_NODE.instantiate()
			node.text = "..."
			node.position = get_global_mouse_position()
			print(event.position)
			add_child(node)
			get_viewport().set_input_as_handled()
		if event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			popup_menu.position = event.position
			popup_menu.popup()
			get_viewport().set_input_as_handled()
