@tool
class_name AutoSizeTextEdit
extends TextEdit

@export var select_from_padding := false

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


signal commit_requested
signal cancel_requested
signal content_metrics_changed

var _ime_was_active := false
var _ime_end_frame := -10


func _notification(what: int) -> void:
	if what != MainLoop.NOTIFICATION_OS_IME_UPDATE or not has_focus():
		return
	var active := not composition_text().is_empty()
	if _ime_was_active and not active:
		_ime_end_frame = Engine.get_process_frames()
	_ime_was_active = active
	# 等 TextEdit 更新预编辑文本后再测量；预编辑不会触发 text_changed。
	_update_size.call_deferred()
	content_metrics_changed.emit.call_deferred()


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
	custom_minimum_size.x = target_width
	size.x = target_width
	var single_line_height := maxf(font.get_height(font_size), get_line_height())
	var visual_lines := 0
	for index in get_line_count():
		visual_lines += 1 + get_line_wrap_count(index)
	var total_height := single_line_height * visual_lines
	var target_height := maxf(min_height, ceilf(total_height + vertical_padding))
	if wrap_mode == TextEdit.LINE_WRAPPING_NONE and max_line_width > target_width - style_size.x:
		target_height += get_h_scroll_bar().get_combined_minimum_size().y

	# 3. 应用尺寸
	custom_minimum_size = Vector2(target_width, target_height)
	size = custom_minimum_size


func composition_text() -> String:
	return DisplayServer.ime_get_text() if DisplayServer.has_feature(DisplayServer.FEATURE_IME) else ""


func measure_unwrapped(value: String, include_native := false) -> Vector2:
	var font := get_theme_font("font")
	var point_size := get_theme_font_size("font_size")
	var rows := value.split("\n")
	var width := 0.0
	var composition := composition_text() if include_native and has_focus() else ""
	for index in rows.size():
		var row: String = rows[index]
		if index == get_caret_line() and not composition.is_empty():
			var column := get_caret_column()
			row = row.left(column) + composition + row.substr(column)
		var row_width := font.get_string_size(row, HORIZONTAL_ALIGNMENT_LEFT, -1, point_size).x
		if include_native and index < get_line_count():
			row_width = maxf(row_width, get_line_width(index))
		width = maxf(width, row_width)
	return Vector2(ceilf(width), get_line_height() * maxi(1, rows.size()))


func _gui_input(event: InputEvent) -> void:
	# TextEdit treats the left style margin as a gutter and ignores clicks there.
	# Canvas editors use that margin for centered text; let native selection handle
	# padding clicks too, without replacing its caret/drag/Shift-selection logic.
	if select_from_padding and get_gutter_count() == 0 and event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var left := ceilf(get_theme_stylebox("normal").get_content_margin(SIDE_LEFT))
		if event.position.x >= 0.0 and event.position.x < left:
			event.position.x = left


func align_with_label(label: Label, value: String, include_native := false) -> void:
	var label_style := label.get_theme_stylebox("normal")
	var style := get_theme_stylebox("normal").duplicate() as StyleBoxFlat
	var content := label.size - label_style.get_minimum_size()
	var metrics := measure_unwrapped(value, include_native)
	var rows := maxi(1, value.split("\n").size())
	var inset_x := maxf(0.0, (content.x - metrics.x) * 0.5) if rows == 1 else 0.0
	var font := label.get_theme_font("font")
	var text_height := font.get_height(label.get_theme_font_size("font_size")) * rows
	style.content_margin_left = label_style.get_content_margin(SIDE_LEFT) + inset_x
	style.content_margin_right = maxf(0.0, label_style.get_content_margin(SIDE_RIGHT) - 2.0)
	style.content_margin_top = label_style.get_content_margin(SIDE_TOP) + maxf(0.0, (content.y - text_height) * 0.5)
	style.content_margin_bottom = maxf(0.0, minf(label_style.get_content_margin(SIDE_BOTTOM), label.size.y - style.content_margin_top - metrics.y))
	add_theme_stylebox_override("normal", style)


func handle_canvas_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed and event.double_click:
		select_all.call_deferred()
		accept_event()
		return
	if is_ime_composing() or not event is InputEventKey or not event.pressed or event.unicode >= 32:
		return
	if is_ime_commit_pending():
		if event.keycode in [KEY_ENTER, KEY_KP_ENTER, KEY_ESCAPE]:
			accept_event()
		return
	if event.keycode == KEY_ESCAPE:
		accept_event()
		cancel_requested.emit()
	elif event.keycode in [KEY_ENTER, KEY_KP_ENTER] and not event.shift_pressed:
		accept_event()
		if not event.echo:
			commit_requested.emit()
