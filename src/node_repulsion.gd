extends Node2D

## 用世界坐标边界计算磁性斥力，不启用刚体硬碰撞。
@export var target_root: Node
@export_range(1.0, 128.0) var influence_distance := 64.0
@export_range(1.0, 2000.0) var acceleration := 1200.0
@export_range(1.0, 600.0) var maximum_speed := 240.0
@export_range(1.0, 48.0) var minimum_gap := 12.0

var _moved: Array[Entity] = []


func _ready() -> void:
	if target_root == null:
		target_root = get_parent()
	# 在拖动节点给出目标速度后统一约束，避免被拖动逻辑覆盖。
	process_physics_priority = 100


func _physics_process(delta: float) -> void:
	var history := target_root.get_node_or_null("History") as History
	if not is_visible_in_tree() or not bool(GraphPreferences.value("physics")):
		stop_motion()
		return
	# 只在编辑事务及其收尾阶段移动节点，保留载入和撤销后的布局。
	if history == null or not history.is_transaction_active():
		stop_motion()
		return
	var layer_mover := target_root.get_node_or_null("EntityLayerMover")
	if layer_mover != null and layer_mover.get("_active"):
		stop_motion()
		return
	var entries: Array[Dictionary] = []
	var fastest := 0.0
	for child in target_root.get_children():
		if child is Entity and not child is PenStroke and child.is_node_ready() and child.is_visible_in_tree() and not child.is_queued_for_deletion():
			if not child.drag_controlled and not child.is_throwing:
				child.linear_velocity = child.linear_velocity.limit_length(maximum_speed)
			fastest = maxf(fastest, child.linear_velocity.length())
			entries.append({"body": child, "rect": child.aabb})
	entries.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.rect.position.x < b.rect.position.x)
	var pairs: Array[Dictionary] = []
	var pushes: Dictionary[Entity, Vector2] = {}
	for i in entries.size():
		var a: Entity = entries[i].body
		var a_rect: Rect2 = entries[i].rect
		for j in range(i + 1, entries.size()):
			var b_rect: Rect2 = entries[j].rect
			if b_rect.position.x - a_rect.end.x > influence_distance + fastest * delta * 2.0:
				break
			var b: Entity = entries[j].body
			# 同层兄弟彼此避让；容器和后代之间不施加排斥。
			if a.container != b.container:
				continue
			if a.drag_controlled and b.drag_controlled:
				continue
			var separation := _separation(a_rect, b_rect, a.id < b.id)
			var distance: float = separation.distance
			if distance > influence_distance + fastest * delta * 2.0:
				continue
			var normal: Vector2 = separation.normal
			pairs.append({"a": a, "b": b, "normal": normal, "distance": distance})
			var weight := clampf(1.0 - maxf(distance, 0.0) / influence_distance, 0.0, 1.0)
			var push := normal * weight * weight
			if not _held(a):
				pushes[a] = pushes.get(a, Vector2.ZERO) - push
			if not _held(b):
				pushes[b] = pushes.get(b, Vector2.ZERO) + push
	for body in pushes:
		var push: Vector2 = pushes[body]
		if push.length_squared() < 0.0001:
			continue
		body.sleeping = false
		body.linear_velocity += push.limit_length(1.0) * acceleration * delta
		body.linear_velocity = body.linear_velocity.limit_length(body.throw_speed_limit if body.is_throwing else maximum_speed)
		_track(body)
	# 约束下一物理步的接近速度。拖动者优先跟手，邻居承担大部分让位。
	# 多轮处理可将推力沿紧密排列的节点传递，避免只推开第一块。
	for iteration in 6:
		for pair in pairs:
			var a: Entity = pair.a
			var b: Entity = pair.b
			var normal: Vector2 = pair.normal
			var required_speed: float = minf((minimum_gap - pair.distance) / maxf(delta, 0.0001), maximum_speed)
			var relative_speed := (b.linear_velocity - a.linear_velocity).dot(normal)
			if relative_speed >= required_speed:
				continue
			var a_weight := _mobility(a)
			var b_weight := _mobility(b)
			var total := a_weight + b_weight
			if total <= 0:
				continue
			var correction := normal * (required_speed - relative_speed)
			if a_weight > 0:
				a.sleeping = false
				a.linear_velocity -= correction * a_weight / total
				_track(a)
			if b_weight > 0:
				b.sleeping = false
				b.linear_velocity += correction * b_weight / total
				_track(b)


func _track(body: Entity) -> void:
	if not _moved.has(body):
		_moved.append(body)


func _mobility(body: Entity) -> float:
	if _held(body):
		return 0.0
	return 1.0


func _held(body: Entity) -> bool:
	return body.freeze or body.drag_controlled or body.is_dragging or (body is TextNode and body.text_edit.visible)


func _separation(a: Rect2, b: Rect2, first_before_second: bool) -> Dictionary:
	var centers := b.get_center() - a.get_center()
	var gap := Vector2(
		maxf(maxf(b.position.x - a.end.x, a.position.x - b.end.x), 0.0),
		maxf(maxf(b.position.y - a.end.y, a.position.y - b.end.y), 0.0)
	)
	var distance := gap.length()
	if distance > 0.001:
		return {"normal": Vector2(gap.x * signf(centers.x), gap.y * signf(centers.y)).normalized(), "distance": distance}
	var overlap := (a.size + b.size) * 0.5 - centers.abs()
	var fallback := 1.0 if first_before_second else -1.0
	if overlap.x < overlap.y:
		return {"normal": Vector2(signf(centers.x) if absf(centers.x) > 0.001 else fallback, 0), "distance": -overlap.x}
	return {"normal": Vector2(0, signf(centers.y) if absf(centers.y) > 0.001 else fallback), "distance": -overlap.y}


func stop_motion() -> void:
	for body in _moved:
		if is_instance_valid(body) and not _held(body) and not body.is_throwing:
			body.linear_velocity = Vector2.ZERO
			body.angular_velocity = 0.0
	_moved.clear()
