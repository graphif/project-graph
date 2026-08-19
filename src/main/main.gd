extends Control

const STAGE_SCENE := preload("res://src/stage/stage.tscn")
const TEXT_NODE = preload("uid://btnefrbc5lowu")

@onready var tab_container: TabContainer = %TabContainer
@onready var tab_bar: TabBar = tab_container.get_tab_bar()

var tab_serial := 1


func _ready() -> void:
	var screen_fps := DisplayServer.screen_get_refresh_rate(DisplayServer.SCREEN_OF_MAIN_WINDOW)
	Engine.physics_ticks_per_second = screen_fps
	tab_bar.tab_close_display_policy = TabBar.CLOSE_BUTTON_SHOW_ALWAYS
	tab_bar.tab_close_pressed.connect(_on_tab_close_pressed)
	_ensure_default_tab()
	_update_tab_titles()


func _ensure_default_tab() -> void:
	if tab_container.get_tab_count() > 0:
		return
	_create_stage_tab("未命名 1")


func _create_stage_tab(title: String = "") -> Stage:
	var stage := STAGE_SCENE.instantiate()

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
	tab_container.add_child(container)
	tab_serial += 1
	tab_container.current_tab = tab_container.get_tab_count() - 1

	_update_tab_titles()
	return stage


func _update_tab_titles() -> void:
	for index in tab_container.get_tab_count():
		var container := tab_container.get_child(index) as SubViewportContainer
		if container != null:
			tab_container.set_tab_title(index, str(container.get_meta("tab_title", "未命名")))


func _on_tab_close_pressed(index: int) -> void:
	if index < 0 or index >= tab_container.get_tab_count():
		return
	var container := tab_container.get_child(index)
	tab_container.remove_child(container)
	container.queue_free()
	if tab_container.get_tab_count() == 0:
		_create_stage_tab()
	else:
		tab_container.current_tab = mini(index, tab_container.get_tab_count() - 1)
	_update_tab_titles()


func _on_tab_changed(_index: int) -> void:
	_update_tab_titles()


func get_current_stage() -> Stage:
	var current := tab_container.get_current_tab_control()
	if current == null or current.get_child_count() == 0:
		return null
	var viewport := current.get_child(0) as SubViewport
	return viewport.get_node_or_null("Stage") if viewport != null else null


func _process(delta: float) -> void:
	if Input.is_action_just_pressed("project_save", true):
		get_tree().call_group("project_file_save", "open_save_dialog")
	if Input.is_action_just_pressed("project_open", true):
		get_tree().call_group("project_file_open", "open_file_dialog")


func _on_open_file_dialog_files_selected(paths: PackedStringArray) -> void:
	for path in paths:
		var stage := _create_stage_tab(path.get_file())
		stage.load_from_file(path)


func _on_save_file_dialog_file_selected(path: String) -> void:
	if not path.ends_with(".prg"):
		path += ".prg"
	get_current_stage().save_to_file(path)


func _on_create_100_text_nodes_button_pressed() -> void:
	var stage := get_current_stage()
	for i in range(100):
		var node: TextNode = TEXT_NODE.instantiate()
		node.text = str(i)
		node.position = Vector2(randi_range(1, 1000), randi_range(1, 1000))
		stage.add_child(node)
