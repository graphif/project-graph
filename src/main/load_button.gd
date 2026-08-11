extends Button

@onready var stage: Node2D = %Stage


func load_dumped_scene(file_path: String) -> void:
	# 1. 检查文件是否存在
	if not FileAccess.file_exists(file_path):
		push_error("存档文件不存在: " + file_path)
		return

	# 2. 加载 PackedScene 资源
	var packed_scene = ResourceLoader.load(file_path) as PackedScene
	if not packed_scene:
		push_error("加载 PackedScene 失败: " + file_path)
		return

	# 3. 实例化场景
	var loaded_scene_node = packed_scene.instantiate()
	if not loaded_scene_node:
		push_error("实例化场景失败")
		return

	# 4. 将加载出来的节点添加到当前树中（例如作为 Stage 的子节点或替换现有 Stage）
	stage.add_child(loaded_scene_node)
	print("场景加载并实例化成功！")


func _on_pressed() -> void:
	load_dumped_scene("user://dumped_stage.tscn")
