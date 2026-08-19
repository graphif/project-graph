extends PopupMenu

@onready var tab_container: TabContainer = %TabContainer
const TEXT_NODE := preload("uid://btnefrbc5lowu")


func _on_id_pressed(id: int) -> void:
	match id:
		0:
			var stage: Stage = tab_container.get_current_stage()
			for i in range(100):
				var text_node := TEXT_NODE.instantiate()
				text_node.text = str(i)
				text_node.position = Vector2(randi_range(1, 1000), randi_range(1, 1000))
				stage.add_child(text_node)
