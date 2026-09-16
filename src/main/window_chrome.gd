extends Control

const MAXIMIZE_ICON = preload("res://src/main/icons/maximize.tres")
const RESTORE_ICON = preload("res://src/main/icons/restore.tres")

@onready var maximize_button: Button = $"../VBoxContainer/Header/Maximize"
var _last_mode := -1
var _last_resizable := false


func _ready() -> void:
	for grip in get_children():
		grip.gui_input.connect(_on_grip_input.bind(grip))
	get_window().size_changed.connect(_sync_window_state)
	_sync_window_state()


func _process(_delta: float) -> void:
	# 窗口管理器也能改变模式，且不一定伴随尺寸变化。
	_sync_window_state()


func _sync_window_state() -> void:
	var mode := get_window().mode
	var resizable := not get_window().unresizable
	if mode == _last_mode and resizable == _last_resizable:
		return
	_last_mode = mode
	_last_resizable = resizable
	var expanded := mode in [Window.MODE_MAXIMIZED, Window.MODE_FULLSCREEN, Window.MODE_EXCLUSIVE_FULLSCREEN]
	maximize_button.icon = RESTORE_ICON if expanded else MAXIMIZE_ICON
	maximize_button.tooltip_text = "还原" if expanded else "最大化"
	visible = mode == Window.MODE_WINDOWED and resizable and not OS.has_feature("web")


func toggle_maximize() -> void:
	var window := get_window()
	if window.mode in [Window.MODE_MAXIMIZED, Window.MODE_FULLSCREEN, Window.MODE_EXCLUSIVE_FULLSCREEN]:
		window.mode = Window.MODE_WINDOWED
	else:
		window.mode = Window.MODE_MAXIMIZED
	_sync_window_state()


func _on_grip_input(event: InputEvent, grip: Control) -> void:
	if get_window().mode != Window.MODE_WINDOWED or get_window().unresizable:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		grip.accept_event()
		var edge: DisplayServer.WindowResizeEdge = grip.get_meta("resize_edge")
		DisplayServer.window_start_resize(edge, get_window().get_window_id())
