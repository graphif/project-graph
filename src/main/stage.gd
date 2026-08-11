extends Node2D

const TEXT_NODE = preload("uid://btnefrbc5lowu")


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
