extends Button

const TEXT_NODE = preload("uid://btnefrbc5lowu")


func _on_pressed() -> void:
	for i in range(100):
		var node: TextNode = TEXT_NODE.instantiate()
		node.text = str(i)
		node.position = Vector2(randi_range(1, 1000), randi_range(1, 1000))
		add_child(node)
