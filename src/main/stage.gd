extends Node2D

const TEXT_NODE = preload("uid://btnefrbc5lowu")
@onready var popup_menu: PopupMenu = $PopupMenu


func _ready() -> void:
	for i in range(100):
		var node: TextNode = TEXT_NODE.instantiate()
		node.text = str(i)
		node.position = Vector2(randi_range(1, 1000), randi_range(1, 1000))
		add_child(node)

		# 设置当前节点的 owner 为 Stage（如果 TextNode 内部还有子节点，也需要递归设置）
		_set_owner_recursive(node, self)


# 递归设置节点及其所有子孙的 owner
func _set_owner_recursive(node: Node, new_owner: Node) -> void:
	node.owner = new_owner
	for child in node.get_children():
		_set_owner_recursive(child, new_owner)


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
