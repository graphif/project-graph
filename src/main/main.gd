extends Control

const STAGE_SCENE := preload("res://src/stage/stage.tscn")

@onready var tab_container: TabContainer = $TabContainer
@onready var tab_bar: TabBar = tab_container.get_tab_bar()

var tab_serial := 1

func _ready() -> void:
	var screen_fps := DisplayServer.screen_get_refresh_rate(DisplayServer.SCREEN_OF_MAIN_WINDOW)
	Engine.physics_ticks_per_second = screen_fps
	tab_bar.tab_close_display_policy = TabBar.CLOSE_BUTTON_SHOW_ALWAYS
	tab_bar.tab_close_pressed.connect(_on_tab_close_pressed)
	tab_container.tab_changed.connect(_on_tab_changed)
	_ensure_default_tab()
	_update_tab_titles()

func _ensure_default_tab() -> void:
	if tab_container.get_tab_count() > 0:
		return
	_create_stage_tab("未命名 1")

func _create_stage_tab(title: String = "") -> void:
	var container := SubViewportContainer.new()
	container.name = "StageTab%d" % tab_serial
	container.set_meta("tab_title", title if not title.is_empty() else "未命名 %d" % tab_serial)
	container.stretch = true
	container.add_child(_create_viewport())
	tab_container.add_child(container)
	tab_serial += 1
	tab_container.current_tab = tab_container.get_tab_count() - 1
	_update_tab_titles()

func _create_viewport() -> SubViewport:
	var viewport := SubViewport.new()
	viewport.name = "SubViewport"
	viewport.transparent_bg = true
	viewport.handle_input_locally = false
	viewport.size = Vector2i(1152, 618)
	viewport.size_2d_override_stretch = true
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport.add_child(STAGE_SCENE.instantiate())
	return viewport

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

func get_current_stage() -> Node:
	var current := tab_container.get_current_tab_control()
	if current == null or current.get_child_count() == 0:
		return null
	var viewport := current.get_child(0) as SubViewport
	return viewport.get_node_or_null("Stage") if viewport != null else null
