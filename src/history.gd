class_name History
extends Node2D

const MAX_HISTORY_SIZE := 100
const TEXT_NODE_SCENE := preload("res://src/stage_object/entity/text_node/text_node.tscn")
const LINE_EDGE_SCENE := preload("res://src/stage_object/association/line_edge/line_edge.tscn")

@export var target_root: Node
@export var velocity_threshold := 2.0
@export var angular_velocity_threshold := 0.05
@export var stable_physics_frames := 3
@export var settle_timeout := 0.5

var _undo_stack: Array[Dictionary] = []
var _redo_stack: Array[Dictionary] = []
var _current_snapshot: Dictionary = {}
var _transaction_snapshot: Dictionary = {}
var _pending_commit := false
var _busy := false

func _ready() -> void:
	if target_root == null:
		target_root = get_parent()
	_current_snapshot = _capture_snapshot()

func begin_transaction() -> void:
	if not _busy and _transaction_snapshot.is_empty():
		_transaction_snapshot = _capture_snapshot()

func commit() -> void:
	if _busy or _pending_commit:
		return
	_pending_commit = true
	await _wait_for_physics_settle()
	_pending_commit = false
	if _busy:
		return
	var before := _transaction_snapshot if not _transaction_snapshot.is_empty() else _current_snapshot
	var after := _capture_snapshot()
	_transaction_snapshot = {}
	if _snapshots_equal(before, after):
		return
	_undo_stack.append({"before": before, "after": after})
	if _undo_stack.size() > MAX_HISTORY_SIZE:
		_undo_stack.pop_front()
	_redo_stack.clear()
	_current_snapshot = after

func undo() -> void:
	if _busy or _pending_commit or _undo_stack.is_empty():
		return
	_busy = true
	var entry: Dictionary = _undo_stack.pop_back()
	await _restore_snapshot(entry.before)
	_redo_stack.append(entry)
	_current_snapshot = entry.before
	_busy = false

func redo() -> void:
	if _busy or _pending_commit or _redo_stack.is_empty():
		return
	_busy = true
	var entry: Dictionary = _redo_stack.pop_back()
	await _restore_snapshot(entry.after)
	_undo_stack.append(entry)
	_current_snapshot = entry.after
	_busy = false

func clear() -> void:
	_undo_stack.clear()
	_redo_stack.clear()
	_transaction_snapshot = {}
	_current_snapshot = _capture_snapshot()

func can_undo() -> bool:
	return not _undo_stack.is_empty()

func can_redo() -> bool:
	return not _redo_stack.is_empty()

func _capture_snapshot() -> Dictionary:
	var objects: Array[Dictionary] = []
	_collect_snapshots(target_root, objects)
	return {"objects": objects}

func _collect_snapshots(node: Node, result: Array[Dictionary]) -> void:
	for child in node.get_children():
		if child is TextNode:
			var n := child as TextNode
			result.append({"type":"text_node", "id":n.id, "position":_vec(n.position), "rotation":n.rotation, "scale":_vec(n.scale), "text":n.text})
		elif child is LineEdge:
			var e := child as LineEdge
			result.append({"type":"line_edge", "id":e.id, "position":_vec(e.position), "rotation":e.rotation, "scale":_vec(e.scale), "source_id":e.source.id if is_instance_valid(e.source) else "", "target_id":e.target.id if is_instance_valid(e.target) else "", "source_uv":_vec(e.source_uv), "target_uv":_vec(e.target_uv), "curve_segments":e.curve_segments})
		elif child is StageObject:
			continue
		else:
			_collect_snapshots(child, result)

func _restore_snapshot(snapshot: Dictionary) -> void:
	for child in target_root.get_children():
		if child is StageObject:
			child.queue_free()
	await get_tree().process_frame
	var by_id := {}
	for data in snapshot.get("objects", []):
		if data.type != "text_node": continue
		var n := TEXT_NODE_SCENE.instantiate() as TextNode
		n.id = data.id; n.position = _unvec(data.position); n.rotation = data.rotation; n.scale = _unvec(data.scale); n.text = data.text
		target_root.add_child(n); by_id[n.id] = n
	for data in snapshot.get("objects", []):
		if data.type != "line_edge": continue
		var e := LINE_EDGE_SCENE.instantiate() as LineEdge
		e.id = data.id; e.position = _unvec(data.position); e.rotation = data.rotation; e.scale = _unvec(data.scale)
		e.source = by_id.get(data.source_id); e.target = by_id.get(data.target_id); e.source_uv = _unvec(data.source_uv); e.target_uv = _unvec(data.target_uv); e.curve_segments = data.curve_segments
		target_root.add_child(e)
	await get_tree().process_frame

func _wait_for_physics_settle() -> void:
	var elapsed := 0.0
	var stable := 0
	while elapsed < settle_timeout and stable < stable_physics_frames:
		await get_tree().physics_frame
		elapsed += 1.0 / Engine.physics_ticks_per_second
		var moving := false
		for child in target_root.get_children():
			if child is RigidBody2D and (child.linear_velocity.length() > velocity_threshold or absf(child.angular_velocity) > angular_velocity_threshold):
				moving = true; break
		stable = 0 if moving else stable + 1

func _vec(value: Vector2) -> Array[float]:
	return [value.x, value.y]

func _unvec(value: Array) -> Vector2:
	return Vector2(float(value[0]), float(value[1]))

func _snapshots_equal(a: Dictionary, b: Dictionary) -> bool:
	return JSON.stringify(a) == JSON.stringify(b)
