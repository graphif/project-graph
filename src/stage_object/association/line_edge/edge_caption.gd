extends Node2D

const Palette = preload("res://src/main/theme_palette.gd")

@onready var edge: LineEdge = get_parent()
@onready var label: Label = $Label
@onready var editor: AutoSizeTextEdit = $Editor
var _editing := false
var _last_points := PackedVector2Array()
var _last_line_transform := Transform2D.IDENTITY
var _last_light: Variant = null


func _ready() -> void:
	label.gui_input.connect(_label_input)
	editor.gui_input.connect(_editor_input)
	editor.focus_exited.connect(finish_edit)
	editor.resized.connect(_center_controls)
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
	if label.text != edge.text:
		label.text = edge.text
		label.reset_size()
	label.visible = not _editing and not edge.text.is_empty()


func _center_controls() -> void:
	label.position = -label.size * 0.5
	editor.position = -editor.size * 0.5


func _update_style() -> void:
	var light: bool = Palette.is_light(str(GraphPreferences.value("theme")))
	if _last_light == light:
		return
	_last_light = light
	var normal := StyleBoxFlat.new()
	normal.bg_color = Palette.color(light, "surface.canvas")
	normal.border_color = Palette.color(light, "border.default")
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(6)
	normal.content_margin_left = 8
	normal.content_margin_right = 8
	normal.content_margin_top = 4
	normal.content_margin_bottom = 4
	label.add_theme_stylebox_override("normal", normal)
	editor.add_theme_stylebox_override("normal", normal.duplicate())
	var focus := normal.duplicate() as StyleBoxFlat
	focus.border_color = Palette.color(light, "border.focus")
	focus.set_border_width_all(2)
	editor.add_theme_stylebox_override("focus", focus)
	for control in [label, editor]:
		control.add_theme_color_override("font_color", Palette.color(light, "text.primary"))
	editor.add_theme_color_override("caret_color", Palette.color(light, "text.primary"))
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
	editor.text = edge.text
	editor.clear_undo_history()
	editor.show()
	editor.text_changed.emit()
	label.hide()
	_center_controls()
	editor.grab_focus()
	editor.deselect()
	editor.set_caret_line(editor.get_line_count() - 1)
	editor.set_caret_column(editor.get_line(editor.get_caret_line()).length())


func finish_edit(commit_changes := true) -> void:
	if not _editing:
		return
	_editing = false
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
