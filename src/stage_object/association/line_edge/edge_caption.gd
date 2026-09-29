extends Node2D

const Corners = preload("res://src/main/continuous_corners.gd")
const Palette = preload("res://src/main/theme_palette.gd")

@onready var edge: LineEdge = get_parent()
@onready var label: Label = $Label
@onready var editor: AutoSizeTextEdit = $Editor
var _editing := false
var _last_points := PackedVector2Array()
var _last_line_transform := Transform2D.IDENTITY
var _last_light: Variant = null
var _centering := false


func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	label.gui_input.connect(_label_input)
	editor.gui_input.connect(_editor_input)
	editor.focus_exited.connect(finish_edit)
	editor.enable_auto_size = false
	editor.wrap_mode = TextEdit.LINE_WRAPPING_NONE
	editor.add_theme_constant_override("wrap_offset", 0)
	editor.custom_minimum_size = Vector2.ZERO
	editor.set_anchors_preset(Control.PRESET_TOP_LEFT)
	editor.grow_horizontal = Control.GROW_DIRECTION_END
	editor.grow_vertical = Control.GROW_DIRECTION_END
	editor.text_changed.connect(_refresh_text)
	label.resized.connect(_center_controls)
	visibility_changed.connect(_visibility_changed)
	editor.hide()
	_update_style()
	_refresh_text()


func _process(_delta: float) -> void:
	if not is_instance_valid(edge.source) or not is_instance_valid(edge.target):
		finish_edit(false)
		return
	_update_style()
	_refresh_text()
	var points := edge.line.points
	if points != _last_points or edge.line.transform != _last_line_transform:
		_last_points = points
		_last_line_transform = edge.line.transform
		if not points.is_empty():
			var curve := Curve2D.new()
			for point in points:
				curve.add_point(point)
			position = edge.to_local(edge.line.to_global(curve.sample_baked(curve.get_baked_length() * 0.5)))
	_center_controls()


func _refresh_text() -> void:
	var displayed_text := editor.text if _editing else edge.text
	if label.text != displayed_text:
		label.text = displayed_text
		label.reset_size()
	label.visible = _editing or not edge.text.is_empty()
	_center_controls()


func _center_controls() -> void:
	if _centering:
		return
	_centering = true
	# One background and one layout determine both display and editing bounds.
	label.size = label.size.max(editor.get_minimum_size())
	var row_height := ceili(label.get_theme_font("font").get_height(label.get_theme_font_size("font_size"))) + label.get_theme_constant("line_spacing")
	label.size.y = maxf(label.size.y, row_height * maxi(1, label.get_line_count()) + 8.0)
	label.position = -label.size * 0.5
	var input_style := editor.get_theme_stylebox("normal") as StyleBoxFlat
	if input_style != null:
		var rows_height := editor.get_line_height() * maxi(1, label.get_line_count())
		input_style.content_margin_bottom = maxf(0.0, minf(4.0, label.size.y - input_style.content_margin_top - rows_height))
	editor.size = label.size
	editor.position = label.position
	_centering = false


func _update_style() -> void:
	var stage := edge.get_parent() as Stage
	var light: bool = stage._applied_theme_light == 1 if stage != null and stage._applied_theme_light >= 0 else Palette.is_light(str(GraphPreferences.value("theme")))
	if _last_light == light:
		return
	_last_light = light
	var normal := StyleBoxFlat.new()
	normal.bg_color = Palette.color(light, "surface.canvas")
	normal.border_color = Palette.color(light, "border.focus" if _editing else "border.default")
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(6)
	normal.content_margin_left = 8
	normal.content_margin_right = 18
	normal.content_margin_top = 4
	normal.content_margin_bottom = 4
	label.add_theme_stylebox_override("normal", Corners.style(normal, Corners.CONTROL, true))
	var input_style := normal.duplicate() as StyleBoxFlat
	input_style.bg_color = Color.TRANSPARENT
	input_style.border_color = Color.TRANSPARENT
	input_style.set_border_width_all(0)
	input_style.content_margin_right -= 2.0
	editor.add_theme_stylebox_override("normal", input_style)
	editor.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var foreground := Palette.neutral_text_color(normal.bg_color)
	label.add_theme_color_override("font_color", Color.TRANSPARENT if _editing else foreground)
	editor.add_theme_color_override("font_color", foreground)
	editor.add_theme_constant_override("line_spacing", label.get_theme_constant("line_spacing"))
	editor.add_theme_color_override("caret_color", Palette.neutral_text_color(normal.bg_color))
	editor.add_theme_color_override("selection_color", Palette.color(light, "surface.selected"))
	if is_instance_valid(edge.source) and edge.source is TextNode:
		var font: Font = edge.source.label.get_theme_font("font")
		label.add_theme_font_override("font", font)
		editor.add_theme_font_override("font", font)


func begin_edit() -> void:
	if _editing or not is_instance_valid(edge.source) or not is_instance_valid(edge.target):
		return
	var stage := edge.get_parent() as Stage
	if stage == null or stage.history._busy:
		return
	stage.finish_text_editing()
	stage.finish_interaction()
	stage.select_ids(PackedStringArray([edge.id]))
	_editing = true
	_last_light = null
	_update_style()
	editor.text = edge.text
	editor.clear_undo_history()
	editor.show()
	editor.text_changed.emit()
	_refresh_text()
	_center_controls()
	editor.grab_focus()
	editor.deselect()
	editor.set_caret_line(editor.get_line_count() - 1)
	editor.set_caret_column(editor.get_line(editor.get_caret_line()).length())


func finish_edit(commit_changes := true) -> void:
	if not _editing:
		return
	_editing = false
	_last_light = null
	_update_style()
	if commit_changes:
		editor.apply_ime()
	else:
		editor.cancel_ime()
	var stage := edge.get_parent() as Stage
	var changed := commit_changes and edge.text != editor.text
	if changed and stage != null:
		stage.history.begin_transaction()
		edge.text = editor.text
	editor.release_focus()
	editor.hide()
	_refresh_text()
	if changed and stage != null:
		stage.history.commit()
		stage.document_changed.emit()


func is_dirty() -> bool:
	return _editing and editor.text != edge.text


func _label_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT and not event.alt_pressed:
		var stage := edge.get_parent() as Stage
		if stage != null:
			stage.select_object(edge, event.ctrl_pressed or event.meta_pressed)
			if event.double_click:
				begin_edit()
		label.accept_event()


func _editor_input(event: InputEvent) -> void:
	if editor.is_ime_composing() or not event is InputEventKey or not event.pressed or event.unicode >= 32:
		return
	if editor.is_ime_commit_pending():
		if event.keycode in [KEY_ENTER, KEY_KP_ENTER, KEY_ESCAPE]:
			editor.accept_event()
		return
	if event.keycode == KEY_ESCAPE:
		editor.accept_event()
		finish_edit(false)
	elif event.keycode in [KEY_ENTER, KEY_KP_ENTER] and not event.shift_pressed:
		editor.accept_event()
		if not event.echo:
			finish_edit()


func _input(event: InputEvent) -> void:
	if _editing and event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if not Rect2(Vector2.ZERO, editor.size).has_point(editor.get_local_mouse_position()):
			finish_edit()


func _visibility_changed() -> void:
	if is_node_ready() and not is_visible_in_tree():
		finish_edit()
