class_name History
extends Node2D

const MAX_HISTORY_SIZE := 100

@export var target_root: Node
@export var velocity_threshold := 2.0
@export var angular_velocity_threshold := 0.05
@export var stable_physics_frames := 3
@export var settle_timeout := 1.5

var _undo_stack: Array[Dictionary] = []
var _redo_stack: Array[Dictionary] = []
var _current_snapshot: Dictionary = { }
var _transaction_snapshot: Dictionary = { }
var _pending_commit := false
var _busy := false
var _commit_generation := 0


func _ready() -> void:
	if target_root == null:
		target_root = get_parent()
	_current_snapshot = _capture_snapshot()


func begin_transaction() -> void:
	if _pending_commit:
		_finish_commit()
	if not _busy and _transaction_snapshot.is_empty():
		_transaction_snapshot = _capture_snapshot()


func commit() -> void:
	if _busy or _pending_commit:
		return
	_pending_commit = true
	_commit_generation += 1
	var generation := _commit_generation
	await _wait_for_physics_settle()
	if generation != _commit_generation or _busy:
		return
	_finish_commit()


func _finish_commit() -> void:
	_pending_commit = false
	_commit_generation += 1
	var before := _transaction_snapshot if not _transaction_snapshot.is_empty() else _current_snapshot
	var repulsion := target_root.get_node_or_null("NodeRepulsion")
	if repulsion != null:
		repulsion.call("stop_motion")
	# 投掷与避让属于同一次事务；提交前停止剩余惯性，避免记录后继续漂移。
	for child in target_root.get_children():
		if child is Entity and not child.drag_controlled:
			child.stop_throw()
	var after := _capture_snapshot()
	_transaction_snapshot = { }
	if _snapshots_equal(before, after):
		return
	_undo_stack.append({ "before": before, "after": after })
	if _undo_stack.size() > MAX_HISTORY_SIZE:
		_undo_stack.pop_front()
	_redo_stack.clear()
	_current_snapshot = after


func undo() -> void:
	if _pending_commit and not _busy:
		_finish_commit()
	if _busy or _undo_stack.is_empty():
		return
	_busy = true
	var entry: Dictionary = _undo_stack.pop_back()
	await _restore_snapshot(entry.before)
	_redo_stack.append(entry)
	_current_snapshot = entry.before
	_busy = false


func redo() -> void:
	if _pending_commit and not _busy:
		_finish_commit()
	if _busy or _redo_stack.is_empty():
		return
	_busy = true
	var entry: Dictionary = _redo_stack.pop_back()
	await _restore_snapshot(entry.after)
	_undo_stack.append(entry)
	_current_snapshot = entry.after
	_busy = false


func clear() -> void:
	_commit_generation += 1
	_pending_commit = false
	_undo_stack.clear()
	_redo_stack.clear()
	_transaction_snapshot = { }
	_current_snapshot = _capture_snapshot()


func is_transaction_active() -> bool:
	return not _busy and (_pending_commit or not _transaction_snapshot.is_empty())


func can_undo() -> bool:
	return not _busy and (_pending_commit or not _undo_stack.is_empty())


func can_redo() -> bool:
	return not _redo_stack.is_empty()


func _capture_snapshot() -> Dictionary:
	return StageObjectRegistry.capture(target_root)


func _restore_snapshot(snapshot: Dictionary) -> void:
	await StageObjectRegistry.restore(target_root, snapshot)


func _wait_for_physics_settle() -> void:
	var elapsed := 0.0
	var stable := 0
	while elapsed < settle_timeout and stable < stable_physics_frames:
		await get_tree().physics_frame
		elapsed += 1.0 / Engine.physics_ticks_per_second
		var moving := false
		for child in target_root.get_children():
			if child is RigidBody2D and (child.linear_velocity.length() > velocity_threshold or absf(child.angular_velocity) > angular_velocity_threshold):
				moving = true
				break
		stable = 0 if moving else stable + 1


func _snapshots_equal(a: Dictionary, b: Dictionary) -> bool:
	return JSON.stringify(a) == JSON.stringify(b)


func _unhandled_key_input(event: InputEvent) -> void:
	if target_root is CanvasItem and not target_root.is_visible_in_tree():
		return
	var focus_owner := get_viewport().gui_get_focus_owner()
	if focus_owner is TextEdit or focus_owner is LineEdit or focus_owner is SpinBox:
		return
	if event.is_action_pressed("history_undo", false, true):
		undo()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("history_redo", false, true):
		redo()
		get_viewport().set_input_as_handled()
