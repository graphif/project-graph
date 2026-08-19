extends TabContainer

const STAGE := preload("uid://bc73att6xutyi")
var tab_serial := 1
@onready var open_file_dialog: FileDialog = %OpenFileDialog
@onready var save_file_dialog: FileDialog = %SaveFileDialog


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	var tab_bar := get_tab_bar()
	tab_bar.tab_close_display_policy = TabBar.CLOSE_BUTTON_SHOW_ALWAYS
	tab_bar.tab_close_pressed.connect(close_tab)
	_ensure_default_tab()
	_update_tab_titles()


func _ensure_default_tab() -> void:
	if get_tab_count() > 0:
		return
	new_tab("未命名 1")


func new_tab(title: String = "") -> Stage:
	var stage := STAGE.instantiate()

	var viewport := SubViewport.new()
	viewport.name = "SubViewport"
	viewport.transparent_bg = true
	viewport.handle_input_locally = false
	viewport.size = Vector2i(1152, 618)
	viewport.size_2d_override_stretch = true
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport.add_child(stage)

	var container := SubViewportContainer.new()
	container.name = "StageTab%d" % tab_serial
	container.set_meta("tab_title", title if not title.is_empty() else "未命名 %d" % tab_serial)
	container.stretch = true
	container.add_child(viewport)
	add_child(container)
	tab_serial += 1
	current_tab = get_tab_count() - 1

	_update_tab_titles()
	return stage


func _update_tab_titles() -> void:
	for index in get_tab_count():
		var container := get_child(index) as SubViewportContainer
		if container != null:
			set_tab_title(index, str(container.get_meta("tab_title", "未命名")))


func close_tab(index: int) -> void:
	if index < 0 or index >= get_tab_count():
		return
	var container := get_child(index)
	remove_child(container)
	container.queue_free()
	if get_tab_count() == 0:
		new_tab()
	else:
		current_tab = mini(index, get_tab_count() - 1)
	_update_tab_titles()


func _on_tab_changed(_index: int) -> void:
	_update_tab_titles()


func get_current_stage() -> Stage:
	var current := get_current_tab_control()
	if current == null or current.get_child_count() == 0:
		return null
	var viewport := current.get_child(0) as SubViewport
	return viewport.get_node_or_null("Stage") if viewport != null else null


func _process(delta: float) -> void:
	if Input.is_action_just_pressed("project_open", true):
		open_file_dialog.show()
	if Input.is_action_just_pressed("project_save", true):
		save_file_dialog.show()


func load_files(paths: PackedStringArray) -> void:
	for path in paths:
		var stage := new_tab(path.get_file())
		stage.load_from_file(path)


func save_current_file() -> void:
	var stage := get_current_stage()
	if stage == null:
		return
	var path := stage.current_file_path
	if path.is_empty() or not FileAccess.file_exists(path):
		save_file_dialog.show()
	else:
		stage.save_to_file(path)


func save_current_file_as(path: String) -> void:
	var stage := get_current_stage()
	if stage == null:
		return
	var final_path := path
	if not final_path.ends_with(".prg"):
		final_path += ".prg"
	stage.save_to_file(final_path)
	get_current_tab_control().set_meta("tab_title", final_path.get_file())
	_update_tab_titles()
