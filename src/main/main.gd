extends Control

const Corners = preload("res://src/main/continuous_corners.gd")
const Palette = preload("res://src/main/theme_palette.gd")

const LocalTheme = preload("res://src/main/local_theme.gd")
var _local_theme := LocalTheme.new()

const DialogTheme = preload("res://src/main/dialog_theme.gd")

const WINDOWS := ["FindWindow", "OutlineWindow", "ReferencesWindow", "NodeDetailsWindow", "RecentFilesWindow", "CommandPalette", "GenerateNodeWindow", "ColorWindow", "SettingsWindow", "HelpWindow"]
const WINDOW_SCENES := {
	"FindWindow": "res://src/main/windows/FindWindow.tscn",
	"OutlineWindow": "res://src/main/windows/OutlineWindow.tscn",
	"ReferencesWindow": "res://src/main/windows/ReferencesWindow.tscn",
	"NodeDetailsWindow": "res://src/main/windows/NodeDetailsWindow.tscn",
	"RecentFilesWindow": "res://src/main/windows/RecentFilesWindow.tscn",
	"CommandPalette": "res://src/main/windows/CommandPalette.tscn",
	"GenerateNodeWindow": "res://src/main/windows/GenerateNodeWindow.tscn",
	"ColorWindow": "res://src/main/windows/ColorWindow.tscn",
	"SettingsWindow": "res://src/main/windows/SettingsWindow.tscn",
	"HelpWindow": "res://src/main/windows/HelpWindow.tscn",
	"QuickOpenWindow": "res://src/main/windows/QuickOpenWindow.tscn",
}
const SUPPORTED := [
	"newDraft", "newWindow", "openFile", "openFolder", "quickOpen", "reloadFile", "openCurrentProjectFileFolder", "clickAppMenuRecentFileButton",
	"saveFile", "saveAs", "moveFile", "saveAll", "manualBackup", "openDefaultBackupFolder", "importTextFile",
	"exportSvgAll", "exportSvgSelected", "exportPngLegacy", "exportPngSelected",
	"exportSelectedNetStructureToPlainText", "exportSelectedTreeStructureToPlainText",
	"exportSelectedTreeStructureToMarkdown", "exportSelectedNetStructureToMermaid",
	"openOutlineWindow", "openReferencesWindow", "openColorManagerWindow", "revealInSidebar", "deleteFile", "printFile",
	"resetViewAll", "resetView", "resetCameraScale", "moveViewToOrigin", "stopDrifting", "focusRandomEntity",
	"searchText", "updateReferences", "undo", "redo", "releaseKeys", "closeAllSubWindows",
	"generateNodeTreeByText", "generateNodeTreeByMarkdown", "generateNodeGraphByText", "generateNodeMermaidByText", "clearStage",
	"clickAppMenuSettingsButton", "openAppearanceSettings", "resetAllKeyBinds", "openConfigFolder", "openCacheFolder",
	"toggleFullscreen", "checkoutClassroomMode", "checkoutProtectPrivacy", "toggleBackgroundHorizontalLines",
	"toggleBackgroundVerticalLines", "toggleBackgroundDots", "switchDebugShow", "openExtensionsWindow", "openPluginMarket", "openExtensionFolder", "openAboutWindow", "openOfficialDocs", "downloadTutorialMain", "downloadTutorialShortcutKeys", "downloadTutorialLogicNodes", "watchBilibiliVideo2", "watchBilibiliVideo1_6Basic", "watchBilibiliVideo1_6Advanced", "watchBilibiliVideo1_0", "watchBilibiliVideoPyQtUpdated", "watchBilibiliVideoPyQt", "showUpgradeGuide",
	"addChild", "addSibling", "editNode", "reverseEdge", "copy", "paste", "delete", "selectAll", "groupSelection", "newNode", "properties", "welcome", "commands", "closeTab",
	"modeSelect", "modeDraw", "modeConnect", "grid", "theme", "website", "guide", "helpWhatsNew", "helpQuickStart", "helpMarkdown", "helpImportExport", "helpThemes", "helpCanvas", "helpRecovery", "helpCredits", "helpChangelog", "helpPrivacy", "helpFeedback", "helpAbout",
]
const DEFAULT_KEYS := {
	"addChild": KEY_TAB, "addSibling": KEY_ENTER, "editNode": KEY_F2,
	"openColorManagerWindow": KEY_MASK_CTRL | KEY_MASK_SHIFT | KEY_C,
	"newDraft": KEY_MASK_CTRL | KEY_N, "openFile": KEY_MASK_CTRL | KEY_O,
	"saveFile": KEY_MASK_CTRL | KEY_S, "saveAs": KEY_MASK_CTRL | KEY_MASK_SHIFT | KEY_S,
	"closeTab": KEY_MASK_CTRL | KEY_W, "searchText": KEY_MASK_CTRL | KEY_F,
	"commands": KEY_MASK_CTRL | KEY_MASK_SHIFT | KEY_P, "undo": KEY_MASK_CTRL | KEY_Z,
	"redo": KEY_MASK_CTRL | KEY_MASK_SHIFT | KEY_Z, "copy": KEY_MASK_CTRL | KEY_C,
	"paste": KEY_MASK_CTRL | KEY_V, "selectAll": KEY_MASK_CTRL | KEY_A,
	"groupSelection": KEY_MASK_CTRL | KEY_G, "delete": KEY_DELETE, "resetView": KEY_F, "toggleFullscreen": KEY_F11,
	"clickAppMenuSettingsButton": KEY_MASK_CTRL | KEY_COMMA,
}
const SETTING_FIELDS := {
	"GridH": "grid_h", "GridV": "grid_v", "GridDots": "grid_dots", "Snap": "snap",
	"Physics": "physics", "Effects": "effects", "Welcome": "welcome", "LeftMode": "left_mode",
	"RightMode": "right_mode", "UIScale": "ui_scale", "CameraSpeed": "camera_speed",
}
const MENU_ICON_BASE := "res://src/main/icons/lucide/"
const MENU_ICON_SIZE := 18
const MENU_ICON_FILES := {
	# Menu icons follow master branch's Lucide icon style.
	"File": "file", "View": "view", "Axe": "axe", "Settings": "settings", "AppWindow": "app-window", "Blocks": "blocks", "CircleHelp": "circle-help",
	"Search": "search", "RefreshCcwDot": "refresh-ccw-dot", "Undo": "undo", "Redo": "redo", "Keyboard": "keyboard", "X": "x", "Sparkles": "sparkles",
	"Network": "network", "GitCompareArrows": "git-compare-arrows", "Workflow": "workflow", "BookOpen": "book-open", "Radiation": "radiation", "Rabbit": "rabbit", "Type": "type",
	"Palette": "palette", "FolderCog": "folder-cog", "FolderOpen": "folder-open", "Fullscreen": "fullscreen", "Airplay": "airplay", "VenetianMask": "venetian-mask",
	"LayoutGrid": "layout-grid", "Rows4": "rows-4", "Columns4": "columns-4", "Grip": "grip", "Move3d": "move-3d", "PictureInPicture2": "picture-in-picture-2",
	"Bug": "bug", "CircleDot": "circle-dot", "CirclePlus": "circle-plus", "CircleMinus": "circle-minus", "Store": "store", "SquareDashedMousePointer": "square-dashed-mouse-pointer", "groupSelection": "blocks",
	"Scaling": "scaling", "MapPin": "map-pin", "OctagonX": "octagon-x", "Dices": "dices",

	"newDraft": "plus", "newWindow": "app-window", "openFile": "file", "openFolder": "folder-open", "quickOpen": "search", "recentFilesSub": "clock",
	"reloadFile": "refresh-cw", "saveFile": "save", "saveAs": "download", "moveFile": "external-link", "saveAll": "save-all", "openCurrentProjectFileFolder": "folder-open",
	"revealInSidebar": "panel-left", "deleteFile": "trash-2", "importTextFile": "upload", "exportSub": "download", "exportSvgAll": "file-down",
	"exportSvgSelected": "file-down", "exportPngLegacy": "file-image", "exportPngSelected": "file-image", "exportSelectedNetStructureToPlainText": "file-text",
	"exportSelectedTreeStructureToPlainText": "file-text", "exportSelectedTreeStructureToMarkdown": "file-text", "exportSelectedNetStructureToMermaid": "network",
	"printFile": "printer", "clickAppMenuSettingsButton": "settings", "closeTab": "x",
	"helpWhatsNew": "sparkles", "helpQuickStart": "book-open", "helpMarkdown": "file-text", "helpImportExport": "download", "helpThemes": "palette",
	"helpCanvas": "mouse-pointer-2", "helpRecovery": "refresh-cw", "openOfficialDocs": "book-open", "helpCredits": "heart", "helpChangelog": "file-text",
	"helpPrivacy": "venetian-mask", "website": "globe", "helpFeedback": "mail", "helpAbout": "info",
}
@onready var tabs = %TabContainer
@onready var overlay: Control = $UIOverlay
var _command_labels := {}
var _shortcut_events := {}
var _menus: Array[PopupMenu] = []
var _menu_icon_cache := {}
var _tick := 0.0
var _last_graph := ""
var _last_graph_revision := -1
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
var _panels_ready := false
var _settings_ready := false
var _window_ready := {}
var _startup_panels_done := false
var _startup_theme_done := false
var _startup_documents_done := false
var _system_theme_light := false
var _system_theme_poll := 0.0


func _enter_tree() -> void:
	_startup_mark("main.enter_tree.before_children_ready")
	# 子控件第一次排版就使用最终字体，避免先生成旧字体缓存再全部失效。
	theme.default_font = preload("res://assets/fonts/PingFang-SC-Regular.ttf")


func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	var ready_started := Time.get_ticks_usec()
	var phase_started := ready_started
	_startup_mark("main.ready.begin")
	_system_theme_light = _theme_is_light(str(GraphPreferences.value("theme")))
	get_tree().auto_accept_quit = false
	get_window().borderless = true
	get_window().dpi_changed.connect(_apply_ui_scale)
	$VBoxContainer/Header/Spacer.mouse_filter = Control.MOUSE_FILTER_STOP
	$VBoxContainer/Header/Spacer.gui_input.connect(_on_header_gui_input)
	get_viewport().gui_embed_subwindows = true
	get_window().close_requested.connect(_request_quit)
	var screen_fps := DisplayServer.screen_get_refresh_rate(DisplayServer.SCREEN_OF_MAIN_WINDOW)
	Engine.physics_ticks_per_second = maxi(60, int(screen_fps))
	_startup_mark("main.ready.window_setup", phase_started)
	phase_started = Time.get_ticks_usec()
	_prepare_themes()
	_startup_mark("main.ready.themes", phase_started)
	phase_started = Time.get_ticks_usec()
	_build_command_labels(GraphMenuCatalog.MENUS)
	_command_labels.merge({"copy": "复制", "paste": "粘贴", "delete": "删除", "selectAll": "全选", "groupSelection": "创建分组", "newNode": "新建文本节点", "properties": "节点 / 连线属性", "addChild": "添加子主题", "addSibling": "添加同级主题", "editNode": "编辑节点文字", "reverseEdge": "反转连线", "openColorManagerWindow": "更改颜色", "welcome": "欢迎页", "commands": "命令面板", "closeTab": "关闭标签页"}, true)
	_restore_menu_commands($VBoxContainer/Header/MenuBar, GraphMenuCatalog.MENUS)
	_setup_menus($VBoxContainer/Header/MenuBar)
	_startup_mark("main.ready.menus", phase_started)
	phase_started = Time.get_ticks_usec()
	$UIOverlay/PopupMenu.id_pressed.connect(_on_context_action)
	_setup_buttons()
	_ensure_panels_ready()
	$FileActions.setup()
	_startup_mark("main.ready.buttons", phase_started)
	phase_started = Time.get_ticks_usec()
	call_deferred("_finish_deferred_startup")
	call_deferred("_configure_local_theme")
	_reload_shortcuts()
	_startup_mark("main.ready.shortcuts", phase_started)
	phase_started = Time.get_ticks_usec()
	tabs.stage_added.connect(_on_stage_added)
	tabs.stage_closed.connect(_on_stage_closed)
	tabs.close_requested.connect(_on_close_requested)
	tabs.workspace_error.connect(_show_error)
	tabs.workspace_saved.connect(_on_saved)
	for stage in tabs.stages():
		_on_stage_added(stage)
	_startup_mark("main.ready.existing_stage_bindings", phase_started)
	phase_started = Time.get_ticks_usec()
	%OpenFileDialog.visibility_changed.connect(_file_dialog_visibility_changed)
	%SaveFileDialog.visibility_changed.connect(_file_dialog_visibility_changed)
	%SaveFileDialog.canceled.connect(func(): _quitting = false; _pending_close = null)
	_apply_preferences()
	_startup_mark("main.ready.dialogs_and_preferences", phase_started)
	phase_started = Time.get_ticks_usec()
	$UIOverlay/Welcome.visible = bool(GraphPreferences.value("welcome"))
	_refresh_recent()
	_on_tab_changed(tabs.current_tab)
	_startup_mark("main.ready.recent_and_current_tab", phase_started)
	_startup_mark("main.ready.complete", ready_started)
	_startup_open_launch_documents.call_deferred()
	_startup_wait_for_interactive_frame.call_deferred()


func _finish_deferred_startup() -> void:
	# 浮动窗口不在启动阶段实例化；第一次打开时才加载对应场景。
	var started := Time.get_ticks_usec()
	_apply_preferences()
	_startup_mark("main.deferred.preferences", started)
	_startup_panels_done = true


func _ensure_settings_ready() -> void:
	if _settings_ready:
		return
	_setup_settings()
	_settings_ready = true
	_reload_shortcuts()


func _ensure_panels_ready() -> void:
	if _panels_ready:
		return
	_setup_panels()
	_panels_ready = true


func _configure_local_theme() -> void:
	await get_tree().process_frame
	var started := Time.get_ticks_usec()
	_local_theme.configure(self, _dark_theme, _light_theme)
	_local_theme.apply(_displayed_theme_light)
	_startup_mark("main.deferred.local_theme", started)
	_startup_theme_done = true


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
	# PopupMenu 的条目 metadata 不随场景保存；每次启动按菜单目录恢复命令。
	for definition in definitions:
		if definition.type != "topMenu":
			continue
		var popup := parent.get_node_or_null(str(definition.id)) as PopupMenu
		if popup != null:
			popup.set_meta("menu_definitions", definition.get("children", []))
			_bind_menu_commands(popup, definition.get("children", []))


func _bind_menu_commands(popup: PopupMenu, definitions: Array) -> void:
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
					submenu.set_meta("menu_definitions", definition.get("children", []))
					popup.set_item_submenu(index, str(submenu.name))
					_bind_menu_commands(submenu, definition.get("children", []))
			break


func _setup_menus(node: Node) -> void:
	for child in node.get_children():
		if child is PopupMenu:
			var initial_light := _theme_is_light(str(GraphPreferences.value("theme")))
			child.theme = _light_theme if initial_light else _dark_theme
			child.about_to_popup.connect(_sync_window_theme.bind(child))
			_menus.append(child)
			child.id_pressed.connect(_on_menu_pressed.bind(child))
			child.about_to_popup.connect(_refresh_menu.bind(child))
			_refresh_menu(child)
		_setup_menus(child)


func _refresh_menu(popup: PopupMenu) -> void:
	if popup.has_meta("menu_definitions"):
		_rebuild_menu_items(popup, popup.get_meta("menu_definitions"))
		return
	if popup.get_meta("recent_files", false):
		_rebuild_recent_menu(popup)


func _rebuild_menu_items(popup: PopupMenu, definitions: Array) -> void:
	popup.clear()
	var pending_separator := false
	for definition in definitions:
		var type := str(definition.get("type", ""))
		if type == "separator":
			pending_separator = popup.item_count > 0
			continue
		if type == "recentFiles":
			if _recent_file_count() == 0:
				continue
			if pending_separator:
				popup.add_separator()
				pending_separator = false
			_rebuild_recent_menu(popup)
			continue
		if type == "item":
			var command := str(definition.get("id", ""))
			if not SUPPORTED.has(command):
				continue
			if pending_separator:
				popup.add_separator()
				pending_separator = false
			var index := popup.item_count
			popup.add_icon_item(_menu_icon(definition, command), _menu_label(definition, command))
			popup.set_item_metadata(index, command)
			popup.set_item_disabled(index, not _available(command))
			# 顶栏菜单保持紧凑；快捷键仍可在命令面板和设置中查看。
			continue
		if type == "sub":
			var children: Array = definition.get("children", [])
			var submenu := popup.get_node_or_null(str(definition.get("id", ""))) as PopupMenu
			if submenu == null:
				submenu = PopupMenu.new()
				submenu.name = str(definition.get("id", "submenu"))
				popup.add_child(submenu)
				_setup_menus(submenu)
			submenu.set_meta("menu_definitions", children)
			_rebuild_menu_items(submenu, children)
			if submenu.item_count == 0:
				continue
			if pending_separator:
				popup.add_separator()
				pending_separator = false
			var submenu_id := str(definition.get("id", submenu.name))
			var index := popup.item_count
			popup.add_submenu_item(_menu_label(definition, submenu_id), submenu.name)
			popup.set_item_icon(index, _menu_icon(definition, submenu_id))


func _menu_label(definition: Dictionary, fallback_id: String) -> String:
	return str(definition.get("label", fallback_id))


func _menu_icon(definition: Dictionary, fallback_id: String) -> Texture2D:
	var icon_key := str(definition.get("icon", fallback_id))
	var icon_file := str(MENU_ICON_FILES.get(icon_key, MENU_ICON_FILES.get(fallback_id, "circle-help")))
	var path := MENU_ICON_BASE + icon_file + ".svg"
	var color := "#" + Palette.color(_displayed_theme_light, "icon.default").to_html(false)
	var cache_key := path + "|" + color + "|" + str(MENU_ICON_SIZE)
	if not _menu_icon_cache.has(cache_key):
		_menu_icon_cache[cache_key] = _load_menu_icon(path, color)
	return _menu_icon_cache[cache_key] as Texture2D


func _load_menu_icon(path: String, color: String) -> Texture2D:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return null
	var svg := file.get_as_text()
	file.close()
	svg = svg.replace("currentColor", color)
	svg = svg.replace("width=\"20\"", "width=\"%d\"" % MENU_ICON_SIZE)
	svg = svg.replace("height=\"20\"", "height=\"%d\"" % MENU_ICON_SIZE)
	# Godot re-rasterizes this SVG for the current viewport scale.
	return DPITexture.create_from_string(svg)



func _rebuild_recent_menu(popup: PopupMenu) -> void:
	popup.clear()
	var paths := GraphPreferences.recent_files()
	for path in paths:
		if popup.item_count >= 12:
			break
		if not FileAccess.file_exists(path):
			continue
		var index := popup.item_count
		var recent_definition := {"icon": "File", "label": path.get_file()}
		popup.add_icon_item(_menu_icon(recent_definition, "recent:" + path), _menu_label(recent_definition, "recent:" + path))
		popup.set_item_metadata(index, "recent:" + path)
		popup.set_item_tooltip(index, path)


func _recent_file_count() -> int:
	var count := 0
	for path in GraphPreferences.recent_files():
		if FileAccess.file_exists(path):
			count += 1
	return count


func _on_menu_pressed(id: int, popup: PopupMenu) -> void:
	var command: Variant = popup.get_item_metadata(popup.get_item_index(id))
	if command is String:
		_run(command)


func _available(command: String) -> bool:
	if command.begins_with("recent:"):
		return true
	if not SUPPORTED.has(command):
		return false
	if command in $FileActions.COMMANDS:
		return $FileActions.available(command)
	if command in $HelpActions.COMMANDS:
		return true
	var stage: Stage = tabs.get_current_stage()
	if stage == null and command in ["saveFile", "saveAs", "closeTab", "newNode", "paste", "selectAll", "clearStage", "manualBackup", "searchText", "openOutlineWindow", "openReferencesWindow", "openColorManagerWindow", "resetViewAll", "resetView", "resetCameraScale", "moveViewToOrigin", "stopDrifting", "releaseKeys", "focusRandomEntity", "updateReferences", "openCurrentProjectFileFolder", "generateNodeTreeByText", "generateNodeTreeByMarkdown", "generateNodeGraphByText", "generateNodeMermaidByText", "importTextFile", "modeSelect", "modeDraw", "modeConnect"]:
		return false
	if command in ["undo", "redo"]:
		return stage != null and (stage.history.can_undo() if command == "undo" else stage.history.can_redo())
	if command in ["delete", "copy", "properties", "exportSvgSelected", "exportPngSelected", "exportSelectedNetStructureToPlainText", "exportSelectedTreeStructureToPlainText", "exportSelectedTreeStructureToMarkdown", "exportSelectedNetStructureToMermaid"]:
		return stage != null and not stage.selected_objects().is_empty()
	if command in ["addChild", "addSibling", "editNode"]:
		return stage != null and stage.selected_objects().size() == 1 and stage.selected_objects()[0] is TextNode
	if command == "reverseEdge":
		return stage != null and stage.selected_objects().size() == 1 and stage.selected_objects()[0] is LineEdge
	if command == "groupSelection":
		return stage != null and stage.drag_entities().size() >= 2
	if command in ["exportSvgAll", "exportPngLegacy", "printFile"]:
		return stage != null and not stage.stage_objects().is_empty()
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
	# 这里只连接启动必需的确认框和文件对话框；浮动窗口由 _ensure_window_ready 按需加载。
	for dialog in overlay.get_children():
		if dialog is Window:
			dialog.visibility_changed.connect(_sync_visible_window_theme.bind(dialog))
		if dialog is AcceptDialog:
			dialog.transparent_bg = true
			dialog.get_ok_button().theme_type_variation = "DialogPrimaryButton"
			if dialog is ConfirmationDialog:
				dialog.get_cancel_button().theme_type_variation = "DialogButton"
	$UIOverlay/UnsavedDialog.add_button("不保存", false, "discard").theme_type_variation = "DialogButton"
	$UIOverlay/UnsavedDialog.confirmed.connect(_save_before_close)
	$UIOverlay/UnsavedDialog.custom_action.connect(func(_action): _discard_close())
	$UIOverlay/UnsavedDialog.canceled.connect(func(): _pending_close = null; _quitting = false)
	$UIOverlay/ConfirmClear.confirmed.connect(func(): var stage: Stage = tabs.get_current_stage(); stage.delete_objects(stage.stage_objects()))
	$UIOverlay/ExportDialog.file_selected.connect(_export_file)
	$UIOverlay/ImportDialog.file_selected.connect(_import_text)

func _ensure_window_ready(name: String) -> Window:
	if _window_ready.has(name):
		return _window_ready[name] as Window
	var path: String = WINDOW_SCENES.get(name, "")
	if path.is_empty():
		return null
	var packed := load(path) as PackedScene
	if packed == null:
		return null
	var window := packed.instantiate() as Window
	if window == null:
		return null
	window.name = name
	overlay.add_child(window)
	_window_ready[name] = window
	window.theme = _light_theme if _displayed_theme_light else _dark_theme
	window.close_requested.connect(window.hide)
	window.window_input.connect(_on_window_input.bind(window))
	window.visibility_changed.connect(_update_text_input_gate)
	$DialogMotion.register_window(window)
	_setup_window_connections(name)
	return window

func _setup_window_connections(name: String) -> void:
	match name:
		"HelpWindow":
			$HelpActions.setup()
		"FindWindow":
			_panel(name).get_node("Query").text_changed.connect(_refresh_find)
			_panel(name).get_node("Query").text_submitted.connect(func(_text): _step_find(1))
			_panel(name).get_node("Options/Case").toggled.connect(func(_value): _refresh_find())
			var scope := _panel(name).get_node("Options/Scope") as OptionButton
			for label in ["整个舞台", "选中内容", "选中内容范围"]:
				scope.add_item(label)
			scope.item_selected.connect(func(_index): _refresh_find())
			_panel(name).get_node("Results").item_activated.connect(_focus_find)
			_panel(name).get_node("Results").item_selected.connect(_focus_find)
			_panel(name).get_node("Actions/Previous").pressed.connect(_step_find.bind(-1))
			_panel(name).get_node("Actions/Next").pressed.connect(_step_find.bind(1))
			_panel(name).get_node("Actions/Select").pressed.connect(_select_find_results)
		"OutlineWindow":
			_panel(name).get_node("Header/Refresh").pressed.connect(_refresh_outline)
			_panel(name).get_node("Tree").item_selected.connect(_focus_outline)
		"ReferencesWindow":
			_panel(name).get_node("Results").item_activated.connect(_focus_reference)
		"NodeDetailsWindow":
			_panel(name).get_node("Actions/Reverse").pressed.connect(_reverse_edge)
			_panel(name).get_node("Actions/Apply").pressed.connect(_apply_details)
			_panel(name).get_node("Actions/Delete").pressed.connect(_run.bind("delete"))
		"RecentFilesWindow":
			_panel(name).get_node("Query").text_changed.connect(func(_text): _refresh_recent())
			_panel(name).get_node("Files").item_activated.connect(_open_recent)
			_panel(name).get_node("Actions/Open").pressed.connect(func(): _open_recent(-1))
			_panel(name).get_node("Actions/Remove").pressed.connect(_remove_recent)
			_panel(name).get_node("Actions/Clear").pressed.connect(func(): GraphPreferences.set_recent(PackedStringArray()); _refresh_recent())
		"CommandPalette":
			_panel(name).get_node("Query").text_changed.connect(_refresh_commands)
			_panel(name).get_node("Query").text_submitted.connect(func(_text): _activate_command(-1))
			_panel(name).get_node("Results").item_activated.connect(_activate_command)
		"GenerateNodeWindow":
			var modes := _panel(name).get_node("Mode") as OptionButton
			for label in ["缩进文本 → 树形节点", "Markdown → 树形节点", "每行 → 独立节点"]:
				modes.add_item(label)
			_panel(name).get_node("Generate").pressed.connect(_generate)
		"ColorWindow":
			var panel := _panel(name)
			for swatch in panel.get_node("Palette").get_children():
				swatch.pressed.connect(func():
					panel.get_node("ColorRow/Hex").text = "#" + (swatch.get_meta("palette_color") as Color).to_html(true)
					_update_color_input()
				)
			panel.get_node("ColorRow/Hex").text_changed.connect(func(_text): _update_color_input())
			panel.get_node("ColorRow/Hex").text_submitted.connect(func(_text): _apply_color())
			panel.get_node("Apply").pressed.connect(_apply_color)
			panel.get_node("Reset").pressed.connect(_apply_color.bind(true))


func _apply_dialog_theme(window: Window) -> void:
	if window.has_meta("_dialog_theme_applied"):
		return
	DialogTheme.apply_controls(window)
	window.set_meta("_dialog_theme_applied", true)


func _show_panel(name: String) -> void:
	$UIOverlay/Welcome.hide()
	var stage: Stage = tabs.get_current_stage()
	if stage != null:
		stage.finish_text_editing()
	_ensure_panels_ready()
	var window := _ensure_window_ready(name)
	if window == null:
		return
	_apply_dialog_theme(window)
	var viewport_size := get_viewport_rect().size
	window.size = Vector2i(Vector2(window.size).min(viewport_size * 0.9))
	_sync_window_theme(window)
	# Prepare command rows before showing the window to avoid an empty first frame.
	if name == "CommandPalette":
		_refresh_commands()
	window.popup_centered()
	match name:
		"FindWindow":
			_refresh_find()
			_panel(name).get_node("Query").grab_focus()
		"CommandPalette":
			_panel(name).get_node("Query").grab_focus()
		"ColorWindow":
			_refresh_color_swatches()
			_update_color_input()
		"OutlineWindow": _refresh_outline()
		"ReferencesWindow": _refresh_references()
		"NodeDetailsWindow":
			_details_id = ""
			_refresh_details()
		"RecentFilesWindow": _refresh_recent()


func _run(command: String) -> void:
	var active_stage: Stage = tabs.get_current_stage()
	if active_stage != null and active_stage.history._busy and command not in ["closeTab", "newDraft", "openFile", "welcome", "theme"]:
		return
	if not _available(command):
		return
	var stage: Stage = tabs.get_current_stage()
	if command.begins_with("recent:"):
		tabs.load_files(PackedStringArray([command.trim_prefix("recent:")]))
		$UIOverlay/Welcome.hide()
		return
	if command in $FileActions.COMMANDS:
		$FileActions.run(command)
		return
	if command in $HelpActions.COMMANDS:
		$HelpActions.run(command)
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
		"addChild", "addSibling":
			if WorkspaceActions.add_branch(stage, command == "addSibling") == null:
				_toast("请先选择一个文本节点")
		"editNode": (stage.selected_objects()[0] as TextNode).enter_edit_mode()
		"reverseEdge": _reverse_edge()
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
		"groupSelection":
			if WorkspaceActions.group_selection(stage) != null:
				_toast("已创建分组")
		"delete": stage.delete_objects(stage.selected_objects())
		"selectAll": stage.select_all()
		"resetViewAll": stage.focus_objects(stage.stage_objects())
		"resetView": stage.focus_objects(stage.selected_objects() if not stage.selected_objects().is_empty() else stage.stage_objects())
		"resetCameraScale": stage.camera.reset_zoom()
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
			for name in _window_ready:
				_window_ready[name].hide()
		"generateNodeTreeByText", "generateNodeTreeByMarkdown", "generateNodeGraphByText", "generateNodeMermaidByText":
			_panel("GenerateNodeWindow").get_node("Mode").select(1 if command == "generateNodeTreeByMarkdown" else (2 if command in ["generateNodeGraphByText", "generateNodeMermaidByText"] else 0))
			_show_panel("GenerateNodeWindow")
			if command == "generateNodeMermaidByText":
				_toast("Mermaid 专用解析尚未完成，当前先按文本节点生成")
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
		"theme": _set_preference("theme", "mocha" if _theme_is_light(str(GraphPreferences.value("theme"))) else "light")
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
		"openExtensionFolder":
			DirAccess.make_dir_recursive_absolute("user://extensions")
			OS.shell_open(ProjectSettings.globalize_path("user://extensions"))
		"openExtensionsWindow": _toast("扩展运行时尚未移植，已保留入口")
		"openPluginMarket": _toast("扩展市场尚未移植，已保留入口")
		"downloadTutorialMain", "downloadTutorialShortcutKeys", "downloadTutorialLogicNodes": OS.shell_open("https://project-graph.top")
		"watchBilibiliVideo2", "watchBilibiliVideo1_6Basic", "watchBilibiliVideo1_6Advanced", "watchBilibiliVideo1_0", "watchBilibiliVideoPyQtUpdated", "watchBilibiliVideoPyQt": OS.shell_open("https://space.bilibili.com/")
		"showUpgradeGuide": $HelpActions.run("helpWhatsNew")
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
			if row is Label:
				row.visible = query.is_empty()
			else:
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
	var navigation := _panel("SettingsWindow").get_node("Navigation")
	for index in setting_tabs.get_tab_count():
		var page_name := setting_tabs.get_tab_control(index).name
		navigation.get_node(NodePath(page_name)).pressed.connect(func(): setting_tabs.current_tab = index)
	setting_tabs.tab_changed.connect(func(index):
		for page in navigation.get_children():
			page.set_pressed_no_signal(page.name == setting_tabs.get_tab_control(index).name)
	)
	navigation.get_node("General").set_pressed_no_signal(true)
	var appearance := setting_tabs.get_node("Appearance")
	appearance.get_node("Theme").add_item("跟随系统")
	appearance.get_node("Theme").add_item("Catppuccin Mocha")
	appearance.get_node("Theme").add_item("Catppuccin Latte")
	appearance.get_node("Theme").item_selected.connect(func(index): _set_preference("theme", ["system", "mocha", "light"][index]))
	for pair in [["Classroom", "classroom"], ["Privacy", "privacy"], ["Quick", "quick"]]:
		appearance.get_node(pair[0]).toggled.connect(func(value): _set_preference(pair[1], value))
	setting_tabs.get_node("Shortcuts/Reset").pressed.connect(_run.bind("resetAllKeyBinds"))
	setting_tabs.get_node("Shortcuts/Keys").item_activated.connect(_begin_key_binding)
	setting_tabs.get_node("About/Scroll/Inset/Body/Links/Website").pressed.connect(_run.bind("website"))
	setting_tabs.get_node("About/Scroll/Inset/Body/Links/Source").pressed.connect(func(): OS.shell_open("https://github.com/graphif/project-graph"))


func _show_settings(tab: int) -> void:
	_show_panel("SettingsWindow")
	_ensure_settings_ready()
	_apply_preferences()
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
		$ThemeTransition.reveal(_apply_preferences.bind(key, value), _apply_theme_button, _theme_is_light(str(value)))
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
	# 深色主题是默认启动路径；明亮主题延迟到首帧后构建，避免启动阶段复制大量 StyleBox。
	_dark_theme = theme.duplicate(false)
	_dark_theme.default_font_size = 14
	Palette.configure_theme(_dark_theme, false)
	_light_theme = null
	DialogTheme.configure(_dark_theme, false)
	_configure_popup_menu_theme(_dark_theme, false)
	Corners.configure_theme(_dark_theme)
	if _theme_is_light(str(GraphPreferences.value("theme"))):
		_ensure_light_theme()
	else:
		call_deferred("_ensure_light_theme")


func _theme_is_light(value: String) -> bool:
	return Palette.is_light(value)


func _theme_option_index(value: String) -> int:
	return 0 if value == "system" else (2 if Palette.is_light(value) else 1)


func _ensure_light_theme() -> void:
	if _light_theme != null:
		return
	_light_theme = _dark_theme.duplicate(false)
	Palette.configure_theme(_light_theme, true)
	DialogTheme.configure(_light_theme, true)
	_configure_popup_menu_theme(_light_theme, true)
	Corners.configure_theme(_light_theme)


func _configure_popup_menu_theme(target: Theme, light: bool) -> void:
	var surface := Palette.color(light, "surface.raised")
	var hover := Palette.color(light, "surface.hover")
	var pressed := Palette.color(light, "surface.selected")
	var border := Palette.color(light, "border.default")
	var text := Palette.color(light, "text.primary")
	var muted := Palette.color(light, "text.secondary")
	var disabled := Palette.color(light, "text.disabled")

	var panel := StyleBoxFlat.new()
	panel.bg_color = surface
	panel.border_color = border
	panel.set_border_width_all(1)
	panel.set_corner_radius_all(12)
	panel.content_margin_left = 8
	panel.content_margin_right = 8
	panel.content_margin_top = 8
	panel.content_margin_bottom = 8
	panel.shadow_color = Color(0, 0, 0, 0.32 if light else 0.42)
	panel.shadow_size = 18
	panel.shadow_offset = Vector2(0, 8)
	target.set_stylebox("panel", "PopupMenu", panel)

	var item := StyleBoxFlat.new()
	item.bg_color = Color.TRANSPARENT
	item.set_corner_radius_all(8)
	item.content_margin_left = 8
	item.content_margin_right = 8
	item.content_margin_top = 4
	item.content_margin_bottom = 4
	target.set_stylebox("labeled_separator_left", "PopupMenu", item.duplicate())
	target.set_stylebox("labeled_separator_right", "PopupMenu", item.duplicate())
	target.set_stylebox("separator", "PopupMenu", item.duplicate())

	var hover_style := item.duplicate() as StyleBoxFlat
	hover_style.bg_color = hover
	target.set_stylebox("hover", "PopupMenu", hover_style)
	var pressed_style := item.duplicate() as StyleBoxFlat
	pressed_style.bg_color = pressed
	target.set_stylebox("pressed", "PopupMenu", pressed_style)

	for key in ["font_color", "font_hover_color", "font_pressed_color", "font_accelerator_color", "font_hover_pressed_color"]:
		target.set_color(key, "PopupMenu", text)
	target.set_color("font_disabled_color", "PopupMenu", disabled)
	target.set_color("font_separator_color", "PopupMenu", muted)
	target.set_color("font_separator_outline_color", "PopupMenu", Color.TRANSPARENT)
	target.set_color("font_outline_color", "PopupMenu", Color.TRANSPARENT)
	target.set_constant("h_separation", "PopupMenu", 8)
	target.set_constant("icon_max_width", "PopupMenu", 18)
	target.set_constant("v_separation", "PopupMenu", 2)
	target.set_constant("item_start_padding", "PopupMenu", 6)
	target.set_constant("item_end_padding", "PopupMenu", 6)
	target.set_font_size("font_size", "PopupMenu", 15)


func _sync_window_theme(window: Window) -> void:
	var selected: Theme = _light_theme if _displayed_theme_light else _dark_theme
	if window.theme != selected:
		window.theme = selected
		if window is PopupMenu and window.has_meta("menu_definitions"):
			_refresh_menu(window)


func _sync_visible_window_theme(window: Window) -> void:
	if window.visible:
		_sync_window_theme(window)


func _apply_preferences(changed_key: String = "", theme_override: String = "") -> void:
	_loading_settings = true
	var selected_theme := theme_override if not theme_override.is_empty() else str(GraphPreferences.value("theme"))
	var light: bool = _theme_is_light(selected_theme)
	_displayed_theme_light = light
	if light:
		_ensure_light_theme()
	if changed_key == "theme":
		$ThemeTransition._trace_phase("apply_begin")
	_local_theme.apply(light)
	if changed_key == "theme":
		$ThemeTransition._trace_phase("visible_controls_updated")
	if changed_key.is_empty() or changed_key == "ui_scale":
		_apply_ui_scale()
	$Background.color = Palette.color(light, "surface.app")
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
		if _settings_ready:
			_panel("SettingsWindow").get_node("Tabs/Appearance/Theme").select(_theme_option_index(selected_theme))
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
	if not _settings_ready:
		_loading_settings = false
		return
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
	appearance.get_node("Theme").select(_theme_option_index(selected_theme))
	for pair in [["Classroom", "classroom"], ["Privacy", "privacy"], ["Quick", "quick"]]:
		appearance.get_node(pair[0]).set_pressed_no_signal(bool(GraphPreferences.value(pair[1])))
	_loading_settings = false


func _apply_ui_scale() -> void:
	var window := get_window()
	var user_scale := clampf(float(GraphPreferences.value("ui_scale")) / 100.0, 0.75, 2.0)
	window.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
	window.content_scale_size = Vector2i.ZERO
	# Godot 已经按 GNOME/Wayland 的窗口 DPI 处理显示尺寸；这里仅叠加应用自己的 UI 缩放。
	# 再乘 DisplayServer.screen_get_scale() 会造成高 DPI 下的重复放大。
	window.content_scale_factor = user_scale
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
	event.ctrl_pressed = (code & KEY_MASK_CTRL) != 0 and OS.get_name() != "macOS"
	event.meta_pressed = (code & KEY_MASK_META) != 0 or ((code & KEY_MASK_CTRL) != 0 and OS.get_name() == "macOS")
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
	if not _settings_ready:
		return
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
	if event.keycode == KEY_ESCAPE and not _text_input_active():
		for window in overlay.get_children():
			if window is Window and window.visible:
				return
		var stage: Stage = tabs.get_current_stage()
		if stage != null:
			stage.cancel_current_interaction()
			get_viewport().set_input_as_handled()
		return
	for command in _shortcut_events:
		var binding: InputEventKey = _shortcut_events[command]
		if binding.get_keycode_with_modifiers() != event.get_keycode_with_modifiers():
			continue
		if _text_input_active() and command not in ["saveFile", "saveAs", "openFile", "newDraft", "commands", "toggleFullscreen"]:
			return
		if command in ["addChild", "addSibling", "editNode"]:
			if $UIOverlay/Welcome.visible or not _available(command):
				return
			for name in _window_ready:
				if _window_ready[name].visible:
					return
		_run(command)
		get_viewport().set_input_as_handled()
		return


func _text_input_active() -> bool:
	var owners: Array[Control] = []
	var owner := get_viewport().gui_get_focus_owner()
	if owner != null:
		owners.append(owner)
	for name in _window_ready:
		var window: Window = _window_ready[name]
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
	_system_theme_poll += delta
	if _system_theme_poll >= 1.0:
		_system_theme_poll = 0.0
		if str(GraphPreferences.value("theme")) == "system":
			var current_system_light := _theme_is_light("system")
			if current_system_light != _system_theme_light:
				_system_theme_light = current_system_light
				_apply_preferences()
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
	var counts := stage.object_counts()
	$UIOverlay/Status.text = "%d 节点 · %d 连线 · %d%%" % [counts.x, counts.y, stage.camera.zoom_percent()]
	var needs_graph := false
	for window_name in ["OutlineWindow", "ReferencesWindow", "FindWindow"]:
		if _window_ready.has(window_name) and _window_ready[window_name].visible:
			needs_graph = true
			break
	if stage.is_loading or not needs_graph or _last_graph_revision == stage.document_revision:
		return
	_last_graph_revision = stage.document_revision
	var graph := JSON.stringify(StageObjectRegistry.capture(stage))
	if graph != _last_graph:
		_last_graph = graph
		if _window_ready.has("OutlineWindow") and _window_ready["OutlineWindow"].visible:
			_refresh_outline()
		if _window_ready.has("ReferencesWindow") and _window_ready["ReferencesWindow"].visible:
			_refresh_references()
		if _window_ready.has("FindWindow") and _window_ready["FindWindow"].visible:
			_refresh_find()


func _on_stage_added(stage: Stage) -> void:
	stage.selection_changed.connect(_selection_changed)
	stage.context_requested.connect(_show_context)
	_last_graph = ""
	_last_graph_revision = -1


func _on_tab_changed(_index: int) -> void:
	if not is_node_ready():
		return
	var current_stage: Stage = tabs.get_current_stage()
	if current_stage != null:
		current_stage.apply_theme(_displayed_theme_light)
	_last_graph = ""
	_last_graph_revision = -1
	_details_id = ""
	_selection_changed()


func _on_stage_closed() -> void:
	_last_graph = ""
	_last_graph_revision = -1
	if not _quitting and tabs.get_tab_count() == 1:
		var stage: Stage = tabs.get_current_stage()
		if stage.stage_objects().is_empty() and stage.current_file_path.is_empty():
			$UIOverlay/Welcome.show()


func _selection_changed() -> void:
	if _window_ready.has("NodeDetailsWindow") and _window_ready["NodeDetailsWindow"].visible:
		_refresh_details()
	if _window_ready.has("ReferencesWindow") and _window_ready["ReferencesWindow"].visible:
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
	var recent: ItemList = null
	var query := ""
	if _window_ready.has("RecentFilesWindow"):
		recent = _window_ready["RecentFilesWindow"].get_node("Margin/Content/Files") as ItemList
		query = _window_ready["RecentFilesWindow"].get_node("Margin/Content/Query").text
	var welcome := $UIOverlay/Welcome/Margin/Content/Columns/Start/RecentList as ItemList
	if recent != null:
		recent.clear()
	welcome.clear()
	for path in all_paths:
		if recent != null and (query.is_empty() or path.containsn(query)):
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
	if list.item_count == 0:
		list.get_v_scroll_bar().hide()
		list.get_h_scroll_bar().hide()


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
	var object: StageObject = selected[0] if selected.size() == 1 else null
	var text_node := object as TextNode
	var edge := object as LineEdge
	panel.get_node("Actions/Apply").disabled = text_node == null and edge == null
	panel.get_node("Actions/Reverse").visible = edge != null
	panel.get_node("Text").visible = text_node != null
	panel.get_node("Text").editable = text_node != null
	for field in ["FontSizeLabel", "FontSize", "WidthLabel", "Width", "FillLabel", "Fill", "TextColorLabel", "TextColor"]:
		panel.get_node("Fields/" + field).visible = text_node != null
	for field in ["StrokeLabel", "Stroke", "StrokeWidthLabel", "StrokeWidth", "ArrowLabel", "Arrow"]:
		panel.get_node("Fields/" + field).visible = edge != null
	if text_node == null and edge == null:
		_details_id = ""
		panel.get_node("Selection").text = "请选择一个文本节点或一条连线"
		panel.get_node("Text").text = ""
		return
	if _details_id == object.id:
		return
	_details_id = object.id
	if edge != null:
		panel.get_node("Selection").text = "连线"
		panel.get_node("Fields/Stroke").color = edge.display_stroke_color()
		panel.get_node("Fields/StrokeWidth").value = edge.stroke_width
		panel.get_node("Fields/Arrow").button_pressed = edge.show_arrow
		return
	panel.get_node("Selection").text = "文本节点"
	panel.get_node("Text").text = text_node.text
	panel.get_node("Fields/FontSize").value = text_node.font_size
	panel.get_node("Fields/Width").value = text_node.fixed_width
	panel.get_node("Fields/Fill").color = text_node.fill_color
	panel.get_node("Fields/TextColor").color = text_node.text_color


func _apply_details() -> void:
	var object := _find_object(_details_id)
	if not object is TextNode and not object is LineEdge:
		_refresh_details()
		return
	var stage: Stage = tabs.get_current_stage()
	var panel := _panel("NodeDetailsWindow")
	stage.finish_text_editing()
	stage.finish_interaction()
	var layout_changed := false
	var changed := false
	if object is TextNode:
		layout_changed = object.text != panel.get_node("Text").text or object.font_size != int(panel.get_node("Fields/FontSize").value) or not is_equal_approx(object.fixed_width, float(panel.get_node("Fields/Width").value))
		changed = layout_changed or object.fill_color != panel.get_node("Fields/Fill").color or object.text_color != panel.get_node("Fields/TextColor").color
	else:
		changed = object.display_stroke_color() != panel.get_node("Fields/Stroke").color or not is_equal_approx(object.stroke_width, float(panel.get_node("Fields/StrokeWidth").value)) or object.show_arrow != panel.get_node("Fields/Arrow").button_pressed
	if not changed:
		_toast("属性未变化")
		return
	stage.history.begin_transaction()
	if layout_changed:
		stage.get_node("NodeRepulsion").begin_local_edit([object])
	if object is TextNode:
		object.text = panel.get_node("Text").text
		object.font_size = int(panel.get_node("Fields/FontSize").value)
		object.fixed_width = float(panel.get_node("Fields/Width").value)
		object.fill_color = panel.get_node("Fields/Fill").color
		object.text_color = panel.get_node("Fields/TextColor").color
	else:
		var stroke: Color = panel.get_node("Fields/Stroke").color
		if stroke != object.display_stroke_color():
			object.use_theme_color = false
			object.stroke_color = stroke
		object.stroke_width = panel.get_node("Fields/StrokeWidth").value
		object.show_arrow = panel.get_node("Fields/Arrow").button_pressed
	stage.history.commit(layout_changed)
	stage.document_changed.emit()
	_toast("属性已更新")


func _reverse_edge() -> void:
	var stage: Stage = tabs.get_current_stage()
	if stage == null:
		return
	var selected := stage.selected_objects()
	if selected.size() != 1 or not selected[0] is LineEdge:
		return
	var edge := selected[0] as LineEdge
	stage.finish_interaction()
	stage.history.begin_transaction()
	var source := edge.source
	edge.source = edge.target
	edge.target = source
	var source_uv := edge.source_uv
	edge.source_uv = edge.target_uv
	edge.target_uv = source_uv
	stage.history.commit(false)
	stage.document_changed.emit()


func _apply_color(reset := false) -> void:
	var stage: Stage = tabs.get_current_stage()
	var panel := _panel("ColorWindow")
	if stage == null:
		return
	if not reset and not _update_color_input():
		return
	var color: Color = panel.get_node("ColorRow/Preview").color
	var target: int = panel.get_node("Target").selected
	var objects := stage.selected_objects()
	if objects.is_empty():
		_toast("请先选择节点、连线或画笔")
		return
	stage.finish_text_editing()
	stage.finish_interaction()
	stage.history.begin_transaction()
	var changed := 0
	for object in objects:
		if object is TextNode:
			match target:
				0: object.fill_color = Color.TRANSPARENT if reset else color
				1: object.text_color = Color.TRANSPARENT if reset else color
		elif target == 0 and object is LineEdge:
			object.stroke_color = Color("#89b4fa") if reset else color
			object.use_theme_color = reset
		elif target == 0 and object is PenStroke:
			object.stroke_color = Color("#cba6f7") if reset else color
		else:
			continue
		changed += 1
	stage.history.commit(false)
	stage.document_changed.emit()
	_details_id = ""
	_selection_changed()
	_toast("已更新 %d 个对象的颜色" % changed if changed > 0 else "所选对象不支持此颜色类型")
	if changed > 0:
		_window_ready["ColorWindow"].hide()


func _generate() -> void:
	var stage: Stage = tabs.get_current_stage()
	var panel := _panel("GenerateNodeWindow")
	var source: String = panel.get_node("Input").text
	if source.strip_edges().is_empty():
		return
	var count := WorkspaceActions.generate(stage, source, panel.get_node("Mode").selected)
	if _window_ready.has("GenerateNodeWindow"):
		_window_ready["GenerateNodeWindow"].hide()
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
	popup.clear()
	for command in ["newNode", "addChild", "addSibling", "editNode", "properties", "openColorManagerWindow", "reverseEdge", "copy", "paste", "groupSelection", "delete"]:
		var index := popup.item_count
		popup.add_item(_command_labels.get(command, command))
		popup.set_item_metadata(index, command)
		if _shortcut_events.has(command):
			popup.set_item_accelerator(index, _shortcut_events[command].get_keycode_with_modifiers())
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


func _open_launch_documents() -> void:
	# 安装器的 desktop 入口用 -- 分隔文档参数，路径逐项传递，支持中文与空格。
	var paths := PackedStringArray()
	for argument in OS.get_cmdline_user_args():
		if argument.get_extension().to_lower() == "prg":
			if FileAccess.file_exists(argument):
				paths.append(argument)
			else:
				_show_error("找不到项目文件：" + argument)
	if paths.is_empty():
		return
	$UIOverlay/Welcome.hide()
	var initial := tabs.get_current_stage() as Stage
	var blank := is_instance_valid(initial) and initial.current_file_path.is_empty() and initial.stage_objects().is_empty()
	await tabs.load_files(paths)
	if blank and is_instance_valid(initial) and tabs.get_current_stage() != initial:
		tabs.close_container(initial.get_parent().get_parent())


func _startup_open_launch_documents() -> void:
	var started := Time.get_ticks_usec()
	await _open_launch_documents()
	_startup_mark("main.launch_documents.complete", started)
	_startup_documents_done = true


func _startup_wait_for_interactive_frame() -> void:
	while not (_startup_panels_done and _startup_theme_done and _startup_documents_done):
		await get_tree().process_frame
	_startup_mark("main.startup_tasks.complete")
	if DisplayServer.get_name() == "headless":
		_startup_mark("main.first_interactive_frame.skipped_headless")
		return
	# A rendered frame followed by a frame boundary is a readiness proxy, not input latency.
	await RenderingServer.frame_post_draw
	_startup_mark("main.initialized_frame_drawn")
	await get_tree().process_frame
	_startup_mark("main.first_interactive_frame.proxy")

func _startup_mark(label: String, started_usec: int = -1) -> void:
	if not OS.is_debug_build() and not OS.get_cmdline_user_args().has("--startup-profile"):
		return
	var now := Time.get_ticks_usec()
	var duration := "" if started_usec < 0 else " | duration=%.3f ms" % ((now - started_usec) / 1000.0)
	print("[startup] engine=%.3f ms | %s%s" % [now / 1000.0, label, duration])

# export-cache-invalidation-20260918


func _refresh_color_swatches() -> void:
	var colors: Dictionary = Palette.LATTE if _displayed_theme_light else Palette.MOCHA
	for swatch in _panel("ColorWindow").get_node("Palette").get_children():
		var color := Color(colors[str(swatch.get_meta("palette_name"))])
		swatch.set_meta("palette_color", color)
		swatch.tooltip_text = str(swatch.get_meta("palette_name")) + " · #" + color.to_html(false)
		for state in ["normal", "hover", "pressed", "hover_pressed", "disabled", "focus"]:
			var style := StyleBoxFlat.new()
			style.bg_color = color
			style.set_corner_radius_all(6)
			style.border_color = Palette.color(_displayed_theme_light, "border.focus")
			style.set_border_width_all(2 if state in ["pressed", "focus"] else 0)
			swatch.add_theme_stylebox_override(state, Corners.style(style, Corners.CONTROL))


func _update_color_input() -> bool:
	var panel := _panel("ColorWindow")
	var text: String = panel.get_node("ColorRow/Hex").text.strip_edges()
	var valid := text.begins_with("#") and text.length() in [7, 9] and Color.html_is_valid(text)
	panel.get_node("Apply").disabled = not valid
	panel.get_node("Hint").text = "确认后应用到选中对象；Esc 关闭。" if valid else "请输入 #RRGGBB 或 #RRGGBBAA，例如 #cba6f7。"
	if valid:
		panel.get_node("ColorRow/Preview").color = Color.html(text)
	return valid


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
