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

@export var min_height: float = 0.0

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


var _ime_was_active := false
var _ime_end_frame := -10


func _notification(what: int) -> void:
	if what != MainLoop.NOTIFICATION_OS_IME_UPDATE or not has_focus():
		return
	var active := not DisplayServer.ime_get_text().is_empty()
	if _ime_was_active and not active:
		_ime_end_frame = Engine.get_process_frames()
	_ime_was_active = active
	# 等 TextEdit 更新预编辑文本后再测量；预编辑不会触发 text_changed。
	_update_size.call_deferred()


func is_ime_composing() -> bool:
	return has_ime_text() or not DisplayServer.ime_get_text().is_empty()


func is_ime_commit_pending() -> bool:
	# 部分输入法先清空预编辑，再发送确认键和 Unicode 上屏事件。
	return Engine.get_process_frames() <= _ime_end_frame + 1


func _ready() -> void:
	scroll_fit_content_height = false

	if not Engine.is_editor_hint():
		text_changed.connect(_update_size)
		text_set.connect(_update_size)
		theme_changed.connect(_update_size)
	_update_size()


func _update_size() -> void:
	if not enable_auto_size:
		return

	var font: Font = get_theme_font("font")
	var font_size: int = get_theme_font_size("font_size")
	if not font:
		return

	# 留白不能小于实际样式边距，否则文字区会比测量结果窄。
	var style_size := get_theme_stylebox("normal").get_minimum_size()
	var horizontal_padding := maxf(padding_x * 2.0, style_size.x)
	var vertical_padding := maxf(padding_y * 2.0, style_size.y)

	# 1. 使用 TextEdit 的排版宽度，包含字体回退与制表符的实际占位。
	var max_line_width: float = 0.0
	var composition := DisplayServer.ime_get_text() if is_inside_tree() and has_focus() else ""
	for i in range(get_line_count()):
		var measured_line := get_line(i)
		if i == get_caret_line() and not composition.is_empty():
			var column := get_caret_column()
			measured_line = measured_line.left(column) + composition + measured_line.substr(column)
		var line_width = font.get_string_size(measured_line, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
		max_line_width = maxf(max_line_width, maxf(line_width, get_line_width(i)))

	# 与 TextEdit 内容适配的行尾预留一致，避免光标贴边和像素取整造成裁切。
	var content_width := ceilf(max_line_width) + 10.0
	var target_width := ceilf(clampf(content_width + horizontal_padding, min_width, max_width))

	# 2. get_line_height 已包含行间距；长文本达到宽度上限时预留横向滚动条。
	var single_line_height := maxf(font.get_height(font_size), get_line_height())
	var total_height := single_line_height * get_line_count()
	var target_height := maxf(min_height, ceilf(total_height + vertical_padding))
	if max_line_width > target_width - style_size.x:
		target_height += get_h_scroll_bar().get_combined_minimum_size().y

	# 3. 应用尺寸
	custom_minimum_size = Vector2(target_width, target_height)
	size = custom_minimum_size
