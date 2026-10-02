extends Node2D

## 用世界坐标边界计算磁性斥力，不启用刚体硬碰撞。
@export var target_root: Node
@export_range(1.0, 128.0) var influence_distance := 64.0
@export_range(1.0, 2000.0) var acceleration := 1200.0
@export_range(1.0, 600.0) var maximum_speed := 240.0
@export_range(1.0, 48.0) var minimum_gap := 12.0
@export_range(0.0, 600.0) var attraction_acceleration := 180.0
@export_range(0.0, 200.0) var attraction_speed := 80.0
@export_range(32.0, 600.0) var attraction_distance := 160.0

var _attraction_pending := false
var _global_layout_requested := false
var _pin_drivers := true
var _drivers: Dictionary[int, bool] = {}
var _local_movable: Dictionary[int, bool] = {}
var _local_edges: Array[LineEdge] = []
var _local_origins: Dictionary[int, Vector2] = {}
var _query_shape := RectangleShape2D.new()
var _query := PhysicsShapeQueryParameters2D.new()

# 用内置哈希表去重，避免求解每个约束时线性扫描已移动节点。
# 保存实例 ID，避免已删除实体作为类型化对象键时导致遍历报错。
var _moved: Dictionary[int, bool] = {}


func _ready() -> void:
	if target_root == null:
		target_root = get_parent()
	# 在拖动节点给出目标速度后统一约束，避免被拖动逻辑覆盖。
	process_physics_priority = 100


func _physics_process(delta: float) -> void:
	_attraction_pending = false
	var history := target_root.get_node_or_null("History") as History
	if not is_visible_in_tree() or not bool(GraphPreferences.value("physics")):
		stop_motion()
		return
	# 只在编辑事务及其收尾阶段移动节点，保留载入和撤销后的布局。
	if history == null or not history.is_transaction_active():
		stop_motion()
		return
	# 历史事务不是重排许可；只运行明确请求的局部或全图布局。
	if _drivers.is_empty() and not _global_layout_requested:
		stop_motion()
		return
	var layer_mover := target_root.get_node_or_null("EntityLayerMover")
	if layer_mover != null and layer_mover.get("_active"):
		stop_motion(true)
		return
	var entries: Array[Dictionary] = []
	var fastest := 0.0
	if not _drivers.is_empty():
		entries = _local_entries(delta)
		for entry in entries:
			if entry.body is Entity:
				fastest = maxf(fastest, entry.body.linear_velocity.length())
	else:
		for child in target_root.get_children():
			if child is Entity and not child is PenStroke and child.is_node_ready() and child.is_visible_in_tree() and not child.is_queued_for_deletion():
				if not child.drag_controlled and not child.is_throwing:
					child.linear_velocity = child.linear_velocity.limit_length(maximum_speed)
				fastest = maxf(fastest, child.linear_velocity.length())
				entries.append({"body": child, "rect": child.aabb, "container": child.container, "weights": {child: 1.0}})
		# The label is a collision surface of its edge, never a separate saved entity.
		# Its motion comes from the endpoints, so distribute forces to those bodies.
		for child in target_root.get_children():
			if child is LineEdge and child.is_node_ready() and not child.is_queued_for_deletion():
				if not is_instance_valid(child.source) or not is_instance_valid(child.target):
					continue
				child.refresh_for_physics()
				var rect: Rect2 = child.caption_rect()
				if not rect.has_area() or not child.is_visible_in_tree():
					continue
				var fraction: float = child.caption_fraction()
				var weights := {child.source: 1.0 - fraction}
				weights[child.target] = weights.get(child.target, 0.0) + fraction
				var container: Entity = child.source.container if child.source.container == child.target.container else null
				entries.append({"body": child, "rect": rect, "container": container, "weights": weights})
	if _drivers.is_empty():
		_apply_link_attraction(entries, delta)
	fastest = maxf(fastest, attraction_speed if _attraction_pending else 0.0)
	for entry in entries:
		entry["mobile"] = entry.weights.keys().any(func(body): return not _held(body))
	entries.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.rect.position.x < b.rect.position.x)
	var pairs: Array[Dictionary] = []
	var pushes: Dictionary[Entity, Vector2] = {}
	for i in entries.size():
		var a: StageObject = entries[i].body
		var a_rect: Rect2 = entries[i].rect
		for j in range(i + 1, entries.size()):
			var b_rect: Rect2 = entries[j].rect
			if b_rect.position.x - a_rect.end.x > influence_distance + fastest * delta * 2.0:
				break
			if not entries[i].mobile and not entries[j].mobile:
				continue
			var b: StageObject = entries[j].body
			# 同层兄弟彼此避让；容器和后代之间不施加排斥。
			if entries[i].container != entries[j].container and not entries[i].weights.has(b) and not entries[j].weights.has(a):
				continue
			# Ancestor containers surround their content by design.
			if a is Entity and b is LineEdge and (b.source.is_inside_container(a) or b.target.is_inside_container(a)):
				continue
			if b is Entity and a is LineEdge and (a.source.is_inside_container(b) or a.target.is_inside_container(b)):
				continue
			var weights := _relative_weights(entries[i].weights, entries[j].weights)
			if weights.is_empty():
				continue
			var separation := _separation(a_rect, b_rect, a.id < b.id)
			# Make room along the edge corridor rather than pushing both endpoints
			# sideways when a wide caption overlaps its own endpoints.
			if entries[i].weights.has(b) or entries[j].weights.has(a):
				var normal := (b_rect.get_center() - a_rect.get_center()).normalized()
				if normal.is_zero_approx():
					normal = Vector2.RIGHT if a.id < b.id else Vector2.LEFT
				separation = {"normal": normal, "distance": (b_rect.get_center() - a_rect.get_center()).dot(normal) - ((a_rect.size + b_rect.size) * 0.5).dot(normal.abs())}
			var distance: float = separation.distance
			if distance > influence_distance + fastest * delta * 2.0:
				continue
			var normal: Vector2 = separation.normal
			pairs.append({"weights": weights, "normal": normal, "distance": distance})
			var weight := clampf(1.0 - maxf(distance, 0.0) / influence_distance, 0.0, 1.0)
			var push := normal * weight * weight
			for body in weights:
				if not _held(body):
					pushes[body] = pushes.get(body, Vector2.ZERO) + push * weights[body]
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
		var corrected := false
		for pair in pairs:
			var normal: Vector2 = pair.normal
			var required_speed: float = minf((minimum_gap - pair.distance) / maxf(delta, 0.0001), maximum_speed)
			var relative_speed := 0.0
			var total := 0.0
			for body in pair.weights:
				var weight: float = pair.weights[body]
				relative_speed += body.linear_velocity.dot(normal) * weight
				total += weight * weight * _mobility(body)
			if relative_speed >= required_speed or total <= 0.0:
				continue
			corrected = true
			var correction := normal * (required_speed - relative_speed) / total
			for body in pair.weights:
				if not _held(body):
					body.sleeping = false
					body.linear_velocity += correction * pair.weights[body]
					_track(body)
		# 整轮没有速度修正，后续轮次的输入相同，可以直接结束。
		if not corrected:
			break
	if not _drivers.is_empty():
		_bound_local_motion(delta)


func _apply_link_attraction(entries: Array[Dictionary], delta: float) -> void:
	if attraction_acceleration <= 0.0 or attraction_speed <= 0.0:
		return
	var adjacent := {}
	var held := {}
	var captions_by_source := {}
	for entry in entries:
		if entry.body is Entity:
			var entity: Entity = entry.body
			if _held(entity) or entity.is_throwing:
				var cursor: Entity = entity
				while is_instance_valid(cursor) and not held.has(cursor):
					held[cursor] = true
					cursor = cursor.container
		elif entry.body is LineEdge:
			var source: Entity = entry.body.source
			if not captions_by_source.has(source): captions_by_source[source] = []
			captions_by_source[source].append(entry)
	for child in target_root.get_children():
		if not child is LineEdge or child.is_queued_for_deletion() or not child.is_visible_in_tree():
			continue
		if not is_instance_valid(child.source) or not is_instance_valid(child.target):
			continue
		var a := child.source as TextNode
		var b := child.target as TextNode
		if a == null or b == null or a == b or a.is_queued_for_deletion() or b.is_queued_for_deletion():
			continue
		if not a.is_visible_in_tree() or not b.is_visible_in_tree():
			continue
		if a.is_inside_container(b) or b.is_inside_container(a):
			continue # Containment is not a spring from a frame to its own contents.
		if not adjacent.has(a): adjacent[a] = {}
		if not adjacent.has(b): adjacent[b] = {}
		adjacent[a][b] = true
		adjacent[b][a] = true
	var visited := {}
	var desired := {}
	var weights := {}
	for start in adjacent:
		if visited.has(start):
			continue
		var members: Array[Entity] = [start]
		visited[start] = true
		var cursor := 0
		while cursor < members.size():
			for neighbor in adjacent[members[cursor]]:
				if not visited.has(neighbor):
					visited[neighbor] = true
					members.append(neighbor)
			cursor += 1
		var common: Entity = members[0].container
		while is_instance_valid(common):
			var shared := true
			for member in members:
				if not member.is_inside_container(common):
					shared = false
					break
			if shared: break
			common = common.container
		var units := {}
		var unit_for := {}
		for member in members:
			var unit := member
			while is_instance_valid(unit.container) and unit.container != common:
				unit = unit.container
			units[unit] = true
			unit_for[member] = unit
		if units.size() < 2:
			continue
		var surfaces: Array[Dictionary] = []
		for unit in units:
			surfaces.append({"rect": unit.aabb, "weights": {unit: 1.0}})
		var component_captions := []
		for member in members:
			component_captions.append_array(captions_by_source.get(member, []))
		for entry in component_captions:
			var edge: LineEdge = entry.body
			if not unit_for.has(edge.source) or not unit_for.has(edge.target):
				continue
			var mapped := {}
			for endpoint in entry.weights:
				var unit: Entity = unit_for[endpoint]
				mapped[unit] = float(mapped.get(unit, 0.0)) + float(entry.weights[endpoint])
			surfaces.append({"rect": entry.rect, "weights": mapped})
		var center := Vector2.ZERO
		for surface in surfaces:
			center += (surface.rect as Rect2).get_center()
		center /= surfaces.size()
		for surface in surfaces:
			var rect: Rect2 = surface.rect
			var offset := center - rect.get_center()
			var rest := maxf(attraction_distance, rect.size.length() * 0.5 + influence_distance)
			var speed := minf(attraction_speed, maxf(0.0, offset.length() - rest) * 0.4)
			var velocity := offset.normalized() * speed
			for unit in surface.weights:
				var weight: float = surface.weights[unit]
				desired[unit] = desired.get(unit, Vector2.ZERO) + velocity * weight
				weights[unit] = float(weights.get(unit, 0.0)) + weight
	for unit in desired:
		if held.has(unit):
			continue
		var target_velocity: Vector2 = (desired[unit] / weights[unit]).limit_length(attraction_speed)
		unit.linear_velocity = unit.linear_velocity.move_toward(target_velocity, attraction_acceleration * delta)
		if not unit.linear_velocity.is_zero_approx():
			unit.sleeping = false
			_track(unit)
		if target_velocity.length_squared() > 0.25:
			_attraction_pending = true


func has_pending_motion() -> bool:
	return _attraction_pending


func _track(body: Entity) -> void:
	_moved[body.get_instance_id()] = true


func _mobility(body: Entity) -> float:
	if _held(body):
		return 0.0
	return 1.0


func _held(body: Entity) -> bool:
	if not _drivers.is_empty() and ((_pin_drivers and _drivers.has(body.get_instance_id())) or not _local_movable.has(body.get_instance_id())):
		return true
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


func stop_motion(keep_scope := false) -> void:
	_attraction_pending = false
	for instance_id in _moved:
		var body := instance_from_id(instance_id) as Entity
		if is_instance_valid(body) and not _held(body) and not body.is_throwing:
			body.linear_velocity = Vector2.ZERO
			body.angular_velocity = 0.0
	_moved.clear()
	if not keep_scope:
		_global_layout_requested = false
		_pin_drivers = true
		_drivers.clear()
		_local_movable.clear()
		_local_edges.clear()
		_local_origins.clear()


func _relative_weights(from: Dictionary, to: Dictionary) -> Dictionary[Entity, float]:
	var weights: Dictionary[Entity, float] = {}
	for body in from:
		weights[body] = -float(from[body])
	for body in to:
		weights[body] = weights.get(body, 0.0) + float(to[body])
	for body in weights.keys():
		if is_zero_approx(weights[body]):
			weights.erase(body)
	return weights


## Scope a pointer gesture to sibling neighbours; never contract its entire graph.
func begin_global_layout() -> void:
	stop_motion()
	_global_layout_requested = true


func begin_local_edit(objects: Array, pin_drivers := true) -> void:
	stop_motion()
	_pin_drivers = pin_drivers
	for object in objects:
		if object is Entity:
			_drivers[object.get_instance_id()] = true
	for child in target_root.get_children():
		if child is LineEdge:
			_local_edges.append(child)
	_query.shape = _query_shape
	_query.collision_mask = 1
	_query.collide_with_areas = false


func _local_entries(delta: float) -> Array[Dictionary]:
	var bodies := {}
	var regions: Array[Rect2] = []
	var sibling_layers := {}
	_local_movable.clear()
	var space := get_world_2d().direct_space_state
	for key in _drivers.keys():
		var driver := instance_from_id(key) as Entity
		if not is_instance_valid(driver) or driver.is_queued_for_deletion():
			_drivers.erase(key)
			continue
		sibling_layers[driver.container] = true
		var rect := driver.aabb
		if driver.drag_controlled:
			var destination := rect
			destination.position += driver._drag_target - driver.global_position
			rect = rect.merge(destination)
		rect = rect.grow(influence_distance + maximum_speed * delta * 2.0)
		regions.append(rect)
		bodies[driver.get_instance_id()] = driver
		_query_shape.size = rect.size.max(Vector2.ONE)
		_query.transform = Transform2D(0.0, rect.get_center())
		for hit in space.intersect_shape(_query, 4096):
			var body: Variant = hit.collider
			if body is Entity and not body is PenStroke and body.get_parent() == target_root and body.container == driver.container and body.is_visible_in_tree() and not body.is_queued_for_deletion():
				bodies[body.get_instance_id()] = body
	for key in bodies:
		_local_movable[key] = true
		if (not _pin_drivers or not _drivers.has(key)) and not _local_origins.has(key):
			_local_origins[key] = bodies[key].global_position
	# Leaving the pointer neighbourhood must not leave passive drift behind.
	for key in _moved.keys():
		if _local_movable.has(key):
			continue
		var body := instance_from_id(key) as Entity
		if is_instance_valid(body) and not body.drag_controlled and not body.is_throwing:
			body.linear_velocity = Vector2.ZERO
			body.angular_velocity = 0.0
		_moved.erase(key)
	var entries: Array[Dictionary] = []
	for key in bodies:
		var body: Entity = bodies[key]
		if not body.drag_controlled and not body.is_throwing:
			body.linear_velocity = body.linear_velocity.limit_length(maximum_speed)
		entries.append({"body": body, "rect": body.aabb, "container": body.container, "weights": {body: 1.0}})
	for edge in _local_edges:
		if not is_instance_valid(edge) or edge.is_queued_for_deletion() or not edge.is_visible_in_tree() or not is_instance_valid(edge.source) or not is_instance_valid(edge.target):
			continue
		if bodies.has(edge.source.get_instance_id()) or bodies.has(edge.target.get_instance_id()):
			edge.refresh_for_physics()
		var container: Entity = edge.source.container if edge.source.container == edge.target.container else null
		if not sibling_layers.has(container) and not bodies.has(edge.source.get_instance_id()) and not bodies.has(edge.target.get_instance_id()):
			continue
		var rect := edge.caption_rect()
		if not rect.has_area() or not regions.any(func(region: Rect2) -> bool: return region.intersects(rect, true)):
			continue
		var fraction := edge.caption_fraction()
		var weights := {edge.source: 1.0 - fraction}
		weights[edge.target] = weights.get(edge.target, 0.0) + fraction
		entries.append({"body": edge, "rect": rect, "container": container, "weights": weights})
	return entries


func _bound_local_motion(delta: float) -> void:
	# Passive avoidance yields at most one influence radius per gesture.
	for key in _local_movable:
		if _drivers.has(key) or not _local_origins.has(key):
			continue
		var body := instance_from_id(key) as Entity
		if not is_instance_valid(body) or _held(body) or body.is_throwing:
			continue
		var offset: Vector2 = body.global_position - _local_origins[key]
		var next := offset + body.linear_velocity * delta
		if next.length_squared() > influence_distance * influence_distance:
			body.linear_velocity = (next.limit_length(influence_distance) - offset) / maxf(delta, 0.0001)
