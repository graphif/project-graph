extends Label

# 是否忽略内置的 ui_* 动作
@export var ignore_ui_actions: bool = true

# 忽略数值小于该门槛的轻微晃动（主要用于手柄摇杆漂移）
@export_range(0.0, 0.5) var deadzone: float = 0.05


func _process(_delta: float) -> void:
	var active_data: Array[String] = []

	# 遍历 InputMap 中的所有动作
	for action in InputMap.get_actions():
		# 过滤内置 UI 动作
		if ignore_ui_actions and action.begins_with("ui_"):
			continue

		# 获取动作强度数值 (0.0 到 1.0 之间)
		var strength := Input.get_action_strength(action)

		# 仅展示被激活的动作（大于死区门槛）
		if strength > deadzone:
			var is_pressed := Input.is_action_pressed(action)
			# 格式化示例：move_right: true (1.00)
			active_data.append("%s: %s (%.2f)" % [action, is_pressed, strength])

	# 如果有触发的动作则按行拼接，无触发时显示默认文本
	if active_data.size() > 0:
		text = "\n".join(active_data)
	else:
		text = "无输入"
