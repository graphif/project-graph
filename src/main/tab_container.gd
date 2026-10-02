extends TabContainer

signal stage_added(stage: Stage)
signal stage_closed
signal close_requested(container: Control)
signal workspace_error(message: String)
signal workspace_saved(path: String)

const STAGE := preload("uid://bc73att6xutyi")
var tab_serial := 1
var _save_target: Stage
@onready var open_file_dialog: FileDialog = %OpenFileDialog
@onready var save_file_dialog: FileDialog = %SaveFileDialog


func _ready() -> void:
	if not tab_changed.is_connected(_on_tab_changed):
		tab_changed.connect(_on_tab_changed)
	var tab_bar := get_tab_bar()
	tab_bar.tab_close_display_policy = TabBar.CLOSE_BUTTON_SHOW_ALWAYS
	tab_bar.tab_close_pressed.connect(close_tab)
	drag_to_rearrange_enabled = true
	save_file_dialog.canceled.connect(func(): _save_target = null)
	if get_tab_count() == 0:
		new_tab()
	_update_tab_titles()


func new_tab(title: String = "") -> Stage:
	var stage := STAGE.instantiate() as Stage
	var viewport := SubViewport.new()
	viewport.name = "SubViewport"
	viewport.transparent_bg = true
	# Compatibility/GLES 不支持 2D MSAA；Forward+/Mobile 保留 4x 边缘质量。
	var renderer := str(ProjectSettings.get_setting("rendering/renderer/rendering_method"))
	viewport.msaa_2d = Viewport.MSAA_DISABLED if renderer == "gl_compatibility" else Viewport.MSAA_4X
	# 初始按正常尺寸绘制；相机按当前屏幕缩放更新 SVG 采样档位。
	viewport.oversampling = true
	viewport.oversampling_override = 1.0
	viewport.handle_input_locally = false
	viewport.size = Vector2i(1152, 618)
	viewport.size_2d_override_stretch = true
	viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	viewport.add_child(stage)
	var container := SubViewportContainer.new()
	container.name = "StageTab%d" % tab_serial
	container.set_meta("tab_title", title if not title.is_empty() else "未命名 %d" % tab_serial)
	container.stretch = true
	container.add_child(viewport)
	container.resized.connect(_sync_viewport_size.bind(container, viewport))
	_sync_viewport_size.call_deferred(container, viewport)
	stage.file_error.connect(func(message): workspace_error.emit(message))
	stage.file_saved.connect(_on_file_saved.bind(stage))
	add_child(container)
	tab_serial += 1
	current_tab = get_tab_count() - 1
	_update_tab_titles()
	stage_added.emit(stage)
	return stage


func _sync_viewport_size(container: Control, viewport: SubViewport) -> void:
	if not is_instance_valid(container) or not is_instance_valid(viewport):
		return
	if not (container is SubViewportContainer and (container as SubViewportContainer).stretch):
		var new_size := Vector2i(container.size.round()).max(Vector2i(1, 1))
		if viewport.size != new_size:
			viewport.size = new_size
	var stage := viewport.get_node_or_null("Stage") as Stage
	if stage != null and stage.is_node_ready():
		stage.camera.global_position = stage.camera.target_position
		stage.camera.zoom = stage.camera.target_zoom


func stages() -> Array[Stage]:
	var result: Array[Stage] = []
	for index in get_tab_count():
		var stage := get_stage(index)
		if stage != null:
			result.append(stage)
	return result


func get_stage(index: int) -> Stage:
	var container := get_tab_control(index)
	return container.get_node_or_null("SubViewport/Stage") as Stage if container != null else null


func get_current_stage() -> Stage:
	return get_stage(current_tab) if current_tab >= 0 else null


func _update_tab_titles() -> void:
	for index in get_tab_count():
		var container := get_tab_control(index)
		var stage := get_stage(index)
		var dirty := stage != null and stage.is_node_ready() and stage.is_dirty()
		set_tab_title(index, str(container.get_meta("tab_title", "未命名")) + (" •" if dirty else ""))
		set_tab_tooltip(index, stage.current_file_path if stage != null else "")


func close_tab(index: int) -> void:
	if index < 0 or index >= get_tab_count():
		return
	var stage := get_stage(index)
	stage.finish_text_editing()
	stage.finish_interaction()
	if stage.is_dirty():
		close_requested.emit(get_tab_control(index))
	else:
		close_container(get_tab_control(index))


func close_container(container: Control) -> void:
	if not is_instance_valid(container) or container.get_parent() != self:
		return
	var index := container.get_index()
	remove_child(container)
	container.queue_free()
	if get_tab_count() == 0:
		new_tab()
	else:
		current_tab = mini(index, get_tab_count() - 1)
	_update_tab_titles()
	stage_closed.emit()


func _on_tab_changed(index: int) -> void:
	for tab_index in get_tab_count():
		var container := get_tab_control(tab_index)
		var stage := get_stage(tab_index)
		if stage != null and stage.is_node_ready() and tab_index != index:
			stage.finish_text_editing()
			stage.finish_interaction()
		container.process_mode = Node.PROCESS_MODE_INHERIT if tab_index == index else Node.PROCESS_MODE_DISABLED
	_update_tab_titles()


func load_files(paths: PackedStringArray) -> void:
	for raw_path in paths:
		var path := raw_path.simplify_path()
		var existing := -1
		for index in get_tab_count():
			if get_stage(index).current_file_path == path or get_stage(index).loading_file_path == path:
				existing = index
				break
		if existing >= 0:
			current_tab = existing
			continue
		var stage := new_tab(path.get_file())
		var stage_ref: WeakRef = weakref(stage)
		var loader := stage.start_initial_load(path)
		var loaded: bool = await loader.completed if loader != null else false
		if loaded:
			GraphPreferences.remember(path)
		elif stage_ref.get_ref() != null and stage_ref.get_ref().is_inside_tree():
			close_container(stage_ref.get_ref().get_parent().get_parent())
	_update_tab_titles()


func request_save_as(stage: Stage = null) -> void:
	_save_target = stage if stage != null else get_current_stage()
	if _save_target == null:
		return
	_save_target.finish_text_editing()
	save_file_dialog.current_file = _save_target.current_file_path.get_file() if not _save_target.current_file_path.is_empty() else "未命名.prg"
	save_file_dialog.popup_centered_ratio(0.7)


func save_current_file() -> void:
	var stage := get_current_stage()
	if stage == null:
		return
	if stage.current_file_path.is_empty():
		request_save_as(stage)
	else:
		stage.save_to_file(stage.current_file_path)


func save_current_file_as(path: String) -> void:
	var stage := _save_target if is_instance_valid(_save_target) else get_current_stage()
	_save_target = null
	if stage == null:
		return
	var final_path := path if path.to_lower().ends_with(".prg") else path + ".prg"
	stage.save_to_file(final_path)


func _on_file_saved(path: String, stage: Stage) -> void:
	var container := stage.get_parent().get_parent()
	container.set_meta("tab_title", path.get_file())
	GraphPreferences.remember(path)
	_update_tab_titles()
	workspace_saved.emit(path)
