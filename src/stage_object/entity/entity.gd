class_name Entity
extends StageObject

# 单父包含关系使用稳定对象引用；所有刚体仍直接挂在舞台下，保持世界坐标。
@export var container: Entity

@export var throw_speed_limit := 1200.0
@export var throw_damping := 7.0

const THROW_SAMPLE_SECONDS := 0.08

var is_dragging: bool = false
var drag_controlled := false
var drag_offset: Vector2 = Vector2.ZERO
var is_throwing := false
var _position_sync_pending := false
var _position_sync_target := Vector2.ZERO
var _drag_origin := Vector2.ZERO
var _drag_moved := false
var _drag_target := Vector2.ZERO
var _drag_samples: Array[Dictionary] = []
var _release_pending := false
var _release_velocity := Vector2.ZERO
var _saved_damping := 0.0
var _history: History
var _drag_origins: Dictionary[Entity, Vector2] = {}


func _ready() -> void:
	_history = _find_history()
	# 保留 collision_layer 供点击/连线查询，关闭刚体之间的硬碰撞。
	collision_mask = 0


func _on_input_event(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.alt_pressed:
			return
		if event.pressed:
			if int(GraphPreferences.value("left_mode")) != 0:
				return
			# 通过父节点的选择接口交互，避免 Entity 反向依赖引用其子类的 Stage。
			var stage: Node = get_parent()
			if stage != null and not (stage.has_method("select_object") and stage.has_method("selected_objects")):
				stage = null
			if stage != null:
				stage.call("select_object", self, event.ctrl_pressed or event.meta_pressed)
			get_viewport().set_input_as_handled()
			if stage != null and not (stage.get("selected_ids") as PackedStringArray).has(id):
				return
			if _history != null:
				_history.begin_transaction()
			is_dragging = true
			_drag_moved = false
			_drag_origin = global_position
			drag_offset = get_global_mouse_position() - global_position
			_drag_samples.clear()
			_sample_pointer()
			_drag_origins.clear()
			if stage != null:
				for object in stage.call("drag_entities"):
					if object is Entity:
						_drag_origins[object] = object.global_position
			if _drag_origins.is_empty():
				_drag_origins[self] = global_position
			for object in _drag_origins:
				object.stop_throw()
				object.drag_controlled = true
				object._drag_target = object.global_position
				object.linear_velocity = Vector2.ZERO
				object.angular_velocity = 0.0
				object.sleeping = false
			linear_velocity = Vector2.ZERO
			angular_velocity = 0.0
		else:
			finish_drag(true)
		return

	if event is InputEventMouseMotion and is_dragging:
		_update_drag_target()
		get_viewport().set_input_as_handled()


func _input(event: InputEvent) -> void:
	if event is InputEventWithModifiers and event.alt_pressed:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		finish_drag(true)
	elif event is InputEventMouseMotion and is_dragging:
		_update_drag_target()
		get_viewport().set_input_as_handled()


func finish_drag(allow_throw := false) -> void:
	if not is_dragging:
		return
	_update_drag_target()
	var velocity := _pointer_velocity() if _drag_moved and allow_throw and not bool(GraphPreferences.value("snap")) else Vector2.ZERO
	is_dragging = false
	for object in _drag_origins:
		if is_instance_valid(object):
			object.drag_controlled = false
			object._release_pending = _drag_moved
			object._release_velocity = velocity
			object._start_throw(velocity)
	_drag_origins.clear()
	_drag_samples.clear()
	if _history != null:
		_history.commit()


func _physics_process(_delta: float) -> void:
	if is_throwing and linear_velocity.length_squared() < 4.0:
		stop_throw()
	if is_dragging:
		if not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) or not is_visible_in_tree():
			finish_drag()
		elif not Input.is_key_pressed(KEY_ALT):
			_update_drag_target()


func _update_drag_target() -> void:
	_sample_pointer()
	var target_position := get_global_mouse_position() - drag_offset
	if not _drag_moved:
		var screen_delta := get_global_transform_with_canvas().basis_xform(target_position - _drag_origin)
		if screen_delta.length() < 4.0:
			return
		_drag_moved = true
	if GraphPreferences.value("snap"):
		target_position = target_position.snapped(Vector2(64, 64))
	var displacement: Vector2 = target_position - _drag_origin
	for object in _drag_origins:
		if is_instance_valid(object):
			object._drag_target = _drag_origins[object] + displacement
			object.sleeping = false


func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
	if _position_sync_pending:
		var pose := state.transform
		pose.origin = _position_sync_target
		state.transform = pose
		state.linear_velocity = Vector2.ZERO
		_position_sync_pending = false
	# 在物理状态中同步位置，抓取点不再通过弹簧速度追赶鼠标。
	if drag_controlled or _release_pending:
		var pose := state.transform
		pose.origin = _drag_target
		state.transform = pose
		state.linear_velocity = _release_velocity if _release_pending else Vector2.ZERO
		state.angular_velocity = 0.0
		_release_pending = false


func _sample_pointer() -> void:
	var now := float(Time.get_ticks_usec()) / 1000000.0
	_drag_samples.append({"time": now, "position": get_global_mouse_position()})
	while _drag_samples.size() > 2 and float(_drag_samples[1].time) < now - THROW_SAMPLE_SECONDS:
		_drag_samples.pop_front()
	while _drag_samples.size() > 64:
		_drag_samples.pop_front()


func _pointer_velocity() -> Vector2:
	if _drag_samples.size() < 2:
		return Vector2.ZERO
	var last: Dictionary = _drag_samples.back()
	var first: Dictionary = _drag_samples.front()
	var elapsed := float(last.time) - float(first.time)
	if elapsed < 0.008:
		return Vector2.ZERO
	var velocity: Vector2 = (last.position - first.position) / elapsed
	return (velocity * 0.55).limit_length(throw_speed_limit) if velocity.length() >= 25.0 else Vector2.ZERO


func _start_throw(velocity: Vector2) -> void:
	is_throwing = not velocity.is_zero_approx()
	if is_throwing:
		_saved_damping = linear_damp
		linear_damp = throw_damping
	linear_velocity = velocity
	sleeping = false


func stop_throw() -> void:
	if is_throwing:
		linear_damp = _saved_damping
	is_throwing = false
	_release_pending = false
	linear_velocity = Vector2.ZERO
	angular_velocity = 0.0


func _find_history() -> History:
	var node: Node = self
	while node != null:
		var history := node.get_node_or_null("History") as History
		if history != null:
			return history
		node = node.get_parent()
	return null


func is_inside_container(ancestor: Entity) -> bool:
	var cursor := container
	var visited: Array[Entity] = []
	while is_instance_valid(cursor) and not visited.has(cursor):
		if cursor == ancestor:
			return true
		visited.append(cursor)
		cursor = cursor.container
	return false


func container_depth() -> int:
	var cursor := container
	var visited: Array[Entity] = []
	while is_instance_valid(cursor) and not visited.has(cursor):
		visited.append(cursor)
		cursor = cursor.container
	return visited.size()


func pause_drag_for_layer_move() -> void:
	if not is_dragging:
		return
	is_dragging = false
	for object in _drag_origins:
		if is_instance_valid(object):
			object.drag_controlled = false
			object.stop_throw()
	_drag_origins.clear()
	_drag_samples.clear()


func move_without_inertia(world_position: Vector2) -> void:
	stop_throw()
	global_position = world_position
	_position_sync_target = world_position
	_position_sync_pending = true
	sleeping = false
