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
@export var min_zoom: float = 0.02
## 最大缩放限制（数值越大看得越近）
@export var max_zoom: float = 3.0
## 缩放平滑阻尼系数
@export var zoom_friction: float = 12.0

const REFERENCE_ZOOM := 2.0
const MIN_GESTURE_ZOOM_FACTOR := 0.01
const LINUX_SCROLL_PAN_SCALE := 8.0

# 内部状态变量
var velocity: Vector2 = Vector2.ZERO
var target_zoom: Vector2 = Vector2.ONE * REFERENCE_ZOOM
var target_position: Vector2 = Vector2.ZERO

# 拖拽状态变量
var is_panning: bool = false


func _ready() -> void:
	zoom = Vector2.ONE * REFERENCE_ZOOM
	target_zoom = zoom
	target_position = global_position
	_sync_texture_sampling()


func reset_zoom() -> void:
	target_zoom = Vector2.ONE * REFERENCE_ZOOM


func zoom_percent() -> int:
	return roundi(zoom.x / REFERENCE_ZOOM * 100.0)


func _input(event: InputEvent) -> void:
	if _text_input_active():
		return

	# GNOME/Wayland 可能把触控板手势交给 GUI 控件；在 _input 阶段提前接收。
	if event is InputEventPanGesture:
		if event.is_canceled():
			return
		# 触控板按下滑动留给 StageObjectSlicer，避免被相机平移抢走。
		if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
			return
		# 触控板 PanGesture 的 delta 与鼠标拖拽方向相反；这里反转以保持双指移动时画布跟手。
		_apply_pan(-event.delta)
		get_viewport().set_input_as_handled()
		return

	if event is InputEventMagnifyGesture:
		if event.is_canceled() or event.factor <= 0.0:
			return
		_apply_zoom(maxf(event.factor, MIN_GESTURE_ZOOM_FACTOR), event.position)
		get_viewport().set_input_as_handled()
		return

	# GNOME 的双指滚动在部分后端会退化为普通滚轮事件。
	# Linux 下未带修饰键的滚轮统一视为触控板平移；Ctrl/Meta+滚轮仍用于缩放。
	if event is InputEventMouseButton and event.is_pressed() and _is_linux_scroll_event(event):
		if event.ctrl_pressed or event.meta_pressed:
			var zoom_direction := 1.0 if event.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_RIGHT] else -1.0
			var zoom_amount := maxf(absf(event.factor), 1.0)
			_apply_zoom(pow(1.0 + zoom_step, zoom_direction * zoom_amount), event.position)
		else:
			_apply_linux_scroll_pan(event)
		get_viewport().set_input_as_handled()


func _unhandled_input(event: InputEvent) -> void:
	if _text_input_active():
		return

	# 1. 中键拖拽状态开关
	if event is InputEventMouseButton and event.button_index == (MOUSE_BUTTON_MIDDLE if int(GraphPreferences.value("right_mode")) == 0 else MOUSE_BUTTON_RIGHT) and event.pressed:
		is_panning = true
	elif event is InputEventMouseButton and event.button_index == (MOUSE_BUTTON_MIDDLE if int(GraphPreferences.value("right_mode")) == 0 else MOUSE_BUTTON_RIGHT) and not event.pressed:
		is_panning = false

	# 2. 中键按住拖拽移动画布（拖拽天然与 zoom 相关，因此不需要额外修改）
	if event is InputEventMouseMotion and is_panning:
		_apply_pan(event.relative)
		get_viewport().set_input_as_handled()
		return

	# Linux 触控板滚轮已在 _input 阶段处理。
	if event is InputEventMouseButton and _is_linux_scroll_event(event):
		return

	# 普通滚轮（非 Linux）继续执行离散缩放。
	if event is InputEventMouseButton and event.is_pressed():
		if event.is_action("camera_zoom_in", true) or event.is_action("camera_zoom_out", true):
			var zoom_factor := 0.0
			if event.is_action("camera_zoom_in", true):
				zoom_factor = 1.0 + zoom_step
			else:
				zoom_factor = 1.0 / (1.0 + zoom_step)

			_apply_zoom(zoom_factor, get_viewport().get_mouse_position())


func _process(delta: float) -> void:
	_sync_texture_sampling()
	if _text_input_active():
		velocity = Vector2.ZERO
		return

	# 带 Ctrl/Shift/Alt/Meta 的快捷键不应同时触发 WASD/方向键的原始相机移动。
	# 例如 Ctrl+S 保存时，S 不能再让画布向下移动。
	var shortcut_modifier_active := _shortcut_modifier_active()

	# 1. 键盘/手柄摇杆控制摄像机平移
	var input_direction := Vector2.ZERO if shortcut_modifier_active else Input.get_vector(
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
	var continuous_zoom_input := 0.0 if shortcut_modifier_active else Input.get_axis("camera_zoom_out", "camera_zoom_in")
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


## 统一应用平移，并保持与鼠标拖拽一致的“画布跟手”方向
func _apply_pan(screen_delta: Vector2) -> void:
	if screen_delta.is_zero_approx():
		return
	velocity = Vector2.ZERO
	target_position -= screen_delta / target_zoom


## 判断 Linux 滚轮事件，覆盖 GNOME 对触控板的离散/高精度两种映射
func _is_linux_scroll_event(event: InputEventMouseButton) -> bool:
	if OS.get_name() != "Linux":
		return false
	return event.button_index in [
		MOUSE_BUTTON_WHEEL_UP,
		MOUSE_BUTTON_WHEEL_DOWN,
		MOUSE_BUTTON_WHEEL_LEFT,
		MOUSE_BUTTON_WHEEL_RIGHT,
	]


## 将 GNOME 触控板滚动转换为二维平移量
func _apply_linux_scroll_pan(event: InputEventMouseButton) -> void:
	var direction := Vector2.ZERO
	match event.button_index:
		MOUSE_BUTTON_WHEEL_UP:
			direction = Vector2.UP
		MOUSE_BUTTON_WHEEL_DOWN:
			direction = Vector2.DOWN
		MOUSE_BUTTON_WHEEL_LEFT:
			direction = Vector2.LEFT
		MOUSE_BUTTON_WHEEL_RIGHT:
			direction = Vector2.RIGHT
	var amount := maxf(absf(event.factor), 1.0) * LINUX_SCROLL_PAN_SCALE
	# GNOME 退化成滚轮事件的触控板滚动方向同样需要与鼠标拖拽区分。
	_apply_pan(-direction * amount)


## 辅助键按住时只响应组合快捷键，不触发单键相机动作。
func _shortcut_modifier_active() -> bool:
	return Input.is_key_pressed(KEY_CTRL) or Input.is_key_pressed(KEY_META) or Input.is_key_pressed(KEY_ALT) or Input.is_key_pressed(KEY_SHIFT)


## 文本编辑期间不抢占触控板和相机输入
func _text_input_active() -> bool:
	if get_tree().root.get_meta("workspace_text_input", false):
		return true
	var focus_owner = get_viewport().gui_get_focus_owner()
	return focus_owner is TextEdit or focus_owner is LineEdit or focus_owner is SpinBox


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


## SVG 圆角按实际屏幕倍率采样；固定最大倍率既阻塞首次绘制，也会压窄抗锯齿过渡。
func _sync_texture_sampling() -> void:
	var viewport := get_viewport()
	if not viewport is SubViewport:
		return
	var screen_scale := Vector2.ONE
	if viewport.get_parent() is SubViewportContainer:
		screen_scale = viewport.get_screen_transform().get_scale().abs()
	var visible_scale := maxf(zoom.x * screen_scale.x, zoom.y * screen_scale.y)
	# 使用不高于显示倍率的二次幂档位，保留约 1～2 屏幕像素的平滑边缘。
	# 分档避免平滑缩放时逐帧重新栅格化字体和 DPITexture。
	var sampling := pow(2.0, floorf(log(clampf(visible_scale, 0.125, 64.0)) / log(2.0)))
	if not is_equal_approx(viewport.oversampling_override, sampling):
		viewport.oversampling_override = sampling
