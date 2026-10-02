extends CanvasLayer

const Palette = preload("res://src/main/theme_palette.gd")

@export_range(0.1, 1.0, 0.05) var duration: float = 0.4
# 手动排查时开启；默认不输出性能日志。
@export var trace_timings: bool = false

const MAX_WAVES := 32

@onready var snapshot: TextureRect = $Snapshot
@onready var capture: SubViewport = $Capture
@onready var source: TextureRect = $Capture/Source
@onready var _shader: ShaderMaterial = snapshot.material as ShaderMaterial
@onready var _theme_button: Control = $"../VBoxContainer/Header/ThemeMode"
@onready var _button_backdrop: ColorRect = $"../VBoxContainer/Header/ThemeMode/TransitionBackdrop"
var _first_light := false
var _live_apply: Callable
var _live_light := -1
var _wave_data := PackedVector4Array()
var _trace_started_us := 0
var _generation := 0
var _active := false
var _capturing := false
var _first_frame_pending := false
var _elapsed := 0.0
var _waves: Array[Dictionary] = []
var _base_new := 0.0
var _target_new := false
var _final_apply: Callable
var _viewport_size := Vector2.ZERO


func _ready() -> void:
	get_viewport().size_changed.connect(_on_viewport_resized)
	set_process(false)
	_wave_data.resize(MAX_WAVES)
	call_deferred("_warm_capture_after_first_frame")


func _warm_capture_after_first_frame() -> void:
	await get_tree().process_frame
	await _warm_capture()


func _warm_capture() -> void:
	var generation := _generation
	_resize_capture_if_needed()
	source.texture = get_viewport().get_texture()
	capture.render_target_update_mode = SubViewport.UPDATE_ONCE
	await RenderingServer.frame_post_draw
	if generation != _generation:
		return
	source.texture = null
	capture.render_target_update_mode = SubViewport.UPDATE_DISABLED
	# 透明绘制一次预热波纹材质；采样主视口时不同时显示缓存。
	_shader.set_shader_parameter("base_new", 1.0)
	_shader.set_shader_parameter("wave_count", 0)
	snapshot.texture = capture.get_texture()
	snapshot.show()
	await RenderingServer.frame_post_draw
	if generation == _generation:
		snapshot.hide()
		snapshot.texture = null


func reveal(apply_theme: Callable, apply_button: Callable, light: bool) -> void:
	_final_apply = apply_theme
	_live_apply = apply_button
	if _active:
		_target_new = light == _first_light
		_append_wave()
		return
	_generation += 1
	var generation := _generation
	_trace_started_us = Time.get_ticks_usec() if trace_timings else 0
	_active = true
	_capturing = true
	_elapsed = 0.0
	_base_new = 0.0
	_first_light = light
	_live_light = -1
	_target_new = true
	_viewport_size = get_viewport().get_visible_rect().size
	if _viewport_size.x <= 0 or _viewport_size.y <= 0:
		_finish_animation()
		return
	_append_wave()
	set_process(true)
	snapshot.hide()
	snapshot.texture = null
	_resize_capture_if_needed()
	source.texture = get_viewport().get_texture()
	capture.render_target_update_mode = SubViewport.UPDATE_ONCE
	# 主视口已有上一帧，无需先额外等待一帧再复制。
	await RenderingServer.frame_post_draw
	if generation != _generation:
		return
	source.texture = null
	capture.render_target_update_mode = SubViewport.UPDATE_DISABLED
	_trace_phase("capture_ready")
	# 本轮下层只切换一次，后续点击交给同一材质中的独立波纹。
	# Callable 绑定了本次点击的明确主题，不读取后续点击改写的设置。
	apply_theme.call()
	_trace_phase("theme_applied")
	if generation != _generation:
		return
	_capturing = false
	# 第一帧就有可见半径；截图准备阶段不计入动画时间。
	_elapsed = minf(1.0 / 120.0, duration * 0.1)
	_first_frame_pending = true
	snapshot.texture = capture.get_texture()
	_update_waves()
	snapshot.show()
	if trace_timings:
		RenderingServer.frame_post_draw.connect(_trace_first_frame.bind(generation), CONNECT_ONE_SHOT)


func _append_wave() -> void:
	var origin := get_viewport().get_mouse_position().clamp(Vector2.ZERO, _viewport_size)
	var farthest := Vector2(maxf(origin.x, _viewport_size.x - origin.x), maxf(origin.y, _viewport_size.y - origin.y)).length()
	# 极端连点时将最早的波纹合并到底色，保持 GPU 数组和内存有界。
	if _waves.size() == MAX_WAVES:
		_base_new = float(_waves.pop_front().target)
	_waves.append({"origin": origin, "start": _elapsed, "distance": farthest + 2.0, "target": float(_target_new)})


func is_transitioning() -> bool:
	return _active


func _process(delta: float) -> void:
	if _capturing:
		return
	# 首次 delta 可能包含换肤耗时，不能用它直接跳过整段动画。
	if _first_frame_pending:
		_first_frame_pending = false
		_update_waves()
		return
	_elapsed += delta
	while not _waves.is_empty() and _elapsed - float(_waves[0].start) >= duration:
		_base_new = float(_waves.pop_front().target)
	if _waves.is_empty():
		_finish_animation()
		return
	_update_waves()


func _update_waves() -> void:
	for index in _waves.size():
		var wave: Dictionary = _waves[index]
		var progress := clampf((_elapsed - float(wave.start)) / duration, 0.0, 1.0)
		# Ease-out 从点击处立即展开，不再缓慢起步。
		var eased := 1.0 - pow(1.0 - progress, 3.0)
		var radius := lerpf(-2.0, float(wave.distance), eased)
		var origin: Vector2 = wave.origin
		_wave_data[index] = Vector4(origin.x, origin.y, radius, float(wave.target))
	# 按钮保持实时绘制，旧截图不覆盖连点时的悬停/按下反馈。
	var live_rect := Rect2()
	if is_instance_valid(_theme_button) and _theme_button.is_visible_in_tree():
		live_rect = _theme_button.get_global_rect()
	# 取按钮中心的波纹状态；同时更新图标、交互样式和透明按钮背后的底色。
	# 不能只挖空截图，否则回切时会露出下层页面的相反配色。
	if live_rect.has_area():
		var point := live_rect.get_center()
		var new_color := _base_new
		for index in _waves.size():
			var wave := _wave_data[index]
			var inside := 1.0 - smoothstep(wave.z - 2.0, wave.z + 2.0, point.distance_to(Vector2(wave.x, wave.y)))
			new_color = lerpf(new_color, wave.w, inside)
		var light := _first_light if new_color >= 0.5 else not _first_light
		if _live_light != int(light):
			_live_apply.call(light)
			_live_light = int(light)
		_button_backdrop.color = Palette.color(light, "surface.app")
		_button_backdrop.show()
	_shader.set_shader_parameter("live_control_rect", Vector4(live_rect.position.x, live_rect.position.y, live_rect.size.x, live_rect.size.y))
	_shader.set_shader_parameter("viewport_size", _viewport_size)
	_shader.set_shader_parameter("base_new", _base_new)
	_shader.set_shader_parameter("wave_count", _waves.size())
	_shader.set_shader_parameter("waves", _wave_data)


func _on_viewport_resized() -> void:
	_generation += 1
	_finish_animation()
	_warm_capture()


func _finish_animation() -> void:
	var apply_theme := _final_apply
	var needs_apply := _active
	_active = false
	_capturing = false
	_first_frame_pending = false
	_final_apply = Callable()
	_live_apply = Callable()
	_live_light = -1
	_waves.clear()
	set_process(false)
	# 最后一个波纹已覆盖全屏，再让实际 UI 落到最后选择的主题。
	if needs_apply and apply_theme.is_valid():
		apply_theme.call()
	_button_backdrop.hide()
	snapshot.hide()
	snapshot.texture = null
	source.texture = null
	capture.render_target_update_mode = SubViewport.UPDATE_DISABLED


func _resize_capture_if_needed() -> void:
	var desired := Vector2i(get_viewport().get_texture().get_size()).max(Vector2i.ONE)
	if capture.size != desired:
		capture.size = desired


func _trace_phase(phase: String) -> void:
	if trace_timings:
		print("[ThemeTiming] %s: %.2f ms" % [phase, float(Time.get_ticks_usec() - _trace_started_us) / 1000.0])


func _trace_first_frame(generation: int) -> void:
	if generation == _generation:
		_trace_phase("first_animation_frame")
