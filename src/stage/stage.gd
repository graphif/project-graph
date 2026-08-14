extends Node2D

const TEXT_NODE = preload("uid://btnefrbc5lowu")
@export var popup_menu: PopupMenu


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			var node: TextNode = TEXT_NODE.instantiate()
			node.text = "..."
			node.position = get_global_mouse_position()
			add_child(node, OS.is_debug_build())
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_RIGHT and not event.pressed:
			popup_menu.position = get_tree().root.get_mouse_position()
			popup_menu.popup()
			get_viewport().set_input_as_handled()
