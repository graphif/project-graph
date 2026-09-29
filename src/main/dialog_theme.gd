extends RefCounted

const Corners = preload("res://src/main/continuous_corners.gd")
const Palette = preload("res://src/main/theme_palette.gd")


static func configure(target: Theme, light: bool) -> void:
	var surface := Palette.color(light, "surface.panel")
	var field := Palette.color(light, "surface.field")
	var border := Palette.color(light, "border.default")
	var text := Palette.color(light, "text.primary")
	var accent := Palette.color(light, "accent.primary")
	var selected := Palette.color(light, "surface.selected")
	var hover := Palette.color(light, "surface.hover")

	target.set_type_variation("DialogSurface", "Panel")
	var background := _panel(Color.TRANSPARENT, Color.TRANSPARENT, 0, 0)
	background.border_width_top = 0
	background.corner_radius_top_left = 0
	background.corner_radius_top_right = 0
	target.set_stylebox("panel", "DialogSurface", background)
	var accept_panel := _panel(Color.TRANSPARENT, Color.TRANSPARENT, 20, 0)
	target.set_stylebox("panel", "AcceptDialog", accept_panel)
	target.set_constant("buttons_min_height", "AcceptDialog", 36)
	target.set_constant("buttons_min_width", "AcceptDialog", 88)
	target.set_constant("buttons_separation", "AcceptDialog", 16)

	var frame := Corners.source(target.get_stylebox("embedded_border", "Window")).duplicate() as StyleBoxFlat
	if frame != null:
		frame.bg_color = surface
		frame.border_color = border
		frame.set_corner_radius_all(12)
		frame.shadow_color = Color(0, 0, 0, 0.1 if light else 0.22)
		frame.shadow_size = 8
		target.set_stylebox("embedded_border", "Window", frame)
		# 下拉菜单取得焦点时，父窗口仍使用同样的边框和标题栏。
		target.set_stylebox("embedded_unfocused_border", "Window", frame.duplicate())
	target.set_font_size("title_font_size", "Window", 16)
	target.set_color("title_color", "Window", text)
	# Include padding in the SVG so DPITexture keeps the 28-pixel hit area.
	var close_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M8 8L20 20M20 8L8 20" fill="none" stroke="#%s" stroke-width="1.5" stroke-linecap="round"/></svg>' % text.to_html(false)
	var close_icon := DPITexture.create_from_string(close_svg)
	target.set_icon("close", "Window", close_icon)
	target.set_icon("close_pressed", "Window", close_icon)
	# 图标居中于标题栏，点击区域距右边缘 6 像素。
	target.set_constant("close_h_offset", "Window", 34)
	target.set_constant("close_v_offset", "Window", 30)

	target.set_type_variation("DialogTabs", "TabContainer")
	var content := _panel(Color.TRANSPARENT, Color.TRANSPARENT, 0, 0)
	content.content_margin_top = 16
	target.set_stylebox("panel", "DialogTabs", content)
	for state in ["tab_selected", "tab_unselected", "tab_hovered", "tab_disabled"]:
		var tab := _panel(hover if state == "tab_hovered" else Color.TRANSPARENT, accent, 12, 0)
		tab.set_border_width_all(0)
		tab.border_width_bottom = 2 if state == "tab_selected" else 0
		tab.content_margin_top = 8
		tab.content_margin_bottom = 10
		target.set_stylebox(state, "DialogTabs", tab)
	var tab_focus := _panel(Color.TRANSPARENT, accent, 0, 0)
	tab_focus.set_border_width_all(0)
	tab_focus.border_width_bottom = 2
	target.set_stylebox("tab_focus", "DialogTabs", tab_focus)
	target.set_color("font_selected_color", "DialogTabs", text)
	target.set_color("font_unselected_color", "DialogTabs", Palette.color(light, "text.secondary"))
	target.set_constant("side_margin", "DialogTabs", 0)
	target.set_constant("tab_separation", "DialogTabs", 8)

	target.set_type_variation("DialogButton", "Button")
	target.set_type_variation("DialogPrimaryButton", "DialogButton")
	for state in ["normal", "hover", "pressed", "hover_pressed", "disabled"]:
		var color := field
		if state == "hover":
			color = hover
		elif state in ["pressed", "hover_pressed"]:
			color = selected
		var button := _panel(color, Color.TRANSPARENT, 10, 5)
		button.content_margin_top = 7
		button.content_margin_bottom = 7
		target.set_stylebox(state, "DialogButton", button)
	var focus := _panel(Color.TRANSPARENT, accent, 0, 8)
	focus.set_border_width_all(2)
	target.set_stylebox("focus", "DialogButton", focus)
	for key in ["font_color", "font_focus_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "icon_normal_color", "icon_hover_color", "icon_pressed_color", "icon_hover_pressed_color"]:
		target.set_color(key, "DialogButton", text)
		target.set_color(key, "DialogPrimaryButton", Palette.color(light, "text.on_accent"))
	for state in ["normal", "hover", "pressed", "hover_pressed"]:
		var button := _panel(accent.lightened(0.08) if state == "hover" else accent, accent, 10, 8)
		button.content_margin_top = 7
		button.content_margin_bottom = 7
		target.set_stylebox(state, "DialogPrimaryButton", button)

	target.set_type_variation("SettingsSwitch", "CheckButton")
	# 开关状态只由滑块表达，不再铺满整行的按钮背景。
	for state in ["normal", "hover", "pressed", "hover_pressed", "disabled"]:
		var switch_style := _panel(Color.TRANSPARENT, Color.TRANSPARENT, 0, 6)
		switch_style.content_margin_top = 6
		switch_style.content_margin_bottom = 6
		target.set_stylebox(state, "SettingsSwitch", switch_style)
	target.set_stylebox("focus", "SettingsSwitch", focus)
	for key in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color"]:
		target.set_color(key, "SettingsSwitch", text)
	target.set_color("button_checked_color", "SettingsSwitch", Color.WHITE)
	target.set_color("button_unchecked_color", "SettingsSwitch", Color.WHITE)
	for checked in [false, true]:
		for disabled in [false, true]:
			for mirrored in [false, true]:
				var icon_name := ("checked" if checked else "unchecked") + ("_disabled" if disabled else "") + ("_mirrored" if mirrored else "")
				target.set_icon(icon_name, "SettingsSwitch", Palette.switch_icon(light, checked, disabled, mirrored))

	target.set_type_variation("DialogField", "LineEdit")
	target.set_type_variation("DialogOption", "OptionButton")
	target.set_type_variation("DialogTextEdit", "TextEdit")
	for type in ["DialogField", "DialogOption", "DialogTextEdit"]:
		for state in ["normal", "hover", "pressed", "hover_pressed", "read_only"]:
			var box := _panel(hover if state == "hover" else field, Color.TRANSPARENT, 10, 5)
			box.content_margin_top = 6
			box.content_margin_bottom = 6
			target.set_stylebox(state, type, box)
		target.set_stylebox("focus", type, focus)
		for key in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color"]:
			target.set_color(key, type, text)
	target.set_color("font_readonly_color", "DialogTextEdit", Palette.color(light, "text.secondary"))
	target.set_color("caret_color", "DialogTextEdit", text)
	target.set_color("selection_color", "DialogTextEdit", selected)
	target.set_color("font_selected_color", "DialogTextEdit", text)
	target.set_type_variation("DialogScroll", "VScrollBar")
	var track := _panel(Color.TRANSPARENT, Color.TRANSPARENT, 3, 3)
	target.set_stylebox("scroll", "DialogScroll", track)
	target.set_stylebox("scroll_focus", "DialogScroll", track)
	for state in ["grabber", "grabber_highlight", "grabber_pressed"]:
		var grabber := _panel(border if state == "grabber" else accent, Color.TRANSPARENT, 3, 3)
		grabber.content_margin_top = 12
		grabber.content_margin_bottom = 12
		target.set_stylebox(state, "DialogScroll", grabber)


static func apply_controls(dialog: Window) -> void:
	# 内容面板透明，由 embedded_border 绘制完整表面；视口必须同步透明。
	dialog.transparent_bg = true
	_remove_saved_scrollbars(dialog)
	for control in dialog.find_children("*", "Control", true, false):
		if control is CheckButton:
			control.theme_type_variation = "SettingsSwitch"
		elif control is SpinBox:
			control.get_line_edit().theme_type_variation = "DialogField"
		elif control is TextEdit:
			control.theme_type_variation = "DialogTextEdit"
		elif control is LineEdit:
			control.theme_type_variation = "DialogField"
		elif control is OptionButton:
			control.theme_type_variation = "DialogOption"
		elif control is ColorPickerButton:
			control.theme_type_variation = "DialogButton"
		elif control.get_class() == "Button" and control.theme_type_variation.is_empty():
			control.theme_type_variation = "DialogButton"
		elif control is ScrollContainer:
			control.get_v_scroll_bar().theme_type_variation = "DialogScroll"


static func _panel(background: Color, border: Color, margin: int, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	# 透明白色的一像素边框会在圆角抗锯齿处形成亮色碎边。
	style.bg_color = Color(0, 0, 0, 0) if background.a == 0.0 else background
	style.border_color = style.bg_color if border.a == 0.0 else border
	style.set_border_width_all(0 if border.a == 0.0 else 1)
	style.set_corner_radius_all(radius)
	style.content_margin_left = margin
	style.content_margin_right = margin
	style.content_margin_top = margin
	style.content_margin_bottom = margin
	return style


static func _remove_saved_scrollbars(node: Node) -> void:
	# 引擎内部滚动条由控件自行创建；旧场景误保存的副本是普通子节点。
	# 只删除带自动生成名称的副本，保留内部节点及明确命名的自定义控件。
	for child in node.get_children():
		if (node is ItemList or node is TextEdit) and child is ScrollBar and str(child.name).begins_with("@") and child.owner != null:
			node.remove_child(child)
			child.free()
		else:
			_remove_saved_scrollbars(child)
