extends Node

@export var open_duration := 0.18
@export var close_duration := 0.13

var _states: Dictionary = {}
var _internal: Dictionary = {}


func register_window(window: Window) -> void:
	if window is PopupMenu or window.name == &"CommandPalette" or _states.has(window):
		return
	_states[window] = {"tween": null, "position": window.position, "colors": {}, "opened": false}
	window.visibility_changed.connect(_on_visibility_changed.bind(window))


func _on_visibility_changed(window: Window) -> void:
	if _internal.get(window, false) or not window.is_inside_tree() or window.is_queued_for_deletion():
		return
	var state: Dictionary = _states[window]
	if window.visible:
		_restore(window)
		state.position = window.position
		state.opened = true
		state.colors = {}
		for child in window.get_children(true):
			if child is CanvasItem:
				state.colors[child] = child.modulate
		_animate(window, true)
	elif state.opened:
		# visibility_changed is emitted while the viewport is being deactivated.
		# Do not re-show it from that callback; closing must release focus immediately.
		_restore(window)
		state.opened = false


func _animate(window: Window, opening: bool) -> void:
	var state: Dictionary = _states[window]
	var origin: Vector2i = state.position
	window.position = origin + Vector2i(0, 10) if opening else origin
	for child in state.colors:
		if is_instance_valid(child):
			var color: Color = state.colors[child]
			child.modulate = Color(color, 0.0) if opening else color
	var tween := create_tween().set_parallel(true)
	state.tween = tween
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT if opening else Tween.EASE_IN)
	var duration := open_duration if opening else close_duration
	tween.tween_property(window, "position", origin if opening else origin + Vector2i(0, 8), duration)
	for child in state.colors:
		if is_instance_valid(child):
			var color: Color = state.colors[child]
			tween.tween_property(child, "modulate", color if opening else Color(color, 0.0), duration)
	tween.finished.connect(func():
		if not is_instance_valid(window):
			return
		_restore(window)
		if not opening:
			state.opened = false
			_internal[window] = true
			window.hide()
			_internal[window] = false
	)


func _restore(window: Window) -> void:
	var state: Dictionary = _states[window]
	var tween: Tween = state.tween
	if tween != null and tween.is_valid():
		tween.kill()
	state.tween = null
	if state.opened:
		window.position = state.position
	for child in state.colors:
		if is_instance_valid(child):
			child.modulate = state.colors[child]
	window.gui_disable_input = false
