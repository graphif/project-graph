extends Button

const TEXT_NODE = preload("uid://btnefrbc5lowu")
@onready var stage: Node2D = %Stage


func _on_pressed() -> void:
	for i in range(100):
		var node: TextNode = TEXT_NODE.instantiate()
		node.text = str(i)
		node.position = Vector2(randi_range(1, 1000), randi_range(1, 1000))
		stage.add_child(node)
