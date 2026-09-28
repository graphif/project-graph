extends Control

const Corners = preload("res://src/main/continuous_corners.gd")

const LocalTheme = preload("res://src/main/local_theme.gd")
var _local_theme := LocalTheme.new()

const DialogTheme = preload("res://src/main/dialog_theme.gd")

const WINDOWS := ["FindWindow", "OutlineWindow", "ReferencesWindow", "NodeDetailsWindow", "RecentFilesWindow", "CommandPalette", "GenerateNodeWindow", "ColorWindow", "SettingsWindow", "HelpWindow"]
const SUPPORTED := [
	"newDraft", "openFile", "openCurrentProjectFileFolder", "clickAppMenuRecentFileButton",
	"saveFile", "saveAs", "manualBackup", "openDefaultBackupFolder", "importTextFile",
	"exportSvgAll", "exportSvgSelected", "exportPngLegacy", "exportPngSelected",
	"exportSelectedNetStructureToPlainText", "exportSelectedTreeStructureToPlainText",
	"exportSelectedTreeStructureToMarkdown", "exportSelectedNetStructureToMermaid",
	"openOutlineWindow", "openReferencesWindow", "openColorManagerWindow",
	"resetViewAll", "resetView", "resetCameraScale", "moveViewToOrigin", "stopDrifting", "focusRandomEntity",
	"searchText", "updateReferences", "undo", "redo", "releaseKeys", "closeAllSubWindows",
	"generateNodeTreeByText", "generateNodeTreeByMarkdown", "generateNodeGraphByText", "clearStage",
	"clickAppMenuSettingsButton", "openAppearanceSettings", "resetAllKeyBinds", "openConfigFolder", "openCacheFolder",
	"toggleFullscreen", "checkoutClassroomMode", "checkoutProtectPrivacy", "toggleBackgroundHorizontalLines",
	"toggleBackgroundVerticalLines", "toggleBackgroundDots", "switchDebugShow", "openAboutWindow", "openOfficialDocs",
	"copy", "paste", "delete", "selectAll", "newNode", "properties", "welcome", "commands", "closeTab",
	"modeSelect", "modeDraw", "modeConnect", "grid", "theme", "website", "guide",
]
const DEFAULT_KEYS := {
	"newDraft": KEY_MASK_CTRL | KEY_N, "openFile": KEY_MASK_CTRL | KEY_O,
	"saveFile": KEY_MASK_CTRL | KEY_S, "saveAs": KEY_MASK_CTRL | KEY_MASK_SHIFT | KEY_S,
	"closeTab": KEY_MASK_CTRL | KEY_W, "searchText": KEY_MASK_CTRL | KEY_F,
	"commands": KEY_MASK_CTRL | KEY_MASK_SHIFT | KEY_P, "undo": KEY_MASK_CTRL | KEY_Z,
	"redo": KEY_MASK_CTRL | KEY_MASK_SHIFT | KEY_Z, "copy": KEY_MASK_CTRL | KEY_C,
	"paste": KEY_MASK_CTRL | KEY_V, "selectAll": KEY_MASK_CTRL | KEY_A,
	"delete": KEY_DELETE, "resetView": KEY_F, "toggleFullscreen": KEY_F11,
	"clickAppMenuSettingsButton": KEY_MASK_CTRL | KEY_COMMA,
}
const SETTING_FIELDS := {
	"GridH": "grid_h", "GridV": "grid_v", "GridDots": "grid_dots", "Snap": "snap",
	"Physics": "physics", "Effects": "effects", "Welcome": "welcome", "LeftMode": "left_mode",
	"RightMode": "right_mode", "UIScale": "ui_scale", "CameraSpeed": "camera_speed",
}
@onready var tabs = %TabContainer
@onready var overlay: Control = $UIOverlay
var _command_labels := {}
var _shortcut_events := {}
var _menus: Array[PopupMenu] = []
var _tick := 0.0
var _last_graph := ""
var _toast_time := 0.0
var _pending_close: Control
var _quitting := false
var _export_kind := ""
var _export_selected := false
var _export_stage: Stage
var _binding_command := ""
var _details_id := ""
var _loading_settings := false
var _dark_theme: Theme
var _light_theme: Theme
var _context_position := Vector2.ZERO
var _theme_save_revision := 0
var _theme_save_pending := false
var _displayed_theme_light := false


func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	get_tree().auto_accept_quit = false
	get_window().borderless = true
	get_window().dpi_changed.connect(_apply_ui_scale)
	$VBoxContainer/Header/Spacer.mouse_filter = Control.MOUSE_FILTER_STOP
	$VBoxContainer/Header/Spacer.gui_input.connect(_on_header_gui_input)
	get_viewport().gui_embed_subwindows = true
	get_window().close_requested.connect(_request_quit)
	var screen_fps := DisplayServer.screen_get_refresh_rate(DisplayServer.SCREEN_OF_MAIN_WINDOW)
	Engine.physics_ticks_per_second = maxi(60, int(screen_fps))
	_prepare_themes()
	_build_command_labels(GraphMenuCatalog.MENUS)
	_command_labels.merge({"copy": "复制", "paste": "粘贴", "delete": "删除", "selectAll": "全选", "newNode": "新建文本节点", "properties": "节点属性", "welcome": "欢迎页", "commands": "命令面板", "closeTab": "关闭标签页"}, true)
	_restore_menu_commands($VBoxContainer/Header/MenuBar, GraphMenuCatalog.MENUS)
	_setup_menus($VBoxContainer/Header/MenuBar)
	$UIOverlay/PopupMenu.id_pressed.connect(_on_context_action)
	_setup_buttons()
	_setup_panels()
	_setup_settings()
	_local_theme.configure(self, _dark_theme, _light_theme)
	_reload_shortcuts()
	tabs.stage_added.connect(_on_stage_added)
	tabs.stage_closed.connect(_on_stage_closed)
	tabs.close_requested.connect(_on_close_requested)
	tabs.workspace_error.connect(_show_error)
	tabs.workspace_saved.connect(_on_saved)
	for stage in tabs.stages():
		_on_stage_added(stage)
	%OpenFileDialog.visibility_changed.connect(_file_dialog_visibility_changed)
	%SaveFileDialog.visibility_changed.connect(_file_dialog_visibility_changed)
	%SaveFileDialog.canceled.connect(func(): _quitting = false; _pending_close = null)
	_apply_preferences()
	$UIOverlay/Welcome.visible = bool(GraphPreferences.value("welcome"))
	_refresh_recent()
	_on_tab_changed(tabs.current_tab)


func _panel(name: String) -> Node:
	return overlay.get_node(name + "/Margin/Content")


func _button(path: String, command: String) -> void:
	var button := get_node(path) as Button
	button.pressed.connect(_run.bind(command))


func _build_command_labels(items: Array) -> void:
	for item in items:
		if item.type == "item":
			_command_labels[item.id] = item.label
		if item.has("children"):
			_build_command_labels(item.children)


func _restore_menu_commands(parent: Node, definitions: Array) -> void:
	# PopupMenu 的条目 metadata 不随场景保存；每次启动按配置恢复命令。
	for definition in definitions:
		if definition.type != "topMenu":
			continue
		var popup := parent.get_node_or_null(str(definition.id)) as PopupMenu
		if popup != null:
			_bind_popup_commands(popup, definition.children)


func _bind_popup_commands(popup: PopupMenu, definitions: Array) -> void:
	for definition in definitions:
		if definition.type == "recentFiles":
			popup.set_meta("recent_files", true)
			continue
		if definition.type not in ["item", "sub"]:
			continue
		for index in popup.item_count:
			if popup.get_item_text(index) != str(definition.label):
				continue
			if definition.type == "item":
				popup.set_item_metadata(index, str(definition.id))
			else:
				var submenu := popup.get_node_or_null(str(definition.id)) as PopupMenu
				if submenu != null:
					popup.set_item_submenu(index, str(submenu.name))
					_bind_popup_commands(submenu, definition.children)
			break


func _setup_menus(node: Node) -> void:
	for child in node.get_children():
		if child is PopupMenu:
			child.theme = _light_theme if _displayed_theme_light else _dark_theme
			child.about_to_popup.connect(_sync_window_theme.bind(child))
			_menus.append(child)
			child.id_pressed.connect(_on_menu_pressed.bind(child))
			child.about_to_popup.connect(_refresh_menu.bind(child))
			_refresh_menu(child)
		_setup_menus(child)


func _refresh_menu(popup: PopupMenu) -> void:
	if popup.get_meta("recent_files", false):
		popup.clear()
		var paths := GraphPreferences.recent_files()
		for index in mini(paths.size(), 12):
			popup.add_item(paths[index].get_file())
			popup.set_item_metadata(index, "recent:" + paths[index])
			popup.set_item_tooltip(index, paths[index])
			popup.set_item_disabled(index, not FileAccess.file_exists(paths[index]))
		return
	for index in popup.item_count:
		var command: Variant = popup.get_item_metadata(index)
		if not command is String:
			continue
		popup.set_item_disabled(index, not _available(command))
		if not SUPPORTED.has(command):
			popup.set_item_tooltip(index, "此功能暂不可用")
		elif _shortcut_events.has(command):
			popup.set_item_accelerator(index, _shortcut_events[command].get_keycode_with_modifiers())


func _on_menu_pressed(id: int, popup: PopupMenu) -> void:
	var command: Variant = popup.get_item_metadata(popup.get_item_index(id))
	if command is String:
		_run(command)


func _available(command: String) -> bool:
	if command.begins_with("recent:"):
		return true
	if not SUPPORTED.has(command):
		return false
	var stage: Stage = tabs.get_current_stage()
	if command in ["undo", "redo"]:
		return stage != null and (stage.history.can_undo() if command == "undo" else stage.history.can_redo())
	if command in ["delete", "copy", "properties", "exportSvgSelected", "exportPngSelected"]:
		return stage != null and not stage.selected_objects().is_empty()
	return true


func _setup_buttons() -> void:
	var header := "VBoxContainer/Header/"
	_button(header + "Home", "welcome")
	_button(header + "Commands", "commands")
	_button(header + "ThemeMode", "theme")
	$VBoxContainer/Header/Pin.toggled.connect(func(pressed): get_window().always_on_top = pressed)
	$VBoxContainer/Header/Minimize.pressed.connect(func(): get_window().mode = Window.MODE_MINIMIZED)
	$VBoxContainer/Header/Maximize.pressed.connect($WindowChrome.toggle_maximize)
	$VBoxContainer/Header/Close.pressed.connect(_request_quit)
	var tools := "UIOverlay/BottomToolbar/Tools/"
	_button(tools + "Select", "modeSelect")
	_button(tools + "Draw", "modeDraw")
	_button(tools + "Connect", "modeConnect")
	var quick := "UIOverlay/QuickSettings/Items/"
	for pair in [["Search", "searchText"], ["Outline", "openOutlineWindow"], ["Details", "properties"], ["Color", "openColorManagerWindow"], ["Grid", "grid"], ["Fit", "resetViewAll"]]:
		_button(quick + pair[0], pair[1])
	var welcome := "UIOverlay/Welcome/Margin/Content/"
	$UIOverlay/Welcome/Margin/Content/TitleRow/Close.pressed.connect(func(): $UIOverlay/Welcome.hide())
	for pair in [["New", "newDraft"], ["Open", "openFile"], ["Recent", "clickAppMenuRecentFileButton"], ["Guide", "guide"]]:
		_button(welcome + "Columns/Start/Actions/" + pair[0], pair[1])
	for pair in [["Settings", "clickAppMenuSettingsButton"], ["About", "openAboutWindow"], ["Website", "website"]]:
		_button(welcome + "Columns/Links/" + pair[0], pair[1])
	$UIOverlay/Welcome/Margin/Content/Columns/Start/RecentList.item_activated.connect(_open_welcome_recent)


func _setup_panels() -> void:
	for dialog in overlay.get_children():
		if dialog is Window:
			dialog.theme = _light_theme if _displayed_theme_light else _dark_theme
			dialog.visibility_changed.connect(_sync_visible_window_theme.bind(dialog))
			DialogTheme.apply_controls(dialog)
			$DialogMotion.register_window(dialog)
		if dialog is AcceptDialog:
			dialog.transparent_bg = true
			dialog.get_ok_button().theme_type_variation = "DialogPrimaryButton"
			if dialog is ConfirmationDialog:
				dialog.get_cancel_button().theme_type_variation = "DialogButton"
	for name in WINDOWS:
		var window := overlay.get_node(name) as Window
		window.close_requested.connect(window.hide)
		window.window_input.connect(_on_window_input.bind(window))
		window.visibility_changed.connect(_update_text_input_gate)
	_panel("FindWindow").get_node("Query").text_changed.connect(_refresh_find)
	_panel("FindWindow").get_node("Query").text_submitted.connect(func(_text): _step_find(1))
	_panel("FindWindow").get_node("Options/Case").toggled.connect(func(_value): _refresh_find())
	var scope := _panel("FindWindow").get_node("Options/Scope") as OptionButton
	for label in ["整个舞台", "选中内容", "选中内容范围"]:
		scope.add_item(label)
	scope.item_selected.connect(func(_index): _refresh_find())
	_panel("FindWindow").get_node("Results").item_activated.connect(_focus_find)
	_panel("FindWindow").get_node("Results").item_selected.connect(_focus_find)
	_panel("FindWindow").get_node("Actions/Previous").pressed.connect(_step_find.bind(-1))
	_panel("FindWindow").get_node("Actions/Next").pressed.connect(_step_find.bind(1))
	_panel("FindWindow").get_node("Actions/Select").pressed.connect(_select_find_results)
	_panel("OutlineWindow").get_node("Header/Refresh").pressed.connect(_refresh_outline)
	_panel("OutlineWindow").get_node("Tree").item_selected.connect(_focus_outline)
	_panel("ReferencesWindow").get_node("Results").item_activated.connect(_focus_reference)
	_panel("NodeDetailsWindow").get_node("Actions/Apply").pressed.connect(_apply_details)
	_panel("NodeDetailsWindow").get_node("Actions/Delete").pressed.connect(_run.bind("delete"))
	_panel("RecentFilesWindow").get_node("Query").text_changed.connect(func(_text): _refresh_recent())
	_panel("RecentFilesWindow").get_node("Files").item_activated.connect(_open_recent)
	_panel("RecentFilesWindow").get_node("Actions/Open").pressed.connect(func(): _open_recent(-1))
	_panel("RecentFilesWindow").get_node("Actions/Remove").pressed.connect(_remove_recent)
	_panel("RecentFilesWindow").get_node("Actions/Clear").pressed.connect(func(): GraphPreferences.set_recent(PackedStringArray()); _refresh_recent())
	_panel("CommandPalette").get_node("Query").text_changed.connect(_refresh_commands)
	_panel("CommandPalette").get_node("Query").text_submitted.connect(func(_text): _activate_command(-1))
	_panel("CommandPalette").get_node("Results").item_activated.connect(_activate_command)
	var modes := _panel("GenerateNodeWindow").get_node("Mode") as OptionButton
	for label in ["缩进文本 → 树形节点", "Markdown → 树形节点", "每行 → 独立节点"]:
		modes.add_item(label)
	_panel("GenerateNodeWindow").get_node("Generate").pressed.connect(_generate)
	_panel("ColorWindow").get_node("Apply").pressed.connect(_apply_color)
	$UIOverlay/UnsavedDialog.add_button("不保存", false, "discard").theme_type_variation = "DialogButton"
	$UIOverlay/UnsavedDialog.confirmed.connect(_save_before_close)
	$UIOverlay/UnsavedDialog.custom_action.connect(func(_action): _discard_close())
	$UIOverlay/UnsavedDialog.canceled.connect(func(): _pending_close = null; _quitting = false)
	$UIOverlay/ConfirmClear.confirmed.connect(func(): var stage: Stage = tabs.get_current_stage(); stage.delete_objects(stage.stage_objects()))
	$UIOverlay/ExportDialog.file_selected.connect(_export_file)
	$UIOverlay/ImportDialog.file_selected.connect(_import_text)


func _show_panel(name: String) -> void:
	$UIOverlay/Welcome.hide()
	var stage: Stage = tabs.get_current_stage()
	if stage != null:
		stage.finish_text_editing()
	var window := overlay.get_node(name) as Window
	var viewport_size := get_viewport_rect().size
	window.size = Vector2i(Vector2(window.size).min(viewport_size * 0.9))
	_sync_window_theme(window)
	window.popup_centered()
	match name:
		"FindWindow":
			_refresh_find()
			_panel(name).get_node("Query").grab_focus()
		"CommandPalette":
			_refresh_commands()
			_panel(name).get_node("Query").grab_focus()
		"OutlineWindow": _refresh_outline()
		"ReferencesWindow": _refresh_references()
		"NodeDetailsWindow": _refresh_details()
		"RecentFilesWindow": _refresh_recent()


func _run(command: String) -> void:
	if not _available(command):
		return
	var stage: Stage = tabs.get_current_stage()
	if command.begins_with("recent:"):
		tabs.load_files(PackedStringArray([command.trim_prefix("recent:")]))
		$UIOverlay/Welcome.hide()
		return
	match command:
		"newDraft":
			tabs.new_tab()
			$UIOverlay/Welcome.hide()
		"openFile": %OpenFileDialog.popup_centered_ratio(0.7)
		"saveFile": tabs.save_current_file()
		"saveAs": tabs.request_save_as()
		"closeTab": tabs.close_tab(tabs.current_tab)
		"newNode": stage.create_text_node("...", stage.camera.target_position).enter_edit_mode()
		"welcome": $UIOverlay/Welcome.show(); _refresh_recent()
		"commands": _show_panel("CommandPalette")
		"searchText": _show_panel("FindWindow")
		"openOutlineWindow": _show_panel("OutlineWindow")
		"openReferencesWindow": _show_panel("ReferencesWindow")
		"properties": _show_panel("NodeDetailsWindow")
		"clickAppMenuRecentFileButton": _show_panel("RecentFilesWindow")
		"clickAppMenuSettingsButton": _show_settings(0)
		"openAppearanceSettings": _show_settings(2)
		"openAboutWindow": _show_settings(3)
		"guide": _show_panel("HelpWindow")
		"openOfficialDocs": OS.shell_open("https://project-graph.top")
		"website": OS.shell_open("https://graphif.dev")
		"openColorManagerWindow": _show_panel("ColorWindow")
		"undo": stage.history.undo()
		"redo": stage.history.redo()
		"copy": WorkspaceActions.copy_selection(stage)
		"paste": WorkspaceActions.paste(stage)
		"delete": stage.delete_objects(stage.selected_objects())
		"selectAll": stage.select_all()
		"resetViewAll": stage.focus_objects(stage.stage_objects())
		"resetView": stage.focus_objects(stage.selected_objects() if not stage.selected_objects().is_empty() else stage.stage_objects())
		"resetCameraScale": stage.camera.target_zoom = Vector2.ONE
		"moveViewToOrigin": stage.camera.target_position = Vector2.ZERO
		"stopDrifting", "releaseKeys":
			stage.finish_interaction()
			stage.camera.velocity = Vector2.ZERO
			stage.camera.target_position = stage.camera.global_position
			stage.camera.is_panning = false
		"focusRandomEntity":
			var objects := stage.stage_objects()
			if not objects.is_empty():
				var object: StageObject = objects.pick_random()
				stage.select_ids(PackedStringArray([object.id]))
				stage.focus_objects([object])
		"updateReferences": _refresh_references(); _refresh_outline()
		"closeAllSubWindows":
			for name in WINDOWS:
				overlay.get_node(name).hide()
		"generateNodeTreeByText", "generateNodeTreeByMarkdown", "generateNodeGraphByText":
			_panel("GenerateNodeWindow").get_node("Mode").select(1 if command == "generateNodeTreeByMarkdown" else (2 if command == "generateNodeGraphByText" else 0))
			_show_panel("GenerateNodeWindow")
		"clearStage": $UIOverlay/ConfirmClear.popup_centered()
		"modeSelect", "modeDraw", "modeConnect":
			stage.finish_interaction()
			_set_preference("left_mode", ["modeSelect", "modeDraw", "modeConnect"].find(command))
		"toggleBackgroundHorizontalLines": _toggle_preference("grid_h")
		"toggleBackgroundVerticalLines": _toggle_preference("grid_v")
		"toggleBackgroundDots": _toggle_preference("grid_dots")
		"grid":
			var show_grid := not bool(GraphPreferences.value("grid_h")) or not bool(GraphPreferences.value("grid_v"))
			GraphPreferences.set_value("grid_h", show_grid)
			_set_preference("grid_v", show_grid)
		"theme": _set_preference("theme", "light" if GraphPreferences.value("theme") == "mocha" else "mocha")
		"checkoutClassroomMode": _toggle_preference("classroom")
		"checkoutProtectPrivacy": _toggle_preference("privacy")
		"toggleFullscreen": get_window().mode = Window.MODE_WINDOWED if get_window().mode == Window.MODE_FULLSCREEN else Window.MODE_FULLSCREEN
		"switchDebugShow": $UIOverlay/DebugInfo.visible = not $UIOverlay/DebugInfo.visible
		"resetAllKeyBinds": GraphPreferences.reset_bindings(); _reload_shortcuts()
		"openCurrentProjectFileFolder":
			if not stage.current_file_path.is_empty():
				OS.shell_open(stage.current_file_path.get_base_dir())
		"openConfigFolder", "openCacheFolder": OS.shell_open(ProjectSettings.globalize_path("user://"))
		"openDefaultBackupFolder":
			DirAccess.make_dir_recursive_absolute("user://backups")
			OS.shell_open(ProjectSettings.globalize_path("user://backups"))
		"manualBackup": _backup(stage)
		"importTextFile":
			$UIOverlay/ImportDialog.filters = PackedStringArray(["*.txt,*.md;文本和 Markdown"])
			$UIOverlay/ImportDialog.popup_centered_ratio(0.7)
		"exportSvgAll", "exportSvgSelected": _request_export("svg", command.ends_with("Selected"))
		"exportPngLegacy", "exportPngSelected": _request_export("png", command.ends_with("Selected"))
		"exportSelectedNetStructureToPlainText": _request_export("network", true)
		"exportSelectedTreeStructureToPlainText": _request_export("tree", true)
		"exportSelectedTreeStructureToMarkdown": _request_export("markdown", true)
		"exportSelectedNetStructureToMermaid": _request_export("mermaid", true)


func _setup_settings() -> void:
	var general := _panel("SettingsWindow").get_node("Tabs/General")
	general.get_node("Search").text_changed.connect(func(query):
		for row in general.get_node("Scroll/ContentInset/Rows").get_children():
			row.visible = query.is_empty() or str(row.get_node("Label").text).containsn(query)
	)
	for field in SETTING_FIELDS:
		var control := general.get_node("Scroll/ContentInset/Rows/" + field + "/Value")
		var key: String = SETTING_FIELDS[field]
		if control is CheckButton:
			control.toggled.connect(func(value): _set_preference(key, value))
		elif control is OptionButton:
			var options := ["选择和移动", "画笔", "连接和切割"] if field == "LeftMode" else ["切割", "移动视野"]
			for option in options:
				control.add_item(option)
			control.item_selected.connect(func(value): _set_preference(key, value))
		elif control is SpinBox:
			control.min_value = 75 if field == "UIScale" else 100
			control.max_value = 200 if field == "UIScale" else 3000
			control.step = 5 if field == "UIScale" else 100
			control.suffix = "%" if field == "UIScale" else "px/s"
			control.value_changed.connect(func(value): _set_preference(key, value))
	var setting_tabs := _panel("SettingsWindow").get_node("Tabs") as TabContainer
	for index in setting_tabs.get_tab_count():
		setting_tabs.set_tab_title(index, str(setting_tabs.get_tab_control(index).get_meta("title")))
	var appearance := setting_tabs.get_node("Appearance")
	appearance.get_node("Theme").add_item("Catppuccin Mocha")
	appearance.get_node("Theme").add_item("明亮 · 绿色")
	appearance.get_node("Theme").item_selected.connect(func(index): _set_preference("theme", "mocha" if index == 0 else "light"))
	for pair in [["Classroom", "classroom"], ["Privacy", "privacy"], ["Quick", "quick"]]:
		appearance.get_node(pair[0]).toggled.connect(func(value): _set_preference(pair[1], value))
	setting_tabs.get_node("Shortcuts/Reset").pressed.connect(_run.bind("resetAllKeyBinds"))
	setting_tabs.get_node("Shortcuts/Keys").item_activated.connect(_begin_key_binding)
	setting_tabs.get_node("About/Scroll/Inset/Body/Links/Website").pressed.connect(_run.bind("website"))
	setting_tabs.get_node("About/Scroll/Inset/Body/Links/Source").pressed.connect(func(): OS.shell_open("https://github.com/graphif/project-graph"))


func _show_settings(tab: int) -> void:
	_show_panel("SettingsWindow")
	_panel("SettingsWindow").get_node("Tabs").current_tab = tab


func _toggle_preference(key: String) -> void:
	_set_preference(key, not bool(GraphPreferences.value(key)))


func _set_preference(key: String, value: Variant) -> void:
	if _loading_settings or GraphPreferences.value(key) == value:
		return
	var error := GraphPreferences.set_value(key, value, key != "theme")
	if error != OK:
		_show_error("无法保存设置：" + error_string(error))
	if key == "theme":
		$ThemeTransition.reveal(_apply_preferences.bind(key, value), _apply_theme_button, str(value) == "light")
		_save_theme_later()
	else:
		_apply_preferences(key)


func _save_theme_later() -> void:
	_theme_save_revision += 1
	var revision := _theme_save_revision
	_theme_save_pending = true
	# 连续切换只落盘最后一次选择，磁盘 I/O 不占用点击和动画开始的帧。
	await get_tree().create_timer(0.6).timeout
	if revision != _theme_save_revision:
		return
	while $ThemeTransition.is_transitioning():
		await get_tree().create_timer(0.1).timeout
		if revision != _theme_save_revision:
			return
	_flush_theme_preference()


func _flush_theme_preference() -> void:
	if not _theme_save_pending:
		return
	_theme_save_pending = false
	var error := GraphPreferences.flush()
	if error != OK:
		_show_error("无法保存设置：" + error_string(error))


func _prepare_themes() -> void:
	theme.default_font = preload("res://assets/fonts/PingFang-SC-Regular.ttf")
	# 构建完整配色后再挂到控件上；两套主题共享字体和图标。
	_dark_theme = theme.duplicate(false)
	_dark_theme.default_font_size = 14
	_dark_theme.set_type_variation("MutedLabel", "Label")
	_dark_theme.set_color("font_color", "MutedLabel", Color("#a6adc8"))
	_light_theme = _dark_theme.duplicate(false)
	for type in _light_theme.get_type_list():
		for key in ["font_color", "font_focus_color", "font_hover_color", "font_hovered_color", "font_selected_color", "font_pressed_color", "font_hover_pressed_color", "title_color", "icon_normal_color", "icon_hover_color", "icon_pressed_color", "icon_hover_pressed_color", "icon_selected_color", "icon_unselected_color", "icon_hovered_color"]:
			_light_theme.set_color(key, type, Color("#24452c"))
		for key in ["font_unselected_color", "font_placeholder_color"]:
			_light_theme.set_color(key, type, Color("#617568"))
		for key in ["font_disabled_color", "icon_disabled_color"]:
			_light_theme.set_color(key, type, Color("#829589"))
		_light_theme.set_color("caret_color", type, Color("#24653b"))
		_light_theme.set_color("selection_color", type, Color("#d9efdc"))
		for style_name in _light_theme.get_stylebox_list(type):
			var original := _light_theme.get_stylebox(style_name, type) as StyleBoxFlat
			if original == null:
				continue
			var style := original.duplicate() as StyleBoxFlat
			if style.bg_color.a > 0:
				style.bg_color = Color("#f6faf6")
			if style_name in ["hover", "tab_hovered", "grabber_highlight"]:
				style.bg_color = Color("#e4f1e7")
			elif style_name in ["pressed", "hover_pressed", "tab_selected", "selected", "selected_focus"]:
				style.bg_color = Color("#d9efdc")
			elif style_name == "scroll":
				style.bg_color = Color("#edf3ee")
			elif style_name == "grabber":
				style.bg_color = Color("#a7bdac")
			elif style_name == "grabber_pressed":
				style.bg_color = Color("#50795d")
			style.border_color = Color("#418856") if style_name in ["focus", "tab_focus"] else Color("#bfd4c3")
			style.shadow_color = Color(0.13, 0.24, 0.16, 0.12)
			_light_theme.set_stylebox(style_name, type, style)
	_light_theme.set_color("font_color", "MutedLabel", Color("#617568"))
	DialogTheme.configure(_dark_theme, false)
	DialogTheme.configure(_light_theme, true)
	Corners.configure_theme(_dark_theme)
	Corners.configure_theme(_light_theme)


func _sync_window_theme(window: Window) -> void:
	var selected: Theme = _light_theme if _displayed_theme_light else _dark_theme
	if window.theme != selected:
		window.theme = selected


func _sync_visible_window_theme(window: Window) -> void:
	if window.visible:
		_sync_window_theme(window)


func _apply_preferences(changed_key: String = "", theme_override: String = "") -> void:
	_loading_settings = true
	var light: bool = (theme_override if not theme_override.is_empty() else str(GraphPreferences.value("theme"))) == "light"
	_displayed_theme_light = light
	if changed_key == "theme":
		$ThemeTransition._trace_phase("apply_begin")
	_local_theme.apply(light)
	if changed_key == "theme":
		$ThemeTransition._trace_phase("visible_controls_updated")
	if changed_key.is_empty() or changed_key == "ui_scale":
		_apply_ui_scale()
	$Background.color = Color("#ffffff") if light else Color("#181825")
	for window in overlay.get_children():
		if window is Window and window.visible:
			_sync_window_theme(window)
	for popup in _menus:
		if popup.visible:
			_sync_window_theme(popup)
	if changed_key == "theme":
		$ThemeTransition._trace_phase("visible_windows_updated")
		var current_stage: Stage = tabs.get_current_stage()
		if current_stage != null:
			current_stage.apply_theme(light)
		$ThemeTransition._trace_phase("stage_updated")
		_panel("SettingsWindow").get_node("Tabs/Appearance/Theme").select(1 if light else 0)
		_loading_settings = false
		return
	$DockAutoHide.set_available(not bool(GraphPreferences.value("classroom")), bool(GraphPreferences.value("quick")) and not bool(GraphPreferences.value("classroom")))
	$UIOverlay/Status.visible = not bool(GraphPreferences.value("classroom"))
	$UIOverlay/PrivacyCover.visible = bool(GraphPreferences.value("privacy"))
	for stage in tabs.stages():
		stage.apply_preferences()
	var mode := int(GraphPreferences.value("left_mode"))
	for index in 3:
		$UIOverlay/BottomToolbar/Tools.get_child(index).set_pressed_no_signal(index == mode)
	var general := _panel("SettingsWindow").get_node("Tabs/General/Scroll/ContentInset/Rows")
	for field in SETTING_FIELDS:
		var control := general.get_node(field + "/Value")
		var value: Variant = GraphPreferences.value(SETTING_FIELDS[field])
		if control is CheckButton:
			control.set_pressed_no_signal(bool(value))
		elif control is OptionButton:
			control.select(int(value))
		elif control is SpinBox:
			control.set_value_no_signal(float(value))
	var appearance := _panel("SettingsWindow").get_node("Tabs/Appearance")
	appearance.get_node("Theme").select(1 if light else 0)
	for pair in [["Classroom", "classroom"], ["Privacy", "privacy"], ["Quick", "quick"]]:
		appearance.get_node(pair[0]).set_pressed_no_signal(bool(GraphPreferences.value(pair[1])))
	_loading_settings = false


func _apply_ui_scale() -> void:
	var window := get_window()
	var system_scale := maxf(1.0, DisplayServer.screen_get_scale(window.current_screen))
	var user_scale := clampf(float(GraphPreferences.value("ui_scale")) / 100.0, 0.75, 2.0)
	window.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
	window.content_scale_size = Vector2i.ZERO
	window.content_scale_factor = system_scale * user_scale
	var minimum := Vector2i(Vector2(960, 600) * window.content_scale_factor)
	var available := DisplayServer.screen_get_usable_rect(window.current_screen).size
	if available.x > 0 and available.y > 0:
		minimum = minimum.min(available)
	window.min_size = minimum


func _on_header_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if event.double_click:
			$WindowChrome.toggle_maximize()
		else:
			get_window().start_drag()
		get_viewport().set_input_as_handled()


func _ime_composing() -> bool:
	return not DisplayServer.ime_get_text().is_empty()


func _event_from_code(code: int) -> InputEventKey:
	var event := InputEventKey.new()
	event.keycode = code & KEY_CODE_MASK
	event.ctrl_pressed = (code & KEY_MASK_CTRL) != 0
	event.shift_pressed = (code & KEY_MASK_SHIFT) != 0
	event.alt_pressed = (code & KEY_MASK_ALT) != 0
	return event


func _reload_shortcuts() -> void:
	_shortcut_events.clear()
	for command in DEFAULT_KEYS:
		_shortcut_events[command] = _event_from_code(DEFAULT_KEYS[command])
	var saved := GraphPreferences.key_bindings()
	for command in saved:
		var data: Dictionary = saved[command]
		var event := InputEventKey.new()
		event.keycode = int(data.get("keycode", 0))
		event.ctrl_pressed = bool(data.get("ctrl", false))
		event.shift_pressed = bool(data.get("shift", false))
		event.alt_pressed = bool(data.get("alt", false))
		event.meta_pressed = bool(data.get("meta", false))
		_shortcut_events[command] = event
	var tree := _panel("SettingsWindow").get_node("Tabs/Shortcuts/Keys") as Tree
	tree.clear()
	tree.set_column_title(0, "操作")
	tree.set_column_title(1, "快捷键")
	tree.column_titles_visible = true
	var root := tree.create_item()
	for command in _shortcut_events:
		var item := tree.create_item(root)
		item.set_text(0, _command_labels.get(command, command))
		item.set_text(1, _shortcut_events[command].as_text_keycode())
		item.set_metadata(0, command)
	for pair in [["undo", "history_undo"], ["redo", "history_redo"]]:
		if InputMap.has_action(pair[1]):
			InputMap.action_erase_events(pair[1])
			InputMap.action_add_event(pair[1], _shortcut_events[pair[0]])
	for menu in _menus:
		_refresh_menu(menu)


func _begin_key_binding() -> void:
	var selected := (_panel("SettingsWindow").get_node("Tabs/Shortcuts/Keys") as Tree).get_selected()
	if selected != null:
		_binding_command = str(selected.get_metadata(0))
		_panel("SettingsWindow").get_node("Tabs/Shortcuts/Hint").text = "请按下新快捷键；Esc 取消。"


func _input(event: InputEvent) -> void:
	if _forward_canvas_text_key(event):
		return
	if _ime_composing():
		return
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	if not _binding_command.is_empty():
		if event.keycode == KEY_ESCAPE:
			_binding_command = ""
		elif event.keycode not in [KEY_CTRL, KEY_SHIFT, KEY_ALT, KEY_META]:
			for command in _shortcut_events:
				if command != _binding_command and _shortcut_events[command].get_keycode_with_modifiers() == event.get_keycode_with_modifiers():
					_panel("SettingsWindow").get_node("Tabs/Shortcuts/Hint").text = "该快捷键已用于：" + str(_command_labels.get(command, command))
					get_viewport().set_input_as_handled()
					return
			GraphPreferences.save_binding(_binding_command, event)
			_binding_command = ""
			_reload_shortcuts()
		get_viewport().set_input_as_handled()
		return
	if event.keycode == KEY_ESCAPE and $UIOverlay/Welcome.visible:
		$UIOverlay/Welcome.hide()
		get_viewport().set_input_as_handled()
		return
	for command in _shortcut_events:
		var binding: InputEventKey = _shortcut_events[command]
		if binding.get_keycode_with_modifiers() != event.get_keycode_with_modifiers():
			continue
		if _text_input_active() and command not in ["saveFile", "saveAs", "openFile", "newDraft", "commands", "toggleFullscreen"]:
			return
		_run(command)
		get_viewport().set_input_as_handled()
		return


func _text_input_active() -> bool:
	var owners: Array[Control] = []
	var owner := get_viewport().gui_get_focus_owner()
	if owner != null:
		owners.append(owner)
	for name in WINDOWS:
		var window := overlay.get_node(name) as Window
		if window.visible:
			owner = window.gui_get_focus_owner()
			if owner != null:
				owners.append(owner)
	var stage: Stage = tabs.get_current_stage()
	if stage != null:
		owner = stage.get_viewport().gui_get_focus_owner()
		if owner != null:
			owners.append(owner)
	for control in owners:
		if control is TextEdit or control is LineEdit or control is SpinBox:
			return true
	return false


func _update_text_input_gate() -> void:
	get_tree().root.set_meta("workspace_text_input", _text_input_active())


func _process(delta: float) -> void:
	_update_text_input_gate()
	_tick += delta
	if _toast_time > 0:
		_toast_time -= delta
		if _toast_time <= 0:
			$UIOverlay/Toast.hide()
	if _tick < 0.3 or $ThemeTransition.is_transitioning():
		return
	_tick = 0
	tabs._update_tab_titles()
	var stage: Stage = tabs.get_current_stage()
	if stage == null:
		return
	var node_count := 0
	var edge_count := 0
	for object in stage.stage_objects():
		if object is Entity:
			node_count += 1
		elif object is Association:
			edge_count += 1
	$UIOverlay/Status.text = "%d 节点 · %d 连线 · %d%%" % [node_count, edge_count, int(stage.camera.zoom.x * 100)]
	var graph := JSON.stringify(StageObjectRegistry.capture(stage))
	if graph != _last_graph:
		_last_graph = graph
		if $UIOverlay/OutlineWindow.visible:
			_refresh_outline()
		if $UIOverlay/ReferencesWindow.visible:
			_refresh_references()
		if $UIOverlay/FindWindow.visible:
			_refresh_find()


func _on_stage_added(stage: Stage) -> void:
	stage.selection_changed.connect(_selection_changed)
	stage.context_requested.connect(_show_context)
	_last_graph = ""


func _on_tab_changed(_index: int) -> void:
	if not is_node_ready():
		return
	var current_stage: Stage = tabs.get_current_stage()
	if current_stage != null:
		current_stage.apply_theme(_displayed_theme_light)
	_last_graph = ""
	_details_id = ""
	_selection_changed()


func _on_stage_closed() -> void:
	_last_graph = ""
	if not _quitting and tabs.get_tab_count() == 1:
		var stage: Stage = tabs.get_current_stage()
		if stage.stage_objects().is_empty() and stage.current_file_path.is_empty():
			$UIOverlay/Welcome.show()


func _selection_changed() -> void:
	if $UIOverlay/NodeDetailsWindow.visible:
		_refresh_details()
	if $UIOverlay/ReferencesWindow.visible:
		_refresh_references()


func _file_dialog_visibility_changed() -> void:
	if %OpenFileDialog.visible or %SaveFileDialog.visible:
		$UIOverlay/Welcome.hide()


func _show_error(message: String) -> void:
	$UIOverlay/ErrorDialog.dialog_text = message
	$UIOverlay/ErrorDialog.popup_centered(Vector2i(520, 180))


func _toast(message: String) -> void:
	$UIOverlay/Toast/Message.text = message
	$UIOverlay/Toast.show()
	_toast_time = 3.0


func _on_window_input(event: InputEvent, window: Window) -> void:
	if _ime_composing():
		return
	if not event is InputEventKey or not event.pressed:
		return
	if not _binding_command.is_empty():
		_input(event)
		window.set_input_as_handled()
	elif event.keycode == KEY_ESCAPE:
		window.hide()
		window.set_input_as_handled()
	elif window.name == "CommandPalette" and event.keycode in [KEY_UP, KEY_DOWN]:
		var list := _panel("CommandPalette").get_node("Results") as ItemList
		if list.item_count > 0:
			var selected := list.get_selected_items()
			var index := selected[0] if not selected.is_empty() else 0
			list.select(posmod(index + (-1 if event.keycode == KEY_UP else 1), list.item_count))
			list.ensure_current_is_visible()
		window.set_input_as_handled()
	elif window.name == "FindWindow" and event.keycode == KEY_ENTER:
		_step_find(-1 if event.shift_pressed else 1)
		window.set_input_as_handled()


func _refresh_recent() -> void:
	var all_paths := GraphPreferences.recent_files()
	var recent := _panel("RecentFilesWindow").get_node("Files") as ItemList
	var welcome := $UIOverlay/Welcome/Margin/Content/Columns/Start/RecentList as ItemList
	recent.clear()
	welcome.clear()
	var query: String = _panel("RecentFilesWindow").get_node("Query").text
	for path in all_paths:
		if query.is_empty() or path.containsn(query):
			var index := recent.add_item(path.get_file() + "   " + path.get_base_dir())
			recent.set_item_metadata(index, path)
			recent.set_item_tooltip(index, path)
			recent.set_item_disabled(index, not FileAccess.file_exists(path))
		if welcome.item_count < 3:
			var index := welcome.add_item(path.get_file())
			welcome.set_item_metadata(index, path)
			welcome.set_item_tooltip(index, path)
			welcome.set_item_disabled(index, not FileAccess.file_exists(path))
	welcome.visible = welcome.item_count > 0
	$UIOverlay/Welcome/Margin/Content/Columns/Start/RecentTitle.visible = welcome.visible


func _open_recent(index: int) -> void:
	var list := _panel("RecentFilesWindow").get_node("Files") as ItemList
	if index < 0:
		var selected := list.get_selected_items()
		if selected.is_empty():
			return
		index = selected[0]
	tabs.load_files(PackedStringArray([str(list.get_item_metadata(index))]))
	$UIOverlay/RecentFilesWindow.hide()
	$UIOverlay/Welcome.hide()


func _open_welcome_recent(index: int) -> void:
	var list := $UIOverlay/Welcome/Margin/Content/Columns/Start/RecentList as ItemList
	var path: Variant = list.get_item_metadata(index)
	if path is String:
		tabs.load_files(PackedStringArray([path]))
		$UIOverlay/Welcome.hide()


func _remove_recent() -> void:
	var list := _panel("RecentFilesWindow").get_node("Files") as ItemList
	var paths := GraphPreferences.recent_files()
	for index in list.get_selected_items():
		var at := paths.find(str(list.get_item_metadata(index)))
		if at >= 0:
			paths.remove_at(at)
	GraphPreferences.set_recent(paths)
	_refresh_recent()


func _refresh_commands(_query: String = "") -> void:
	var list := _panel("CommandPalette").get_node("Results") as ItemList
	var rows: Array = []
	var query: String = _panel("CommandPalette").get_node("Query").text
	for command in _command_labels:
		if not _available(command):
			continue
		var label: String = _command_labels[command]
		if not query.is_empty() and not label.containsn(query) and not str(command).containsn(query):
			continue
		if _shortcut_events.has(command):
			label += "    " + _shortcut_events[command].as_text_keycode()
		rows.append([label, command])
	# Retain shaped text and layout when reopening with the same commands.
	if list.get_meta("command_rows", []) != rows:
		list.clear()
		for row in rows:
			var index := list.add_item(row[0])
			list.set_item_metadata(index, row[1])
		list.set_meta("command_rows", rows)
	if list.item_count > 0:
		list.select(0)


func _activate_command(index: int) -> void:
	var list := _panel("CommandPalette").get_node("Results") as ItemList
	if index < 0:
		var selected := list.get_selected_items()
		if selected.is_empty():
			return
		index = selected[0]
	var command := str(list.get_item_metadata(index))
	$UIOverlay/CommandPalette.hide()
	_run(command)


func _refresh_find(_query: String = "") -> void:
	var stage: Stage = tabs.get_current_stage()
	var panel := _panel("FindWindow")
	var list := panel.get_node("Results") as ItemList
	list.clear()
	if stage == null:
		return
	var query: String = panel.get_node("Query").text
	var sensitive: bool = panel.get_node("Options/Case").button_pressed
	var scope: int = panel.get_node("Options/Scope").selected
	var selected := stage.selected_objects()
	var bounds := Rect2()
	if not selected.is_empty():
		bounds = selected[0].aabb
		for object in selected:
			bounds = bounds.merge(object.aabb)
	if not query.is_empty():
		for object in stage.stage_objects():
			if not object is TextNode:
				continue
			if scope == 1 and not selected.has(object):
				continue
			if scope == 2 and (selected.is_empty() or not bounds.intersects(object.aabb)):
				continue
			var match_text: bool = object.text.contains(query) if sensitive else object.text.containsn(query)
			if match_text:
				var index := list.add_item(object.text.replace("\n", " "))
				list.set_item_metadata(index, object.id)
	panel.get_node("Count").text = "%d 个结果" % list.item_count


func _find_object(id: String) -> StageObject:
	var stage: Stage = tabs.get_current_stage()
	if stage != null:
		for object in stage.stage_objects():
			if object.id == id:
				return object
	return null


func _focus_ids(ids: PackedStringArray) -> void:
	var stage: Stage = tabs.get_current_stage()
	if stage == null:
		return
	stage.select_ids(ids)
	stage.focus_objects(stage.selected_objects())
	# 浮动窗口正在输入时相机键盘控制暂停，定位结果直接更新显示。
	stage.camera.global_position = stage.camera.target_position
	stage.camera.zoom = stage.camera.target_zoom


func _focus_find(index: int) -> void:
	var list := _panel("FindWindow").get_node("Results") as ItemList
	if index >= 0 and index < list.item_count:
		_focus_ids(PackedStringArray([str(list.get_item_metadata(index))]))


func _step_find(direction: int) -> void:
	var list := _panel("FindWindow").get_node("Results") as ItemList
	if list.item_count == 0:
		return
	var selected := list.get_selected_items()
	var index := selected[0] if not selected.is_empty() else (-1 if direction > 0 else 0)
	index = posmod(index + direction, list.item_count)
	list.select(index)
	list.ensure_current_is_visible()
	_focus_find(index)


func _select_find_results() -> void:
	var list := _panel("FindWindow").get_node("Results") as ItemList
	var ids := PackedStringArray()
	for index in list.item_count:
		ids.append(str(list.get_item_metadata(index)))
	_focus_ids(ids)


func _refresh_outline() -> void:
	var stage: Stage = tabs.get_current_stage()
	if stage == null:
		return
	var tree := _panel("OutlineWindow").get_node("Tree") as Tree
	tree.clear()
	var root := tree.create_item()
	var components := WorkspaceActions.graph_components(stage)
	_panel("OutlineWindow").get_node("Header/Count").text = "%d 个结构" % components.size()
	for component in components:
		var item := tree.create_item(root)
		item.set_text(0, "%s · %d 节点 · %d 关联" % [component.kind, component.ids.size(), component.edges])
		item.set_metadata(0, component.ids)
		for id in component.ids:
			var object := _find_object(id)
			if object == null:
				continue
			var child := tree.create_item(item)
			child.set_text(0, object.text.replace("\n", " ") if object is TextNode else "画笔")
			child.set_metadata(0, PackedStringArray([id]))


func _focus_outline() -> void:
	var selected := (_panel("OutlineWindow").get_node("Tree") as Tree).get_selected()
	if selected != null:
		_focus_ids(selected.get_metadata(0))


func _refresh_references() -> void:
	var stage: Stage = tabs.get_current_stage()
	var panel := _panel("ReferencesWindow")
	var list := panel.get_node("Results") as ItemList
	list.clear()
	if stage == null:
		return
	for object in stage.stage_objects():
		if not object is LineEdge or not is_instance_valid(object.source) or not is_instance_valid(object.target):
			continue
		if stage.selected_ids.has(object.source.id) or stage.selected_ids.has(object.target.id):
			var from: String = object.source.text if object.source is TextNode else "画笔"
			var to: String = object.target.text if object.target is TextNode else "画笔"
			var index := list.add_item(from.replace("\n", " ") + " → " + to.replace("\n", " "))
			list.set_item_metadata(index, PackedStringArray([object.source.id, object.target.id]))
	panel.get_node("Heading").text = "%d 个关联 · 双击定位两端节点" % list.item_count


func _focus_reference(index: int) -> void:
	_focus_ids((_panel("ReferencesWindow").get_node("Results") as ItemList).get_item_metadata(index))


func _refresh_details() -> void:
	for field_name in ["BorderLabel", "Border"]:
		var field := _panel("NodeDetailsWindow").get_node_or_null("Fields/" + field_name)
		if field != null:
			field.hide()
	var stage: Stage = tabs.get_current_stage()
	var panel := _panel("NodeDetailsWindow")
	var selected := stage.selected_objects() if stage != null else []
	var object: TextNode = selected[0] as TextNode if selected.size() == 1 else null
	panel.get_node("Actions/Apply").disabled = object == null
	panel.get_node("Text").editable = object != null
	if object == null:
		_details_id = ""
		panel.get_node("Selection").text = "请选择一个文本节点"
		panel.get_node("Text").text = ""
		return
	if _details_id == object.id:
		return
	_details_id = object.id
	panel.get_node("Selection").text = "文本节点"
	panel.get_node("Text").text = object.text
	panel.get_node("Fields/FontSize").value = object.font_size
	panel.get_node("Fields/Width").value = object.fixed_width
	panel.get_node("Fields/Fill").color = object.fill_color


func _apply_details() -> void:
	var object := _find_object(_details_id) as TextNode
	if object == null:
		_refresh_details()
		return
	var stage: Stage = tabs.get_current_stage()
	var panel := _panel("NodeDetailsWindow")
	stage.history.begin_transaction()
	object.text = panel.get_node("Text").text
	object.font_size = int(panel.get_node("Fields/FontSize").value)
	object.fixed_width = float(panel.get_node("Fields/Width").value)
	object.fill_color = panel.get_node("Fields/Fill").color
	stage.history.commit()
	_toast("节点属性已更新")


func _apply_color() -> void:
	var stage: Stage = tabs.get_current_stage()
	var color: Color = _panel("ColorWindow").get_node("Picker").color
	if stage.selected_objects().is_empty():
		_toast("请先选择节点")
		return
	stage.history.begin_transaction()
	for object in stage.selected_objects():
		if object is TextNode:
			object.fill_color = color
		elif object is LineEdge:
			object.stroke_color = color
		elif object is PenStroke:
			object.stroke_color = color
	stage.history.commit()


func _generate() -> void:
	var stage: Stage = tabs.get_current_stage()
	var panel := _panel("GenerateNodeWindow")
	var source: String = panel.get_node("Input").text
	if source.strip_edges().is_empty():
		return
	var count := WorkspaceActions.generate(stage, source, panel.get_node("Mode").selected)
	$UIOverlay/GenerateNodeWindow.hide()
	stage.focus_objects(stage.selected_objects())
	_toast("已生成 %d 个节点" % count)


func _on_close_requested(container: Control) -> void:
	_pending_close = container
	tabs.current_tab = container.get_index()
	$UIOverlay/UnsavedDialog.dialog_text = "「%s」有未保存的更改。" % str(container.get_meta("tab_title", "未命名"))
	$UIOverlay/UnsavedDialog.popup_centered(Vector2i(440, 160))


func _save_before_close() -> void:
	if not is_instance_valid(_pending_close):
		return
	var stage := _pending_close.get_node("SubViewport/Stage") as Stage
	if stage.current_file_path.is_empty():
		tabs.request_save_as(stage)
	else:
		stage.save_to_file(stage.current_file_path)


func _discard_close() -> void:
	if is_instance_valid(_pending_close):
		var container := _pending_close
		_pending_close = null
		tabs.close_container(container)
	if _quitting:
		_continue_quit()


func _on_saved(path: String) -> void:
	_toast("已保存 " + path.get_file())
	_refresh_recent()
	if is_instance_valid(_pending_close):
		var stage := _pending_close.get_node("SubViewport/Stage") as Stage
		if stage.current_file_path == path and not stage.is_dirty():
			_discard_close()


func _request_quit() -> void:
	_quitting = true
	_continue_quit()


func _continue_quit() -> void:
	for index in tabs.get_tab_count():
		var stage: Stage = tabs.get_stage(index)
		stage.finish_text_editing()
		stage.finish_interaction()
		if stage.is_dirty():
			_on_close_requested(tabs.get_tab_control(index))
			return
	_flush_theme_preference()
	get_tree().quit()


func _backup(stage: Stage) -> void:
	stage.finish_text_editing()
	var directory := "user://backups"
	var error := DirAccess.make_dir_recursive_absolute(directory)
	if error != OK:
		_show_error("无法创建备份目录：" + error_string(error))
		return
	var name := stage.current_file_path.get_file().get_basename()
	if name.is_empty():
		name = "未命名"
	var path := directory.path_join(name + "-" + str(Time.get_unix_time_from_system()).replace(".", "-") + ".prg")
	var camera_state := {"position": [stage.camera.target_position.x, stage.camera.target_position.y], "zoom": stage.camera.target_zoom.x}
	var result := ProjectFile.save(path, StageObjectRegistry.capture(stage), camera_state, stage.created_at)
	if not result.ok:
		_show_error(result.error)
	else:
		_toast("备份已保存")


func _import_text(path: String) -> void:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		_show_error("无法读取文本文件：" + error_string(FileAccess.get_open_error()))
		return
	_panel("GenerateNodeWindow").get_node("Input").text = file.get_as_text()
	_panel("GenerateNodeWindow").get_node("Mode").select(1 if path.to_lower().ends_with(".md") else 0)
	_show_panel("GenerateNodeWindow")


func _request_export(kind: String, selected_only: bool) -> void:
	_export_kind = kind
	_export_selected = selected_only
	_export_stage = tabs.get_current_stage()
	_export_stage.finish_text_editing()
	var extension := "md" if kind == "markdown" else ("mmd" if kind == "mermaid" else ("txt" if kind in ["network", "tree"] else kind))
	$UIOverlay/ExportDialog.filters = PackedStringArray(["*." + extension + ";导出文件"])
	$UIOverlay/ExportDialog.current_file = "Project Graph." + extension
	$UIOverlay/ExportDialog.popup_centered_ratio(0.7)


func _export_file(path: String) -> void:
	if not is_instance_valid(_export_stage):
		_show_error("要导出的项目已关闭")
		return
	var stage := _export_stage
	var kind := _export_kind
	var selected_only := _export_selected
	_export_stage = null
	if kind == "png":
		await _export_png(stage, selected_only, path)
		return
	var content := WorkspaceActions.export_svg(stage, selected_only) if kind == "svg" else WorkspaceActions.export_text(stage, kind, selected_only)
	if content.is_empty():
		_show_error("没有可导出的内容")
		return
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		_show_error("无法写入导出文件：" + error_string(FileAccess.get_open_error()))
		return
	file.store_string(content)
	var error := file.get_error()
	file.close()
	if error != OK:
		_show_error("导出失败：" + error_string(error))
	else:
		_toast("已导出 " + path.get_file())


func _export_png(stage: Stage, selected_only: bool, path: String) -> void:
	var objects := stage.selected_objects() if selected_only else stage.stage_objects()
	if objects.is_empty():
		_show_error("没有可导出的内容")
		return
	var bounds := objects[0].aabb
	for object in objects:
		bounds = bounds.merge(object.aabb)
	bounds = bounds.grow(24)
	var factor := minf(1.0, 4096.0 / maxf(bounds.size.x, bounds.size.y))
	var viewport := SubViewport.new()
	viewport.size = Vector2i((bounds.size * factor).ceil().max(Vector2.ONE))
	viewport.transparent_bg = true
	viewport.world_2d = World2D.new()
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(viewport)
	var scene := Node2D.new()
	viewport.add_child(scene)
	var camera := Camera2D.new()
	camera.position = bounds.get_center()
	camera.zoom = Vector2.ONE * factor
	scene.add_child(camera)
	for object in objects:
		var duplicate := object.duplicate(Node.DUPLICATE_SCRIPTS | Node.DUPLICATE_USE_INSTANTIATION) as StageObject
		duplicate.freeze = true
		duplicate.collision_layer = 0
		duplicate.collision_mask = 0
		scene.add_child(duplicate)
	await get_tree().process_frame
	await get_tree().process_frame
	var image := viewport.get_texture().get_image()
	var error := image.save_png(path)
	viewport.queue_free()
	if error != OK:
		_show_error("导出 PNG 失败：" + error_string(error))
	else:
		_toast("已导出 " + path.get_file())


func _show_context(world_position: Vector2) -> void:
	_context_position = world_position
	var popup := $UIOverlay/PopupMenu as PopupMenu
	for index in popup.item_count:
		popup.set_item_disabled(index, not _available(str(popup.get_item_metadata(index))))
	popup.position = Vector2i(get_viewport().get_mouse_position())
	popup.popup()


func _on_context_action(id: int) -> void:
	var popup := $UIOverlay/PopupMenu as PopupMenu
	var command := str(popup.get_item_metadata(popup.get_item_index(id)))
	if command == "newNode":
		var stage: Stage = tabs.get_current_stage()
		stage.create_text_node("...", _context_position).enter_edit_mode()
	else:
		_run(command)


func _apply_theme_button(light: bool) -> void:
	_local_theme.apply_control($VBoxContainer/Header/ThemeMode, light)


# A SubViewport editor and the root toolbar can both own GUI focus.
# Deliver text keys before root GUI navigation moves focus to window controls.
func _forward_canvas_text_key(event: InputEvent) -> bool:
	if not event is InputEventKey:
		return false
	var stage: Stage = tabs.get_current_stage()
	if stage == null:
		return false
	var viewport := stage.get_viewport()
	var focus := viewport.gui_get_focus_owner()
	if not focus is TextEdit or not focus.is_visible_in_tree():
		return false
	for window in overlay.get_children():
		if window is Window and window.visible:
			return false
	if event.pressed and not event.echo and not _ime_composing():
		for command in ["saveFile", "saveAs", "openFile", "newDraft", "commands", "toggleFullscreen"]:
			if _shortcut_events.has(command) and _shortcut_events[command].get_keycode_with_modifiers() == event.get_keycode_with_modifiers():
				return false
	viewport.push_input(event, true)
	get_viewport().set_input_as_handled()
	return true
