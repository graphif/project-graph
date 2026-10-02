extends Node

const EDGE_DISTANCE := 18.0
const KEEP_MARGIN := 14.0
const HIDE_DELAY := 0.45
const FADE_DURATION := 0.16

@onready var _overlay: Control = $"../UIOverlay"
var _docks: Array[Dictionary] = []


func _ready() -> void:
	_register(_overlay.get_node("BottomToolbar"), false)
	_register(_overlay.get_node("QuickSettings"), true)


func _register(control: Control, right: bool) -> void:
	control.hide()
	control.modulate.a = 0.0
	_docks.append({"control": control, "right": right, "enabled": true,
		"shown": false, "away": 0.0, "tween": null})


func set_available(bottom: bool, right: bool) -> void:
	for dock in _docks:
		dock.enabled = right if dock.right else bottom
		if not dock.enabled:
			_hide_immediately(dock)


func _process(delta: float) -> void:
	var viewport := get_viewport()
	var bounds := viewport.get_visible_rect()
	var mouse := _overlay.get_global_mouse_position()
	var blocked := not get_window().has_focus() or not bounds.has_point(mouse)
	for child in _overlay.get_children():
		if child is Window and child.visible:
			blocked = true
			break
	for dock in _docks:
		if not dock.enabled:
			continue
		if blocked:
			_hide_immediately(dock)
			continue
		var control: Control = dock.control
		var rect := control.get_global_rect()
		var edge: Rect2
		var keep := rect.grow(KEEP_MARGIN)
		if dock.right:
			edge = Rect2(bounds.end.x - EDGE_DISTANCE, keep.position.y, EDGE_DISTANCE, keep.size.y)
			keep.size.x = bounds.end.x - keep.position.x
		else:
			edge = Rect2(keep.position.x, bounds.end.y - EDGE_DISTANCE, keep.size.x, EDGE_DISTANCE)
			keep.size.y = bounds.end.y - keep.position.y
		var pressed := Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) or Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT)
		if (dock.shown and keep.has_point(mouse)) or (edge.has_point(mouse) and not pressed):
			dock.away = 0.0
			_set_shown(dock, true)
		elif dock.shown:
			dock.away += delta
			if dock.away >= HIDE_DELAY and not pressed:
				_set_shown(dock, false)


func _set_shown(dock: Dictionary, shown: bool) -> void:
	if dock.shown == shown:
		return
	dock.shown = shown
	var previous: Tween = dock.tween
	if previous != null and previous.is_valid():
		previous.kill()
	var control: Control = dock.control
	if shown:
		control.show()
	var tween := create_tween()
	dock.tween = tween
	tween.tween_property(control, "modulate:a", 1.0 if shown else 0.0, FADE_DURATION)
	if not shown:
		tween.tween_callback(control.hide)


func _hide_immediately(dock: Dictionary) -> void:
	var tween: Tween = dock.tween
	if tween != null and tween.is_valid():
		tween.kill()
	dock.tween = null
	dock.shown = false
	dock.away = 0.0
	var control: Control = dock.control
	control.hide()
	control.modulate.a = 0.0
