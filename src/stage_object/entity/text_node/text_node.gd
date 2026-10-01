class_name TextNode
extends Entity

const Corners = preload("res://src/main/continuous_corners.gd")
const Palette = preload("res://src/main/theme_palette.gd")

# 舞台使用独立的可缩放字体缓存，不修改菜单等界面共享的原字体。
static var _canvas_font: Font

@onready var collision_shape: CollisionShape2D = %CollisionShape
@onready var label: Label = %Label
@onready var container_panel: Panel = $ContainerPanel
var _container_rect := Rect2()
var _container_active := false
var _container_layout_key: Array = []
var _fill_layer := 1
var _normal_label_position := Vector2.ZERO
var _normal_edit_position := Vector2.ZERO

@onready var text_edit: AutoSizeTextEdit = %TextEdit
var _edit_menu: PopupMenu

# Theme hierarchy is independent of spatial containers and ordinary edges.
# Legacy nodes have no inferred parent; Enter creates another root topic.
@export var topic_parent: TextNode:
	set(value):
		topic_parent = value
		notify_persistent_change()

@export var text: String = "":
	set(value):
		text = value
		notify_persistent_change()
		invalidate_geometry()
		if is_node_ready():
			label.text = value
			_queue_collision_update()

@export var font_size := 24:
	set(value):
		font_size = maxi(8, value)
		notify_persistent_change()
		if is_node_ready():
			_apply_appearance()
@export var fixed_width := 0.0:
	set(value):
		fixed_width = maxf(0.0, value)
		notify_persistent_change()
		if is_node_ready():
			_apply_appearance()
@export var fill_color := Color.TRANSPARENT:
	set(value):
		fill_color = value
		notify_persistent_change()
		if is_node_ready():
			_apply_appearance()
@export_storage var border_color := Color("#585b70"):
	set(value):
		border_color = value
		notify_persistent_change()
		if is_node_ready():
			_apply_appearance()
@export_storage var use_theme_border := false:
	set(value):
		use_theme_border = value
		notify_persistent_change()
		if is_node_ready():
			_apply_appearance()

@export var text_color := Color.TRANSPARENT:
	set(value):
		text_color = value
		notify_persistent_change()
		if is_node_ready():
			_apply_appearance()
var _editing := false
var _edit_minimum_size := Vector2.ZERO
var _edit_origin := Vector2.ZERO
var _appearance_light: Variant = null
var _displayed_background := Color(-1, -1, -1, -1)
var _collision_update_pending := false


func _ready() -> void:
	# 与菜单共用原生 DPITexture 圆角，避免固定分辨率位图在画布缩放时失真。
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	super()
	label.text = text
	# 输入层使用左上角定位，最小尺寸变化不能再从中心推动控件。
	# Clicking selected text should position the caret, not start dragging the selection.
	text_edit.drag_and_drop_selection_enabled = false
	text_edit.select_from_padding = true
	text_edit.add_theme_constant_override("wrap_offset", 0)
	text_edit.set_anchors_preset(Control.PRESET_TOP_LEFT)
	text_edit.grow_horizontal = Control.GROW_DIRECTION_END
	text_edit.grow_vertical = Control.GROW_DIRECTION_END
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_normal_label_position = label.position
	_normal_edit_position = text_edit.position
	# 共享字形缓存；原生视口 oversampling 按当前屏幕倍率采样。
	if _canvas_font == null:
		_canvas_font = _make_canvas_font(preload("res://assets/fonts/PingFang-SC-Regular.ttf"))
	var display_font: Font = get_meta("prepared_canvas_font", _canvas_font)
	remove_meta("prepared_canvas_font")
	label.add_theme_font_override("font", display_font)
	text_edit.add_theme_font_override("font", display_font)
	text_edit.add_theme_constant_override("line_spacing", label.get_theme_constant("line_spacing"))
	label.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	text_edit.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_apply_appearance()
	text_edit.set_context_menu_enabled(false)
	text_edit.focus_exited.connect(_on_edit_focus_exited)
	text_edit.commit_requested.connect(exit_edit_mode)
	text_edit.cancel_requested.connect(exit_edit_mode.bind(false))
	text_edit.text_changed.connect(_refresh_edit_layout)
	text_edit.content_metrics_changed.connect(_refresh_edit_layout)
	text_edit.caret_changed.connect(_restore_edit_scroll, CONNECT_DEFERRED)
	text_edit.text_set.connect(_refresh_edit_layout)
	visibility_changed.connect(_on_visibility_changed)
	label.resized.connect(_queue_collision_update)
	container_panel.resized.connect(_queue_collision_update)
	text_edit.resized.connect(_queue_collision_update)
	_queue_collision_update()


func _configure_edit_menu(theme_light: Variant = null) -> void:
	# 禁用 Godot 内置 TextEdit 长菜单，改用项目自己的短菜单，避免右侧滚动条和过宽条目。
	text_edit.set_context_menu_enabled(false)
	if _edit_menu == null:
		_edit_menu = PopupMenu.new()
		_edit_menu.name = "EditMenu"
		text_edit.add_child(_edit_menu)
		_edit_menu.id_pressed.connect(_on_edit_menu_pressed)
	var menu := _edit_menu
	_compact_edit_menu(menu)
	# 文本菜单独立使用工作区的圆角卡片样式，避免继承系统直角灰色菜单。
	var light: bool = _display_theme_is_light() if theme_light == null else bool(theme_light)
	var panel := StyleBoxFlat.new()
	panel.bg_color = Palette.color(light, "surface.raised")
	panel.border_color = Palette.color(light, "border.default")
	panel.set_border_width_all(1)
	panel.set_corner_radius_all(12)
	panel.content_margin_left = 6.0
	panel.content_margin_right = 6.0
	panel.content_margin_top = 5.0
	panel.content_margin_bottom = 5.0
	panel.shadow_color = Color(0, 0, 0, 0.18 if light else 0.34)
	panel.shadow_size = 8
	panel.shadow_offset = Vector2(0, 3)
	menu.add_theme_stylebox_override("panel", Corners.style(panel, Corners.PANEL))

	var hover := StyleBoxFlat.new()
	hover.bg_color = Palette.color(light, "surface.selected")
	hover.set_corner_radius_all(7)
	hover.content_margin_left = 4.0
	hover.content_margin_right = 4.0
	menu.add_theme_stylebox_override("hover", Corners.style(hover, Corners.CONTROL))
	menu.add_theme_stylebox_override("pressed", Corners.style(hover, Corners.CONTROL))

	var separator := StyleBoxFlat.new()
	separator.bg_color = Palette.color(light, "border.subtle")
	separator.content_margin_top = 1.0
	separator.content_margin_bottom = 1.0
	menu.add_theme_stylebox_override("separator", separator)

	for key in ["font_color", "font_hover_color", "font_pressed_color", "font_accelerator_color"]:
		menu.add_theme_color_override(key, Palette.color(light, "text.primary"))
	menu.add_theme_color_override("font_disabled_color", Palette.color(light, "text.disabled"))
	menu.add_theme_font_size_override("font_size", 15)
	menu.add_theme_constant_override("item_vertical_padding", 1)
	menu.add_theme_constant_override("item_start_padding", 6)
	menu.add_theme_constant_override("item_end_padding", 6)
	menu.add_theme_constant_override("h_separation", 4)


func _show_edit_menu(local_position: Vector2) -> void:
	if _edit_menu == null:
		_configure_edit_menu()
	_compact_edit_menu(_edit_menu)
	_edit_menu.size = Vector2i.ZERO
	_edit_menu.max_size = Vector2i(220, 1000)
	_edit_menu.position = Vector2i(text_edit.get_screen_position() + local_position)
	_edit_menu.popup()


func _on_edit_menu_pressed(id: int) -> void:
	text_edit.menu_option(id)


func _compact_edit_menu(menu: PopupMenu) -> void:
	# Godot 默认文本菜单包含书写方向、控制字符等长条目；编辑节点只保留常用项。
	menu.clear()
	var has_selection := text_edit.has_selection()
	menu.add_item("剪切", TextEdit.MENU_CUT)
	menu.set_item_disabled(menu.item_count - 1, not has_selection)
	menu.add_item("复制", TextEdit.MENU_COPY)
	menu.set_item_disabled(menu.item_count - 1, not has_selection)
	menu.add_item("粘贴", TextEdit.MENU_PASTE)
	menu.add_separator()
	menu.add_item("全选", TextEdit.MENU_SELECT_ALL)
	menu.add_item("清空", TextEdit.MENU_CLEAR)
	menu.set_item_disabled(menu.item_count - 1, text_edit.text.is_empty())
	if text_edit.has_undo() or text_edit.has_redo():
		menu.add_separator()
		menu.add_item("撤销", TextEdit.MENU_UNDO)
		menu.set_item_disabled(menu.item_count - 1, not text_edit.has_undo())
		menu.add_item("重做", TextEdit.MENU_REDO)
		menu.set_item_disabled(menu.item_count - 1, not text_edit.has_redo())


func _on_label_gui_input(event: InputEvent) -> void:
	if event is InputEventWithModifiers and event.alt_pressed:
		return
	# 进入编辑模式
	if label.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			enter_edit_mode()
			text_edit.select_all.call_deferred()
			get_viewport().set_input_as_handled()
			return

	super._on_input_event(get_viewport(), event, 0)


func _on_text_edit_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
		_show_edit_menu(event.position)
		text_edit.accept_event()
		return
	text_edit.handle_canvas_input(event)


func _input(event: InputEvent) -> void:
	super._input(event)
	if not _editing or not is_visible_in_tree():
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		# 使用控件局部坐标，兼容相机平移、缩放和子视口。
		if not Rect2(Vector2.ZERO, text_edit.size).has_point(text_edit.get_global_transform_with_canvas().affine_inverse() * event.position):
			exit_edit_mode()


func enter_edit_mode() -> void:
	if _editing:
		return
	finish_drag()
	var stage := get_parent()
	if stage.has_method("select_ids"):
		stage.call("select_ids", PackedStringArray([id]))
	linear_velocity = Vector2.ZERO
	angular_velocity = 0.0
	_edit_minimum_size = label.size
	_edit_origin = label.position
	_editing = true
	if stage.has_method("set_editor_active"):
		stage.call("set_editor_active", self, true)
	_appearance_light = null
	# 编辑控件只作为输入层，复用标签的原始矩形，避免切换时改变刚体碰撞中心。
	text_edit.enable_auto_size = false
	text_edit.wrap_mode = TextEdit.LINE_WRAPPING_NONE
	text_edit.min_width = label.size.x
	text_edit.max_width = maxf(text_edit.min_width, fixed_width if fixed_width > 0.0 else 600.0)
	text_edit.min_height = label.size.y
	text_edit.position = label.position
	text_edit.size = label.size
	text_edit.custom_minimum_size = label.size
	text_edit.text = text
	text_edit.clear_undo_history()
	_apply_appearance(false)
	text_edit.position = label.position
	_align_edit_text()
	# Keep the input overlay on the existing background until the edit is committed.
	text_edit.size = label.size
	# 背景与碰撞始终由 Label 保持；输入层只绘制文字、光标和选区。
	label.show()
	text_edit.z_index = 1
	text_edit.show()
	text_edit.grab_focus()
	text_edit.deselect()
	text_edit.set_caret_line(text_edit.get_line_count() - 1)
	text_edit.set_caret_column(text_edit.get_line(text_edit.get_caret_line()).length())
	_queue_collision_update()


func _on_edit_focus_exited() -> void:
	# The root viewport temporarily releases focus before forwarding a canvas click.
	_finish_edit_after_focus_transfer.call_deferred()


func _finish_edit_after_focus_transfer() -> void:
	if _editing and not text_edit.has_focus():
		exit_edit_mode()


func exit_edit_mode(commit_changes: bool = true) -> void:
	if not _editing:
		return
	# 先结束状态，避免隐藏控件触发 focus_exited 时重复提交。
	_editing = false
	if get_parent().has_method("set_editor_active"):
		get_parent().call("set_editor_active", self, false)
	# apply_ime 会更改 text，必须在快照和隐藏控件之前完成。
	if commit_changes:
		text_edit.apply_ime()
	else:
		text_edit.cancel_ime()
	var changed := commit_changes and text != text_edit.text
	if changed and _history != null:
		_history.begin_transaction()
		var solver := get_parent().get_node_or_null("NodeRepulsion")
		if solver != null:
			solver.begin_local_edit([self])
	if changed:
		text = text_edit.text
	text_edit.release_focus()
	text_edit.hide()
	label.text = text
	label.show()
	_apply_appearance()
	text_edit.enable_auto_size = true
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
	_refresh_corner_styles()
	var bounds := get_visual_rect()
	var center := bounds.get_center()
	var current_shape := collision_shape.shape as RectangleShape2D
	if current_shape != null and current_shape.size == bounds.size and collision_shape.position == center:
		return
	var shape := RectangleShape2D.new()
	shape.size = bounds.size
	collision_shape.shape = shape
	collision_shape.position = center
	invalidate_geometry()


func display_border_color() -> Color:
	var light: bool = Palette.is_light(str(GraphPreferences.value("theme"))) if _appearance_light == null else bool(_appearance_light)
	return Palette.neutral_edge_color(display_background_color(light))


func display_background_color(light: bool) -> Color:
	var background := Palette.color(light, "surface.canvas")
	var chain: Array[Entity] = []
	var current: Entity = self
	while is_instance_valid(current) and not chain.has(current):
		chain.append(current)
		current = current.container
	chain.reverse()
	for node in chain:
		if node is TextNode:
			background = background.blend(node.display_fill_color())
	return background

func _apply_appearance(update_layout: bool = true, theme_light: Variant = null) -> void:
	var light: bool = _display_theme_is_light() if theme_light == null else bool(theme_light)
	var background := display_background_color(light)
	if not update_layout and _appearance_light == light and _displayed_background.is_equal_approx(background):
		return
	_appearance_light = light
	invalidate_geometry()
	_displayed_background = background
	if _edit_menu != null:
		_configure_edit_menu(light)
	label.begin_bulk_theme_override()
	text_edit.begin_bulk_theme_override()
	var foreground := text_color
	if foreground.a == 0.0:
		foreground = Palette.neutral_text_color(background)
	label.add_theme_color_override("font_color", Color(0, 0, 0, 0) if _editing else foreground)
	if update_layout:
		label.add_theme_font_size_override("font_size", font_size)
		text_edit.add_theme_font_size_override("font_size", font_size)
		label.autowrap_mode = TextServer.AUTOWRAP_OFF
		label.custom_minimum_size.x = fixed_width
		_fit_label_text_height()
		label.size = Vector2(fixed_width, 0.0)
	var style := StyleBoxFlat.new()
	style.bg_color = display_fill_color()
	style.border_color = Palette.color(light, "border.focus") if _editing else display_border_color()
	# Borders always use neutral contrast; legacy border fields are storage-only.
	style.set_border_width_all(1)
	style.content_margin_left = 15
	style.content_margin_right = 15
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	container_panel.add_theme_stylebox_override("panel", Corners.style(style, Corners.fitted_radius(container_panel.size, Corners.PANEL), false, true))
	if _container_active:
		style.bg_color = Color.TRANSPARENT
		style.set_border_width_all(0)
	label.add_theme_stylebox_override("normal", Corners.style(style, Corners.fitted_radius(label.size, Corners.PANEL), false, true))
	text_edit.add_theme_color_override("font_color", foreground)
	text_edit.add_theme_color_override("caret_color", foreground)
	text_edit.add_theme_color_override("selection_color", Palette.color(light, "surface.selected"))
	var edit_style := style.duplicate() as StyleBoxFlat
	# 输入框可为光标与输入法扩展，但不接管节点的背景与轮廓。
	edit_style.bg_color = Color.TRANSPARENT
	edit_style.border_color = Color.TRANSPARENT
	edit_style.set_border_width_all(0)
	text_edit.add_theme_stylebox_override("normal", edit_style)
	text_edit.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	label.end_bulk_theme_override()
	text_edit.end_bulk_theme_override()
	if _editing:
		_align_edit_text()
	if update_layout:
		label.reset_size()
		_queue_collision_update()
	_refresh_corner_styles()


# Resizing text or a group changes geometry even when its colors stay unchanged.
# Updating only the style radius preserves content margins and avoids relayout.
func _refresh_corner_styles() -> void:
	_refresh_control_corners(label, "normal")
	_refresh_control_corners(container_panel, "panel")


func _refresh_control_corners(control: Control, key: StringName) -> void:
	var original := Corners.source(control.get_theme_stylebox(key))
	if original == null:
		return
	var radius := Corners.fitted_radius(control.size, Corners.PANEL)
	if original.corner_radius_top_left == int(radius):
		return
	control.add_theme_stylebox_override(key, Corners.style(original, radius, false, true))


func get_visual_outline() -> PackedVector2Array:
	var control: Control = container_panel if _container_active else label
	var key: StringName = &"panel" if _container_active else &"normal"
	var original := Corners.source(control.get_theme_stylebox(key))
	var radius := float(original.corner_radius_top_left) if original != null else 0.0
	return Corners.outline(get_visual_rect(), radius)


static func _make_canvas_font(original: Font) -> Font:
	if original is FontVariation:
		var variation := original.duplicate() as FontVariation
		if original.base_font != null:
			variation.base_font = _make_canvas_font(original.base_font)
		return variation
	if original is FontFile:
		var scalable := original.duplicate() as FontFile
		# Native viewport oversampling supplies the current screen-size raster.
		# Generating 96px MSDFs for every CJK glyph stalls cold large-file loads.
		scalable.multichannel_signed_distance_field = false
		return scalable
	return original


# 包含状态由子对象引用推导，不更换对象身份，因此连线和属性仍指向原节点。
func update_container_layout(members: Array[Entity]) -> void:
	_update_fill_layer(members)
	_apply_appearance(false)
	var layout_key := [global_transform, label.get_minimum_size(), fixed_width]
	for member in members:
		layout_key.append([member.get_instance_id(), member.geometry_version])
	if layout_key == _container_layout_key:
		return
	_container_layout_key = layout_key
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
		# Label/property signals already queue collision updates when needed.
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
	var title_size := Vector2(bounds.size.x, header_height)
	if bounds == _container_rect and container_panel.position == bounds.position and container_panel.size == bounds.size and label.position == bounds.position and label.size == title_size:
		return
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
	# 编辑态不改变可见方块的几何矩形，避免 RigidBody2D 因输入层尺寸变化而位移。
	return Rect2(label.position, label.size)


func _fit_label_text_height() -> void:
	# Match the native editor row height, including its trailing line spacing.
	var row_height := ceili(label.get_theme_font("font").get_height(font_size)) + label.get_theme_constant("line_spacing")
	label.custom_minimum_size.x = maxf(fixed_width, text_edit.measure_unwrapped(label.text).x + 62.0)
	label.custom_minimum_size.y = row_height * maxi(1, label.text.split("\n").size()) + 20.0


func _refresh_edit_layout() -> void:
	if not _editing:
		return
	label.text = text_edit.text
	_fit_label_text_height()
	label.reset_size()
	var metrics := text_edit.measure_unwrapped(text_edit.text, true)
	label.size = label.size.max(_edit_minimum_size).max(Vector2(metrics.x + 62.0, metrics.y + 20.0))
	label.position = _edit_origin
	_align_edit_text()
	text_edit.custom_minimum_size = label.size
	text_edit.size = label.size
	text_edit.position = label.position
	_restore_edit_scroll()
	_queue_collision_update()


func _restore_edit_scroll() -> void:
	if _editing:
		text_edit.scroll_horizontal = 0
		text_edit.scroll_vertical = 0


func _align_edit_text() -> void:
	text_edit.align_with_label(label, text_edit.text, true)


# Display-only opacity: the longest uninterrupted same-RGB branch defines the level.
# Preserve the chosen alpha and serialized fill_color; only the fill is faded.
func display_fill_color() -> Color:
	var result := fill_color
	result.a *= pow(0.78, _fill_layer - 1)
	return result


func _update_fill_layer(members: Array[Entity]) -> void:
	var level := 1
	for member in members:
		if member is TextNode and Color(member.fill_color, 1.0).is_equal_approx(Color(fill_color, 1.0)):
			level = maxi(level, member._fill_layer + 1)
	if level == _fill_layer:
		return
	_fill_layer = level
	_apply_appearance()


func _display_theme_is_light() -> bool:
	var stage := get_parent() as Stage
	if stage != null and stage._applied_theme_light >= 0:
		return stage._applied_theme_light == 1
	return Palette.is_light(str(GraphPreferences.value("theme")))


## Stable full-document bounds during progressive restoration.
func set_loading_container_rect(world_rect: Rect2) -> void:
	_container_layout_key.clear()
	_container_active = true
	_container_rect = global_transform.affine_inverse() * world_rect
	container_panel.position = _container_rect.position
	container_panel.size = _container_rect.size
	container_panel.show()
	label.position = _container_rect.position
	label.size = Vector2(_container_rect.size.x, label.get_minimum_size().y)
	_apply_appearance(false)
	_update_collision_shape()
