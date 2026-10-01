extends Node2D

const Corners = preload("res://src/main/continuous_corners.gd")
const Palette = preload("res://src/main/theme_palette.gd")

@onready var edge: LineEdge = get_parent()
@onready var label: Label = $Label
@onready var editor: AutoSizeTextEdit = $Editor
var _editing := false
var _last_light: Variant = null
var _last_stroke := Color(-1, -1, -1, -1)
var _centering := false
var _layout_dirty := true
var _refresh_key: Array = []


func _ready() -> void:
	process_priority = 3
	edge.geometry_changed.connect(_queue_refresh)
	edge.style_changed.connect(_queue_refresh)
	if edge.get_parent() is Stage:
		edge.get_parent().caption_peers_changed.connect(_queue_refresh)
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	label.gui_input.connect(_label_input)
	editor.gui_input.connect(_editor_input)
	editor.focus_exited.connect(finish_edit)
	editor.commit_requested.connect(finish_edit)
	editor.cancel_requested.connect(finish_edit.bind(false))
	editor.enable_auto_size = false
	editor.select_from_padding = true
	editor.drag_and_drop_selection_enabled = false
	editor.wrap_mode = TextEdit.LINE_WRAPPING_NONE
	editor.add_theme_constant_override("wrap_offset", 0)
	editor.custom_minimum_size = Vector2.ZERO
	editor.set_anchors_preset(Control.PRESET_TOP_LEFT)
	editor.grow_horizontal = Control.GROW_DIRECTION_END
	editor.grow_vertical = Control.GROW_DIRECTION_END
	editor.text_changed.connect(_refresh_text)
	editor.caret_changed.connect(_refresh_text, CONNECT_DEFERRED)
	label.resized.connect(_on_label_resized)
	visibility_changed.connect(_visibility_changed)
	editor.hide()
	_update_style()
	_refresh_text()


func _process(_delta: float) -> void:
	if not is_instance_valid(edge.source) or not is_instance_valid(edge.target):
		finish_edit(false)
		set_process(false)
		return
	if not _editing and edge.visibility_layer == 0:
		set_process(false)
		return
	if not _editing and edge.text.is_empty() and not label.visible:
		set_process(false)
		return
	var refresh_key := [edge.geometry_version, edge.text, edge.line.default_color,
		edge.get_parent().get_meta("caption_peer_revision", 0), edge.visibility_layer,
		edge.source.get_instance_id(), edge.target.get_instance_id(), _layout_dirty]
	if not _editing and refresh_key == _refresh_key:
		set_process(false)
		return
	_refresh_key = refresh_key
	_update_style()
	_refresh_text()
	var center := edge.caption_position(edge.caption_fraction())
	if position != center:
		position = center
	_center_controls()
	set_process(_editing)


func _refresh_text() -> void:
	if not _editing and editor.text != edge.text:
		editor.text = edge.text
	var displayed_text := editor.text if _editing else edge.text
	if label.text != displayed_text:
		_layout_dirty = true
		label.text = displayed_text
		label.reset_size()
	label.visible = _editing or not edge.text.is_empty()
	_center_controls()


func _on_label_resized() -> void:
	_layout_dirty = true
	_center_controls()


func _center_controls() -> void:
	if _centering:
		return
	if not _layout_dirty and not _editing:
		edge.update_caption_collision(label.size, position, label.visible)
		return
	_centering = true
	# TextEdit owns shaping, caret and IME widths; Label's minimum omits the
	# caret reserve and preedit, so it cannot size the editing surface alone.
	var content_size := label.get_minimum_size().max(editor.get_minimum_size())
	var metrics := editor.measure_unwrapped(editor.text, true)
	var margins := label.get_theme_stylebox("normal").get_minimum_size()
	content_size.x = maxf(content_size.x, metrics.x + margins.x + 32.0)
	content_size.y = maxf(content_size.y, ceilf(metrics.y + margins.y + 4.0))
	label.size = content_size
	label.position = -content_size * 0.5
	editor.size = content_size
	editor.position = label.position
	editor.align_with_label(label, editor.text, true)
	# TextEdit may scroll when a caret event precedes the deferred size update.
	# Once the complete line fits, discard that obsolete horizontal offset.
	editor.scroll_horizontal = 0
	editor.scroll_vertical = 0
	edge.update_caption_collision(label.size, position, label.visible)
	_layout_dirty = false
	_centering = false


func _update_style() -> void:
	var stage := edge.get_parent() as Stage
	var light: bool = stage._applied_theme_light == 1 if stage != null and stage._applied_theme_light >= 0 else Palette.is_light(str(GraphPreferences.value("theme")))
	var stroke := edge.display_stroke_color()
	if _last_light == light and _last_stroke == stroke:
		return
	_layout_dirty = true
	_last_light = light
	_last_stroke = stroke
	var normal := StyleBoxFlat.new()
	normal.bg_color = stroke
	normal.border_color = stroke
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
	var foreground := Color.BLACK if Palette.neutral_text_color(normal.bg_color).get_luminance() < 0.5 else Color.WHITE
	label.add_theme_color_override("font_color", Color.TRANSPARENT if _editing else foreground)
	editor.add_theme_color_override("font_color", foreground)
	editor.add_theme_constant_override("line_spacing", label.get_theme_constant("line_spacing"))
	editor.add_theme_color_override("caret_color", foreground)
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
	stage.set_editor_active(edge, true)
	set_process(true)
	_refresh_key.clear()
	stage.group_overview.invalidate()
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
	_refresh_key.clear()
	var parent_stage := edge.get_parent() as Stage
	if parent_stage != null:
		parent_stage.set_editor_active(edge, false)
		parent_stage.group_overview.invalidate()
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
		stage.get_node("NodeRepulsion").begin_local_edit([edge.source, edge.target], false)
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
			stage.select_object_from_click(edge, event)
			if event.double_click:
				begin_edit()
				editor.select_all.call_deferred()
		label.accept_event()


func _editor_input(event: InputEvent) -> void:
	editor.handle_canvas_input(event)


func _input(event: InputEvent) -> void:
	if _editing and event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if not Rect2(Vector2.ZERO, editor.size).has_point(editor.get_local_mouse_position()):
			finish_edit()


func _visibility_changed() -> void:
	if is_node_ready() and not is_visible_in_tree():
		finish_edit()


func _queue_refresh() -> void:
	_refresh_key.clear()
	set_process(true)
