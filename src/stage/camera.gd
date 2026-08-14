extends Camera2D

@export_group("网格渲染")
## 绑定网格 ColorRect 的 ShaderMaterial
@export var grid_material: ShaderMaterial

@export_group("移动设置")
## 键盘移动最大速度（像素/秒，基于默认缩放为 1.0 时的视觉基准）
@export var max_speed: float = 800.0
## 移动平滑阻尼系数
@export var move_friction: float = 15.0

@export_group("缩放设置")
## 每次滚动滚轮增加/减少的缩放比例（离散输入）
@export var zoom_step: float = 0.15
## 手柄/键盘按住时的缩放速度（连续输入，倍率/秒）
@export var zoom_speed: float = 2.0
## 最小缩放限制（数值越小看得越远）
@export var min_zoom: float = 0.5
## 最大缩放限制（数值越大看得越近）
@export var max_zoom: float = 3.0
## 缩放平滑阻尼系数
@export var zoom_friction: float = 12.0

# 内部状态变量
var velocity: Vector2 = Vector2.ZERO
var target_zoom: Vector2 = Vector2.ONE
var target_position: Vector2 = Vector2.ZERO

# 拖拽状态变量
var is_panning: bool = false


func _ready() -> void:
	target_zoom = zoom
	target_position = global_position


func _unhandled_input(event: InputEvent) -> void:
	# 1. 中键拖拽状态开关
	if event.is_action_pressed("camera_pan"):
		is_panning = true
	elif event.is_action_released("camera_pan"):
		is_panning = false

	# 2. 中键按住拖拽移动画布（拖拽天然与 zoom 相关，因此不需要额外修改）
	if event is InputEventMouseMotion and is_panning:
		target_position -= event.relative / target_zoom

	# 3. 专为“鼠标滚轮”设计的离散缩放（以鼠标指针为中心）
	if event is InputEventMouseButton and event.is_pressed():
		if event.is_action("camera_zoom_in", true) or event.is_action("camera_zoom_out", true):
			var zoom_factor := 0.0
			if event.is_action("camera_zoom_in", true):
				zoom_factor = 1.0 + zoom_step
			else:
				zoom_factor = 1.0 / (1.0 + zoom_step)

			_apply_zoom(zoom_factor, get_viewport().get_mouse_position())


func _process(delta: float) -> void:
	var focus_owner = get_viewport().gui_get_focus_owner()
	if focus_owner is TextEdit or focus_owner is LineEdit or focus_owner is SpinBox:
		return

	# 1. 键盘/手柄摇杆控制摄像机平移
	var input_direction := Input.get_vector(
		"camera_move_left",
		"camera_move_right",
		"camera_move_up",
		"camera_move_down",
	)

	# 修改点：根据当前缩放（target_zoom）调整移动速度
	# 当 zoom 大于 1（放大/拉近）时，世界移动速度减小，保持屏幕像素移动速率一致
	# 使用 target_zoom.x（假设宽高缩放比例一致）进行换算
	var current_max_speed = max_speed / target_zoom.x
	var target_velocity = input_direction * current_max_speed

	velocity = velocity.lerp(target_velocity, move_friction * delta)
	target_position += velocity * delta

	# 2. 专为“手柄/按键”设计的连续缩放（以屏幕中心为锚点）
	var continuous_zoom_input := Input.get_axis("camera_zoom_out", "camera_zoom_in")
	if not is_zero_approx(continuous_zoom_input):
		# 根据按压强度和 delta 计算缩放因子
		var zoom_factor := 1.0 + continuous_zoom_input * zoom_speed * delta
		var viewport_center := get_viewport_rect().size * 0.5
		_apply_zoom(zoom_factor, viewport_center)

	# 3. 平滑追赶目标位置与缩放
	global_position = global_position.lerp(target_position, move_friction * delta)
	zoom = zoom.lerp(target_zoom, zoom_friction * delta)

	# 4. 同步传递给 Shader
	if grid_material:
		grid_material.set_shader_parameter("camera_offset", global_position)
		grid_material.set_shader_parameter("camera_zoom", zoom)


## 统一应用缩放并计算位置偏移的私有函数
func _apply_zoom(zoom_factor: float, anchor_screen_pos: Vector2) -> void:
	var new_zoom := (target_zoom * zoom_factor).clamp(
		Vector2(min_zoom, min_zoom),
		Vector2(max_zoom, max_zoom),
	)

	if not new_zoom.is_equal_approx(target_zoom):
		# 计算传入锚点相对视口中心的偏移
		var anchor_offset := anchor_screen_pos - (get_viewport_rect().size * 0.5)
		var zoom_delta := (Vector2.ONE / target_zoom) - (Vector2.ONE / new_zoom)
		target_position += anchor_offset * zoom_delta
		target_zoom = new_zoom
