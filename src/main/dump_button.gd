extends Button

@onready var stage: Node2D = %Stage


func dump_stage_filtered_direct(file_path: String) -> Error:
	if not stage:
		push_error("未找到 Stage 节点！")
		return FAILED

	# 1. 收集所有不符合条件（根节点脚本未继承 StageObject）的子节点
	var detached_children: Array[Node] = []

	for child in stage.get_children():
		if not _is_root_inherits_stage_object(child):
			detached_children.append(child)

	# 2. 临时将不符合条件的节点从 %Stage 中移出（不破坏内存，仅脱离画布树）
	for child in detached_children:
		stage.remove_child(child)

	# 3. 直接对 %Stage 进行打包
	var packed_scene = PackedScene.new()
	var pack_result = packed_scene.pack(stage)

	# 4. 立即把脱离的节点重新加回 %Stage，恢复原画布状态
	for i in range(detached_children.size()):
		stage.add_child(detached_children[i])
		# 如果需要保持原有的渲染/节点顺序，可以根据需要调整 move_child，或者简单直接加回

	if pack_result != OK:
		push_error("打包失败，错误码: %d" % pack_result)
		return pack_result

	# 5. 保存文件
	var save_result = ResourceSaver.save(packed_scene, file_path)
	if save_result == OK:
		print("成功将符合 StageObject 的子节点打包至: ", file_path)
	else:
		push_error("保存失败，错误码: %d" % save_result)

	return save_result


# 检测一个节点（或其场景根节点）的脚本是否继承自 StageObject
func _is_root_inherits_stage_object(node: Node) -> bool:
	var script: Script = node.get_script()
	if not script:
		return false

	var s = script
	while s:
		# 检查全局类名是否为 StageObject，或者匹配其脚本 UID
		if s.get_global_name() == &"StageObject" or s.resource_path == "uid://3pt2cbccx0se":
			return true
		s = s.get_base_script()

	return false


func _on_pressed() -> void:
	dump_stage_filtered_direct("user://dumped_stage.tscn")
