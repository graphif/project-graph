class_name TextNode
extends Entity

# 舞台使用独立的可缩放字体缓存，不修改菜单等界面共享的原字体。
static var _canvas_font: Font

@onready var collision_shape: CollisionShape2D = %CollisionShape
@onready var label: Label = %Label
@onready var container_panel: Panel = $ContainerPanel
var _container_rect := Rect2()
var _container_active := false
var _normal_label_position := Vector2.ZERO
var _normal_edit_position := Vector2.ZERO

@onready var text_edit: AutoSizeTextEdit = %TextEdit

@export var text: String = "":
	set(value):
		text = value
		if is_node_ready():
			label.text = value
			_queue_collision_update()

@export var font_size := 24:
	set(value):
		font_size = maxi(8, value)
		if is_node_ready():
			_apply_appearance()
@export var fixed_width := 0.0:
	set(value):
		fixed_width = maxf(0.0, value)
		if is_node_ready():
			_apply_appearance()
@export var fill_color := Color.TRANSPARENT:
	set(value):
		fill_color = value
		if is_node_ready():
			_apply_appearance()
@export var border_color := Color("#585b70"):
	set(value):
		border_color = value
		if is_node_ready():
			_apply_appearance()
var _editing := false
var _appearance_light: Variant = null
var _collision_update_pending := false


func _ready() -> void:
	super()
	label.text = text
	_normal_label_position = label.position
	_normal_edit_position = text_edit.position
	# MSDF 字形在相机缩放时保持平滑，所有节点共享同一份字形缓存。
	if _canvas_font == null:
		_canvas_font = _make_canvas_font(label.get_theme_font("font"))
	label.add_theme_font_override("font", _canvas_font)
	text_edit.add_theme_font_override("font", _canvas_font)
	label.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	text_edit.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_apply_appearance()
	text_edit.focus_exited.connect(exit_edit_mode)
	visibility_changed.connect(_on_visibility_changed)
	label.resized.connect(_queue_collision_update)
	text_edit.resized.connect(_queue_collision_update)
	_queue_collision_update()


func _on_label_gui_input(event: InputEvent) -> void:
	if event is InputEventWithModifiers and event.alt_pressed:
		return
	# 进入编辑模式
	if label.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			enter_edit_mode()
			get_viewport().set_input_as_handled()
			return

	super._on_input_event(get_viewport(), event, 0)


func _on_text_edit_gui_input(event: InputEvent) -> void:
	# 组合输入期间把选词、确认和取消交给输入法。
	if text_edit.is_ime_composing():
		return
	if not event is InputEventKey or not event.pressed:
		return
	if event.unicode >= 32:
		return
	if text_edit.is_ime_commit_pending():
		if event.keycode in [KEY_ENTER, KEY_KP_ENTER, KEY_ESCAPE]:
			text_edit.accept_event()
		return
	if event.keycode == KEY_ESCAPE:
		text_edit.accept_event()
		exit_edit_mode(false)
	elif not event.shift_pressed and (event.keycode == KEY_ENTER or event.keycode == KEY_KP_ENTER):
		text_edit.accept_event()
		if not event.echo:
			exit_edit_mode()


func _input(event: InputEvent) -> void:
	super._input(event)
	if not _editing or not is_visible_in_tree():
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		# 使用控件局部坐标，兼容相机平移、缩放和子视口。
		if not Rect2(Vector2.ZERO, text_edit.size).has_point(text_edit.get_local_mouse_position()):
			exit_edit_mode()


func enter_edit_mode() -> void:
	if _editing:
		return
	finish_drag()
	linear_velocity = Vector2.ZERO
	angular_velocity = 0.0
	_editing = true
	text_edit.position = label.position
	text_edit.min_height = label.size.y
	text_edit.max_width = maxf(600.0, label.size.x)
	text_edit.min_width = label.size.x
	text_edit.text = text
	text_edit.clear_undo_history()
	text_edit.text_changed.emit()
	label.hide()
	text_edit.show()
	text_edit.grab_focus()
	text_edit.select_all()
	_queue_collision_update()


func exit_edit_mode(commit_changes: bool = true) -> void:
	if not _editing:
		return
	# 先结束状态，避免隐藏控件触发 focus_exited 时重复提交。
	_editing = false
	# apply_ime 会更改 text，必须在快照和隐藏控件之前完成。
	if commit_changes:
		text_edit.apply_ime()
	else:
		text_edit.cancel_ime()
	var changed := commit_changes and text != text_edit.text
	if changed and _history != null:
		_history.begin_transaction()
	if changed:
		text = text_edit.text
	text_edit.release_focus()
	text_edit.hide()
	label.show()
	_queue_collision_update()
	if changed and _history != null:
		_history.commit()


func _on_visibility_changed() -> void:
	if is_node_ready() and not is_visible_in_tree():
		exit_edit_mode()


func _queue_collision_update() -> void:
	if _collision_update_pending:
		return
	_collision_update_pending = true
	_update_collision_shape.call_deferred()


func _update_collision_shape() -> void:
	_collision_update_pending = false
	var bounds := get_visual_rect()
	var center := bounds.get_center()
	var current_shape := collision_shape.shape as RectangleShape2D
	if current_shape != null and current_shape.size == bounds.size and collision_shape.position == center:
		return
	var shape := RectangleShape2D.new()
	shape.size = bounds.size
	collision_shape.shape = shape
	collision_shape.position = center


func _apply_appearance(update_layout: bool = true, theme_light: Variant = null) -> void:
	var light: bool = GraphPreferences.value("theme") == "light" if theme_light == null else bool(theme_light)
	if not update_layout and _appearance_light == light:
		return
	_appearance_light = light
	label.begin_bulk_theme_override()
	text_edit.begin_bulk_theme_override()
	label.add_theme_color_override("font_color", Color("#24452c") if light else Color("#cdd6f4"))
	if update_layout:
		label.add_theme_font_size_override("font_size", font_size)
		text_edit.add_theme_font_size_override("font_size", font_size)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if fixed_width > 0.0 else TextServer.AUTOWRAP_OFF
		label.custom_minimum_size.x = fixed_width
		label.size = Vector2(fixed_width, 0.0)
	var style := StyleBoxFlat.new()
	style.bg_color = fill_color
	style.border_color = border_color
	if border_color == Color("#e5e7eb") or border_color == Color("#585b70"):
		style.border_color = Color("#45484f") if light else Color("#585b70")
	style.set_border_width_all(2)
	style.set_corner_radius_all(6)
	style.content_margin_left = 15
	style.content_margin_right = 15
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	container_panel.add_theme_stylebox_override("panel", style.duplicate())
	if _container_active:
		style.bg_color = Color.TRANSPARENT
		style.set_border_width_all(0)
	label.add_theme_stylebox_override("normal", style)
	text_edit.add_theme_color_override("font_color", Color("#24452c") if light else Color("#cdd6f4"))
	text_edit.add_theme_color_override("caret_color", Color("#24452c") if light else Color("#f5e0dc"))
	text_edit.add_theme_color_override("selection_color", Color("#d9efdc") if light else Color("#45475a"))
	var edit_style := style.duplicate() as StyleBoxFlat
	edit_style.bg_color = Color("#f6faf6") if light else Color("#181825")
	edit_style.border_color = style.border_color
	text_edit.add_theme_stylebox_override("normal", edit_style)
	text_edit.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	label.end_bulk_theme_override()
	text_edit.end_bulk_theme_override()
	if update_layout:
		_queue_collision_update()


static func _make_canvas_font(original: Font) -> Font:
	if original is FontVariation:
		var variation := original.duplicate() as FontVariation
		if original.base_font != null:
			variation.base_font = _make_canvas_font(original.base_font)
		return variation
	if original is FontFile:
		var scalable := original.duplicate() as FontFile
		scalable.multichannel_signed_distance_field = true
		# 较复杂的中文笔画需要比默认 48 更高的距离场精度。
		scalable.msdf_size = 96
		scalable.msdf_pixel_range = 8
		return scalable
	return original


# 包含状态由子对象引用推导，不更换对象身份，因此连线和属性仍指向原节点。
func update_container_layout(members: Array[Entity]) -> void:
	var active := not members.is_empty()
	if active != _container_active:
		_container_active = active
		container_panel.visible = active
		if not active:
			# 最后一个成员移出后，普通方块留在原容器标题处。
			move_without_inertia(to_global(_container_rect.position - _normal_label_position))
			label.position = _normal_label_position
			text_edit.position = _normal_edit_position
			label.size = Vector2(fixed_width, 0.0)
		_apply_appearance()
	if not active:
		_update_collision_shape()
		return
	var bounds := Rect2()
	var initialized := false
	for member in members:
		var world_rect := member.aabb
		for corner in [world_rect.position, Vector2(world_rect.end.x, world_rect.position.y), world_rect.end, Vector2(world_rect.position.x, world_rect.end.y)]:
			var point := to_local(corner)
			if not initialized:
				bounds = Rect2(point, Vector2.ZERO)
				initialized = true
			else:
				bounds = bounds.expand(point)
	var header_height := label.get_minimum_size().y
	bounds = bounds.grow(30.0)
	bounds.position.y -= header_height
	bounds.size.y += header_height
	bounds.size.x = maxf(bounds.size.x, maxf(label.get_minimum_size().x, fixed_width))
	_container_rect = bounds
	container_panel.position = bounds.position
	container_panel.size = bounds.size
	label.position = bounds.position
	label.size = Vector2(bounds.size.x, header_height)
	text_edit.position = label.position
	_update_collision_shape()


func get_visual_rect() -> Rect2:
	if _container_active:
		return _container_rect
	return Rect2(text_edit.position, text_edit.size) if _editing else Rect2(label.position, label.size)
