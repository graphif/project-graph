@tool
class_name AutoSizeTextEdit
extends TextEdit

@export_group("尺寸自适应设置")
@export var enable_auto_size: bool = true:
	set(val):
		enable_auto_size = val
		_update_size()

@export var min_width: float = 100.0:
	set(val):
		min_width = val
		_update_size()

@export var max_width: float = 600.0:
	set(val):
		max_width = val
		_update_size()

@export var padding_x: float = 15.0:
	# 代表单侧留白，计算时会 * 2
	set(val):
		padding_x = val
		_update_size()

@export var padding_y: float = 10.0:
	# 代表单侧上下留白，计算时会 * 2
	set(val):
		padding_y = val
		_update_size()


func _ready() -> void:
	scroll_fit_content_height = false

	if not Engine.is_editor_hint():
		text_changed.connect(_update_size)
	_update_size()


func _update_size() -> void:
	if not enable_auto_size:
		return

	var font: Font = get_theme_font("font")
	var font_size: int = get_theme_font_size("font_size")
	var line_spacing: int = get_theme_constant("line_spacing")
	if not font:
		return

	# 1. 计算宽度（文本最长宽度 + 左右两侧 padding）
	var max_line_width: float = 0.0
	for i in range(get_line_count()):
		var line_width = font.get_string_size(get_line(i), HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
		max_line_width = max(max_line_width, line_width)

	var target_width = clamp(max_line_width + (padding_x * 2.0), min_width, max_width)

	# 2. 计算高度（纯文本高度 + 上下两侧 padding）
	var single_line_height = font.get_height(font_size)
	var total_height = (single_line_height * get_line_count()) + (
		line_spacing * (get_line_count() - 1)
	)
	var target_height = total_height + (padding_y * 2.0)

	# 3. 应用尺寸
	custom_minimum_size = Vector2(target_width, target_height)
