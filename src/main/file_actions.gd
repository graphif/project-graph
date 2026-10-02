extends Node

const COMMANDS := ["newWindow", "openFolder", "quickOpen", "reloadFile", "moveFile", "saveAll", "revealInSidebar", "deleteFile", "printFile"]
const DIALOGS := ["FolderDialog", "FileOperationSaveDialog", "FileOperationConfirm", "QuickOpenWindow"]
const INDEX_LIMIT := 10000

@onready var app = get_parent()
@onready var tabs = %TabContainer
@onready var sidebar: PanelContainer = $"../VBoxContainer/Workspace/FileSidebar"
@onready var tree: Tree = $"../VBoxContainer/Workspace/FileSidebar/Margin/Content/Files"
@onready var folder_dialog: FileDialog = $"../UIOverlay/FolderDialog"
@onready var save_dialog: FileDialog = $"../UIOverlay/FileOperationSaveDialog"
@onready var confirm_dialog: ConfirmationDialog = $"../UIOverlay/FileOperationConfirm"
var quick_window: Window
var query: LineEdit
var results: ItemList
var hint: Label

var folder := ""
var _paths := PackedStringArray()
var _index_generation := 0
var _indexing := false
var _truncated := false
var _save_queue: Array[Stage] = []
var _target: Stage
var _target_path := ""
var _operation := ""
var _loading := false


func setup() -> void:
	folder_dialog.dir_selected.connect(open_folder)
	save_dialog.file_selected.connect(_save_selected)
	save_dialog.canceled.connect(_cancel)
	confirm_dialog.confirmed.connect(_confirm)
	confirm_dialog.canceled.connect(_cancel)
	sidebar.get_node("Margin/Content/Header/Close").pressed.connect(sidebar.hide)
	sidebar.get_node("Margin/Content/Header/Refresh").pressed.connect(func(): open_folder(folder))
	tree.item_activated.connect(_activate_tree)
	tree.item_collapsed.connect(_expand_tree)
	tabs.workspace_saved.connect(func(_path): _refresh_sidebar())
	tabs.stage_closed.connect(_refresh_sidebar)



func _ensure_quick_ready() -> bool:
	if is_instance_valid(quick_window):
		return true
	quick_window = app._ensure_window_ready("QuickOpenWindow")
	if quick_window == null:
		app._show_error("无法加载快速打开窗口。")
		return false
	query = quick_window.get_node("Margin/Content/Query") as LineEdit
	results = quick_window.get_node("Margin/Content/Results") as ItemList
	hint = quick_window.get_node("Margin/Content/Hint") as Label
	query.text_changed.connect(func(_text): _refresh_quick())
	query.text_submitted.connect(func(_text): _open_quick(-1))
	results.item_activated.connect(_open_quick)
	quick_window.window_input.connect(_quick_input)
	quick_window.visibility_changed.connect(func():
		if quick_window.visible:
			_refresh_quick()
			query.grab_focus()
	)
	return true


func modal_open() -> bool:
	if _loading:
		return true
	for name in DIALOGS:
		var dialog: Node = app.overlay.get_node_or_null(name)
		if dialog != null and dialog.visible:
			return true
	return false


func available(command: String) -> bool:
	if _loading or not _operation.is_empty():
		return false
	var stage: Stage = tabs.get_current_stage()
	if command in ["newWindow", "printFile"]:
		return not OS.has_feature("web") and (command == "newWindow" or (stage != null and not stage.stage_objects().is_empty()))
	if command in ["reloadFile", "deleteFile", "revealInSidebar"]:
		return stage != null and not stage.current_file_path.is_empty() and FileAccess.file_exists(stage.current_file_path)
	if command == "moveFile":
		return stage != null and not stage.current_file_path.is_empty() and FileAccess.file_exists(stage.current_file_path)
	return true


func run(command: String) -> void:
	if not available(command):
		return
	var stage: Stage = tabs.get_current_stage()
	match command:
		"newWindow":
			var arguments := PackedStringArray()
			if OS.has_feature("editor"):
				arguments = PackedStringArray(["--path", ProjectSettings.globalize_path("res://")])
			if OS.create_instance(arguments) == -1:
				app._show_error("无法新建窗口。")
		"openFolder":
			if not folder.is_empty():
				folder_dialog.current_dir = folder
			folder_dialog.popup_centered_ratio(0.7)
		"quickOpen":
			if not _ensure_quick_ready():
				return
			query.text = ""
			app._show_panel("QuickOpenWindow")
		"reloadFile", "deleteFile":
			stage.finish_text_editing()
			stage.finish_interaction()
			_target = stage
			_target_path = stage.current_file_path
			_operation = command
			if command == "reloadFile" and not stage.is_dirty():
				_confirm()
				return
			confirm_dialog.title = "从磁盘重新加载" if command == "reloadFile" else "删除文件"
			confirm_dialog.ok_button_text = "重新加载" if command == "reloadFile" else "移到回收站"
			confirm_dialog.dialog_text = ("重新加载「%s」？未保存的更改和撤销记录将被丢弃。" if command == "reloadFile" else "将「%s」移到回收站并关闭标签页？未保存的更改将被丢弃。") % _target_path.get_file()
			confirm_dialog.popup_centered(Vector2i(520, 180))
		"moveFile":
			_target = stage
			_target_path = stage.current_file_path
			_operation = command
			save_dialog.title = "移动到"
			save_dialog.current_path = _target_path
			save_dialog.popup_centered_ratio(0.7)
		"saveAll":
			_operation = command
			_save_queue = tabs.stages()
			_save_next()
		"revealInSidebar":
			_reveal(stage.current_file_path)
		"printFile":
			_print(stage)


func _cancel() -> void:
	_operation = ""
	_target = null
	_target_path = ""
	_save_queue.clear()


func _save_next() -> void:
	while not _save_queue.is_empty():
		var stage: Stage = _save_queue.pop_front()
		if not is_instance_valid(stage):
			continue
		stage.finish_text_editing()
		stage.finish_interaction()
		if stage.current_file_path.is_empty():
			_target = stage
			save_dialog.title = "保存全部 — " + str(stage.get_parent().get_parent().get_meta("tab_title", "未命名"))
			save_dialog.current_file = str(stage.get_parent().get_parent().get_meta("tab_title", "未命名")) + ".prg"
			save_dialog.popup_centered_ratio(0.7)
			return
		if not stage.save_to_file(stage.current_file_path):
			_cancel()
			return
	_cancel()
	app._toast("全部文件已保存")


func _save_selected(raw_path: String) -> void:
	if not is_instance_valid(_target):
		_cancel()
		return
	var path := raw_path.simplify_path()
	if not path.to_lower().ends_with(".prg"):
		path += ".prg"
	for other in tabs.stages():
		if other != _target and other.current_file_path == path:
			_cancel()
			app._show_error("目标文件已在其他标签页打开，请选择其他文件名。")
			return
	_target.finish_text_editing()
	_target.finish_interaction()
	if _operation == "moveFile":
		if _target.current_file_path != _target_path:
			_cancel()
			app._show_error("原文件路径已改变，请重新执行移动。")
			return
		if path == _target_path:
			_cancel()
			return
		# 移动禁止覆盖其他文件，避免跨磁盘移动时破坏目标文件。
		if FileAccess.file_exists(path):
			_cancel()
			app._show_error("目标文件已存在，请选择其他文件名。")
			return
		var old_path := _target_path
		if not _target.save_to_file(path):
			_cancel()
			return
		var error := DirAccess.remove_absolute(old_path)
		_cancel()
		if error != OK:
			app._show_error("已保存到新位置，但原文件无法移除，两个文件均保留：" + error_string(error))
		else:
			_forget(old_path)
			app._toast("文件已移动")
		_refresh_sidebar()
		return
	if _operation == "saveAll":
		if not _target.save_to_file(path):
			_cancel()
			return
		_target = null
		_save_next.call_deferred()


func _confirm() -> void:
	if not is_instance_valid(_target) or _target.current_file_path != _target_path:
		_cancel()
		return
	var stage := _target
	var path := _target_path
	var operation := _operation
	_cancel()
	if operation == "reloadFile":
		_loading = true
		var loaded: bool = await stage.load_from_file(path)
		_loading = false
		if loaded:
			tabs._update_tab_titles()
			app._on_tab_changed(tabs.current_tab)
			app._toast("已从磁盘重新加载")
	elif operation == "deleteFile":
		var error := OS.move_to_trash(ProjectSettings.globalize_path(path))
		if error != OK:
			app._show_error("无法移到回收站，文件和标签页已保留：" + error_string(error))
			return
		_forget(path)
		tabs.close_container(stage.get_parent().get_parent())
		_refresh_sidebar()
		app._toast("文件已移到回收站")


func _forget(path: String) -> void:
	var recent := GraphPreferences.recent_files()
	var index := recent.find(path)
	if index >= 0:
		recent.remove_at(index)
		GraphPreferences.set_recent(recent)
	app._refresh_recent()


func open_folder(path: String) -> void:
	if DirAccess.open(path) == null:
		app._show_error("无法打开文件夹：" + path)
		return
	folder = path.simplify_path()
	sidebar.show()
	app.get_node("UIOverlay/Welcome").hide()
	_refresh_sidebar()
	_index_folder()


func _refresh_sidebar() -> void:
	if folder.is_empty():
		return
	tree.clear()
	var root := tree.create_item()
	root.set_text(0, folder.get_file() if not folder.get_file().is_empty() else folder)
	root.set_tooltip_text(0, folder)
	root.set_metadata(0, {"path": folder, "directory": true, "loaded": false})
	_populate(root)
	if is_instance_valid(quick_window) and quick_window.visible:
		_refresh_quick()


func _populate(item: TreeItem) -> void:
	var data: Dictionary = item.get_metadata(0)
	if data.get("loaded", false):
		return
	var directory := DirAccess.open(str(data.path))
	if directory == null:
		return
	for child in item.get_children():
		child.free()
	data.loaded = true
	item.set_metadata(0, data)
	var directories := directory.get_directories()
	directories.sort()
	for name in directories:
		if name.begins_with(".") or directory.is_link(name):
			continue
		var child := tree.create_item(item)
		child.set_text(0, name + "/")
		child.set_metadata(0, {"path": str(data.path).path_join(name), "directory": true, "loaded": false})
		child.collapsed = true
		tree.create_item(child).set_text(0, "…")
	var files := directory.get_files()
	files.sort()
	for name in files:
		if not name.to_lower().ends_with(".prg"):
			continue
		var path := str(data.path).path_join(name)
		var child := tree.create_item(item)
		child.set_text(0, name)
		child.set_tooltip_text(0, path)
		child.set_metadata(0, {"path": path, "directory": false, "loaded": true})


func _expand_tree(item: TreeItem) -> void:
	var data: Variant = item.get_metadata(0)
	if data is Dictionary and data.get("directory", false) and not item.collapsed:
		_populate(item)


func _activate_tree() -> void:
	var item := tree.get_selected()
	if item == null:
		return
	var data: Variant = item.get_metadata(0)
	if not data is Dictionary:
		return
	if data.directory:
		item.collapsed = not item.collapsed
		_expand_tree(item)
	else:
		tabs.load_files(PackedStringArray([str(data.path)]))


func _reveal(path: String) -> void:
	if folder.is_empty() or not path.begins_with(folder.trim_suffix("/") + "/"):
		open_folder(path.get_base_dir())
	else:
		sidebar.show()
		_refresh_sidebar()
	var item := tree.get_root()
	var relative := path.trim_prefix(folder.trim_suffix("/") + "/")
	for part in relative.split("/"):
		_populate(item)
		var found: TreeItem
		for child in item.get_children():
			var data: Variant = child.get_metadata(0)
			if data is Dictionary and str(data.path).get_file() == part:
				found = child
				break
		if found == null:
			return
		item.collapsed = false
		item = found
	item.select(0)
	tree.scroll_to_item(item)


func _index_folder() -> void:
	_index_generation += 1
	var generation := _index_generation
	var pending := PackedStringArray([folder])
	_paths.clear()
	_indexing = true
	_truncated = false
	var visited := 0
	while not pending.is_empty() and visited < INDEX_LIMIT and _paths.size() < INDEX_LIMIT:
		if generation != _index_generation:
			return
		var path := pending[0]
		pending.remove_at(0)
		var directory := DirAccess.open(path)
		visited += 1
		if directory != null:
			for name in directory.get_files():
				if name.to_lower().ends_with(".prg") and _paths.size() < INDEX_LIMIT:
					_paths.append(path.path_join(name))
			for name in directory.get_directories():
				if not name.begins_with(".") and not directory.is_link(name):
					pending.append(path.path_join(name))
		if visited % 16 == 0:
			_refresh_quick()
			await get_tree().process_frame
	if generation != _index_generation:
		return
	_truncated = not pending.is_empty() or _paths.size() >= INDEX_LIMIT
	_indexing = false
	_paths.sort()
	_refresh_quick()


func _refresh_quick() -> void:
	if not is_instance_valid(quick_window) or not quick_window.visible:
		return
	results.clear()
	var candidates := {}
	for stage in tabs.stages():
		if not stage.current_file_path.is_empty():
			candidates[stage.current_file_path] = true
	for path in GraphPreferences.recent_files():
		candidates[path] = true
	for path in _paths:
		candidates[path] = true
	var terms := query.text.strip_edges().split(" ", false)
	var matches := 0
	for path in candidates:
		if not FileAccess.file_exists(path):
			continue
		var matched := true
		for term in terms:
			if not str(path).containsn(term):
				matched = false
				break
		if not matched:
			continue
		matches += 1
		if results.item_count >= 200:
			continue
		var index := results.add_item(str(path).get_file() + "    " + str(path).get_base_dir())
		results.set_item_metadata(index, path)
		results.set_item_tooltip(index, path)
	if results.item_count > 0:
		results.select(0)
	hint.text = "%d 个匹配 · Enter 打开 · Esc 关闭" % matches
	if matches > 200:
		hint.text += " · 显示前 200 个，请继续输入"
	if _indexing:
		hint.text += " · 正在索引文件夹…"
	elif _truncated:
		hint.text += " · 索引已达上限，请打开更小的文件夹"


func _quick_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	if not DisplayServer.ime_get_text().is_empty():
		return
	if event.keycode in [KEY_UP, KEY_DOWN] and results.item_count > 0:
		var selected := results.get_selected_items()
		var index := selected[0] if not selected.is_empty() else 0
		results.select(posmod(index + (-1 if event.keycode == KEY_UP else 1), results.item_count))
		results.ensure_current_is_visible()
		quick_window.set_input_as_handled()


func _open_quick(index: int) -> void:
	if index < 0:
		var selected := results.get_selected_items()
		if selected.is_empty():
			return
		index = selected[0]
	if index >= results.item_count:
		return
	var path := str(results.get_item_metadata(index))
	quick_window.hide()
	tabs.load_files(PackedStringArray([path]))


func _print(stage: Stage) -> void:
	stage.finish_text_editing()
	stage.finish_interaction()
	var svg := WorkspaceActions.export_svg(stage)
	if svg.is_empty():
		app._show_error("没有可打印的内容。")
		return
	var directory := "user://print"
	var error := DirAccess.make_dir_recursive_absolute(directory)
	if error != OK:
		app._show_error("无法创建打印预览：" + error_string(error))
		return
	var path := directory.path_join("graph-" + str(Time.get_ticks_usec()) + ".html")
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		app._show_error("无法写入打印预览：" + error_string(FileAccess.get_open_error()))
		return
	var title := stage.current_file_path.get_file() if not stage.current_file_path.is_empty() else "未命名"
	var html := """<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>%s</title>
<style>@page{size:A4 landscape;margin:12mm}body{margin:0;font-family:sans-serif;background:white}
header{padding:12px;background:#eee}button{padding:8px 20px;cursor:pointer}
main svg{display:block;width:100%%;height:85vh}
@media print{header{display:none}main svg{height:175mm;max-width:270mm}}</style>
<header><button onclick="window.print()">打印 / 保存为 PDF</button> 使用打印对话框选择打印机、纸张和方向。</header>
<main>%s</main><script>window.addEventListener('load',()=>window.print());</script></html>""" % [title.xml_escape(), svg]
	file.store_string(html)
	error = file.get_error()
	file.close()
	if error == OK:
		error = OS.shell_open(ProjectSettings.globalize_path(path))
	if error != OK:
		app._show_error("无法打开打印预览：" + error_string(error))
	else:
		app._toast("已在默认浏览器打开打印预览")

# export-cache-invalidation-20260918
