extends Node2D

## View-only overview with camera and screen-size gates tuned for earlier titles.
## Retain nested group previews beneath covers, while omitting ordinary detail.
@export_range(0.01, 1.0) var camera_scale_threshold := 0.45
@export_range(0.01, 1.0) var viewport_size_ratio := 0.15

const Corners = preload("res://src/main/continuous_corners.gd")
const TITLE_FONT_SIZE := 64

@onready var _template: Panel = $SummaryTemplate
var _active: Dictionary = {}
var _hidden: Dictionary = {}
var _suppressed: Dictionary = {}
var _summaries: Dictionary = {}
var _refresh_key: Array = []
var _layout_revision := -1
var _objects: Array = []
var _groups: Array = []
var _levels: Dictionary = {}
var _blocked: Dictionary = {}
var _group_rects: Dictionary = {}
var _gate_key: Array = []
var _zoom_gates: Array[float] = []
var _membership_key: Array = []
var _cover_groups: Dictionary = {}


func _ready() -> void:
	# Layout, camera and edge geometry run first. Never affect physics visibility.
	process_priority = 50


func _process(_delta: float) -> void:
	refresh()


func is_hidden(object: StageObject) -> bool:
	# Covered details are omitted and cannot be picked through the overview.
	return _hidden.has(object.get_instance_id())


func is_active(group: TextNode) -> bool:
	return _active.has(group.get_instance_id())


func outline_for(group: TextNode) -> PackedVector2Array:
	var panel := _summaries.get(group.get_instance_id()) as Panel
	if panel == null:
		return group.get_visual_outline()
	var style := Corners.source(panel.get_theme_stylebox("panel"))
	var points := Corners.outline(Rect2(Vector2.ZERO, panel.size), float(style.corner_radius_top_left))
	for index in points.size():
		points[index] = group.to_local(panel.get_global_transform() * points[index])
	return points


func covers_point(world_point: Vector2) -> bool:
	for key in _active:
		if not _hidden.has(key) and is_instance_valid(_active[key]) and _active[key].aabb.has_point(world_point):
			return true
	return false


func invalidate() -> void:
	_refresh_key.clear()
	_layout_revision = -1


func refresh() -> void:
	var stage := get_parent()
	var camera: Camera2D = stage.camera
	var viewport_size := get_viewport_rect().size
	var viewport_side := maxf(viewport_size.x, viewport_size.y)
	var normalized_zoom: float = camera.zoom.x / camera.REFERENCE_ZOOM
	if normalized_zoom > camera_scale_threshold and _suppressed.is_empty():
		return
	var revision: int = stage.layout_revision
	var refresh_key := [revision, camera.zoom, viewport_size, stage.world_view_rect, camera_scale_threshold, viewport_size_ratio]
	if refresh_key == _refresh_key:
		return
	_refresh_key = refresh_key
	var layout_changed := _layout_revision != revision
	if layout_changed:
		_layout_revision = revision
		_objects = stage.stage_objects()
		_groups = _objects.filter(func(object): return object is TextNode and object._container_active and object.is_visible_in_tree())
		_levels = _group_levels(_objects)
		_group_rects.clear()
		for group in _groups:
			_group_rects[group.get_instance_id()] = group.aabb
		_blocked.clear()
		# Native editing must reveal its own group and ancestors.
		for object in _objects:
			if object is TextNode and object._editing:
				_block_ancestors(object, _blocked)
			elif object is LineEdge and object.get_node("Caption")._editing:
				if is_instance_valid(object.source):
					_block_ancestors(object.source, _blocked)
				if is_instance_valid(object.target):
					_block_ancestors(object.target, _blocked)
		_cache_cover_groups()
	var gate_key := [revision, viewport_size, camera_scale_threshold, viewport_size_ratio]
	if gate_key != _gate_key:
		_gate_key = gate_key
		_zoom_gates.clear()
		for group in _groups:
			var level: int = _levels.get(group.get_instance_id(), 0)
			var side: float = maxf(_group_rects[group.get_instance_id()].size.x, _group_rects[group.get_instance_id()].size.y)
			var limit := minf(camera_scale_threshold * camera.REFERENCE_ZOOM,
				maxf(0.20, camera_scale_threshold - 0.05 * level) * camera.REFERENCE_ZOOM)
			_zoom_gates.append(minf(limit, viewport_side * minf(0.75, viewport_size_ratio + 0.20 * level) / maxf(side, 0.001)))
		_zoom_gates.sort()
	var membership_key := [gate_key, _zoom_gates.bsearch(camera.zoom.x)]
	if not layout_changed and membership_key == _membership_key and not _zoom_gates.has(camera.zoom.x):
		for key in _active:
			_update_summary(_active[key], _summaries[key])
		return
	_membership_key = membership_key
	var objects: Array = _objects
	var levels := _levels
	var blocked := _blocked
	var previous_active := _active.duplicate()
	_active.clear()
	if normalized_zoom <= camera_scale_threshold:
		for object in _groups:
			var key: int = object.get_instance_id()
			var screen_size: Vector2 = (_group_rects[key] as Rect2).size * camera.zoom
			var level: int = levels.get(key, 0)
			# Reveal inner titles first, then allow larger outer frames to take over.
			var zoom_limit := maxf(0.20, camera_scale_threshold - 0.05 * level)
			var size_limit := minf(0.75, viewport_size_ratio + 0.20 * level)
			if not blocked.has(key) and normalized_zoom <= zoom_limit and maxf(screen_size.x, screen_size.y) < viewport_side * size_limit:
				_active[key] = object

	# A visible outer overview represents its contents through group previews.
	# Descendant groups must not fall back to tiny headers just because their
	# independent screen-size gate has not been reached yet.
	for object in _groups:
		if object is TextNode:
			var key: int = object.get_instance_id()
			if not blocked.has(key) and not _active_ancestors(object).is_empty():
				_active[key] = object

	# Camera-only scaling normally keeps the same group membership and input.
	if not layout_changed and previous_active == _active:
		for key in _active:
			_update_summary(_active[key], _summaries[key])
		return

	_hidden.clear()
	for key in _cover_groups:
		for ancestor in _cover_groups[key]:
			if _active.has(ancestor):
				_hidden[key] = true
				break

	var wanted: Dictionary = _hidden.duplicate()
	for key in _active:
		wanted[key] = true
	for key in _suppressed.keys():
		if not wanted.has(key):
			_restore(key)
	for object in objects:
		var key: int = object.get_instance_id()
		if wanted.has(key):
			if not _suppressed.has(key):
				var items: Array[Dictionary] = []
				_suppress_canvas(object, items)
				_suppressed[key] = {"object": object, "items": items, "pickable": object.input_pickable}
				for item in items:
					item.node.visibility_layer = 0
					if object is LineEdge and item.node != object:
						item.node.z_index = 0
			object.input_pickable = not _hidden.has(key) and bool(_suppressed[key].pickable)

	for key in _summaries.keys():
		if not _active.has(key):
			_summaries[key].queue_free()
			_summaries.erase(key)
	for key in _active:
		var group: TextNode = _active[key]
		var panel := _summaries.get(key) as Panel
		if panel == null:
			panel = _template.duplicate() as Panel
			panel.name = "Summary_" + group.id
			add_child(panel)
			panel.gui_input.connect(_on_summary_input.bind(group))
			_summaries[key] = panel

		panel.mouse_filter = Control.MOUSE_FILTER_IGNORE if _hidden.has(key) else Control.MOUSE_FILTER_STOP
		panel.get_node("Title").mouse_filter = Control.MOUSE_FILTER_IGNORE
		_update_summary(group, panel)

	# All covers share the same foreground layer. Draw descendants first,
	# then overlay their ancestors, independent of creation or restore order.
	var summary_keys := _active.keys()
	summary_keys.sort_custom(func(a: int, b: int) -> bool: return int(levels.get(a, 0)) < int(levels.get(b, 0)))
	var first_index := get_child_count() - summary_keys.size()
	for index in summary_keys.size():
		var panel: Panel = _summaries[summary_keys[index]]
		if panel.get_index() != first_index + index:
			move_child(panel, first_index + index)


func _group_levels(objects: Array) -> Dictionary:
	var levels := {}
	for object in objects:
		if not object is TextNode or not object._container_active:
			continue
		var current: Entity = object
		var level := 0
		var visited := {}
		while is_instance_valid(current) and not visited.has(current.get_instance_id()):
			var key := current.get_instance_id()
			visited[key] = true
			levels[key] = maxi(int(levels.get(key, 0)), level)
			current = current.container
			level += 1
	return levels


func _block_ancestors(entity: Entity, blocked: Dictionary) -> void:
	var current := entity
	var visited: Dictionary = {}
	while is_instance_valid(current) and not visited.has(current.get_instance_id()):
		var key := current.get_instance_id()
		visited[key] = true
		blocked[key] = true
		current = current.container


func _active_ancestors(entity: Entity) -> Array:
	var ancestors: Array = []
	var visited: Dictionary = {}
	var current := entity.container
	while is_instance_valid(current) and not visited.has(current.get_instance_id()):
		var key := current.get_instance_id()
		visited[key] = true
		if _active.has(key):
			ancestors.append(key)
		current = current.container
	return ancestors


func _suppress_canvas(node: Node, items: Array[Dictionary]) -> void:
	if node is CanvasItem:
		var state := {"node": node, "layer": node.visibility_layer, "z_index": node.z_index}
		if node is Control:
			state["mouse_filter"] = node.mouse_filter
			node.mouse_filter = Control.MOUSE_FILTER_IGNORE
		items.append(state)
	for child in node.get_children():
		_suppress_canvas(child, items)


func _restore(key: int) -> void:
	var state: Dictionary = _suppressed[key]
	for item in state.items:
		if not is_instance_valid(item.node):
			continue
		item.node.visibility_layer = item.layer
		item.node.z_index = item.z_index
		if item.has("mouse_filter"):
			item.node.mouse_filter = item.mouse_filter
	if is_instance_valid(state.object):
		state.object.input_pickable = state.pickable
	if is_instance_valid(state.object) and state.object is LineEdge:
		state.object._queue_refresh()
		state.object.get_node("Caption")._queue_refresh()
	_suppressed.erase(key)


func _exit_tree() -> void:
	for key in _suppressed.keys():
		_restore(key)


func _update_summary(group: TextNode, panel: Panel) -> void:
	var revision: int = get_parent().layout_revision
	var data: Dictionary = panel.get_meta("summary_data", {})
	if data.get("revision", -1) == revision and not get_parent().world_view_rect.intersects(data.rect, true):
		return
	if data.get("revision", -1) != revision:
		var light: bool = group._display_theme_is_light()
		data = {"revision": revision, "rect": group.aabb, "text": group.text,
			"font": group.label.get_theme_font("font"),
			"foreground": group.label.get_theme_color("font_color"),
			"background": group.display_background_color(light), "border": group.display_border_color()}
		panel.set_meta("summary_data", data)
	var rect: Rect2 = data.rect
	var actual_scale := maxf(get_global_transform_with_canvas().get_scale().x, 0.01)
	var offset := float(posmod(group.id.hash(), 16)) / 16.0
	var pixel_scale := pow(2.0, (floorf(log(actual_scale) / log(2.0) * 16.0 + offset) - offset) / 16.0)
	var title := panel.get_node("Title") as Label
	title.visible = maxf(rect.size.x, rect.size.y) * actual_scale >= 20.0
	var summary_key := [revision, pixel_scale]
	if panel.get_meta("summary_key", []) == summary_key:
		return
	panel.set_meta("summary_key", summary_key)
	# As in master, skip title drawing below 20 screen pixels.
	panel.show()
	var panel_position := to_local(rect.position)
	if panel.position != panel_position:
		panel.position = panel_position
	# Keep style geometry in viewport pixels so zoom cannot flatten the corners.
	var panel_scale := Vector2.ONE / pixel_scale
	var panel_size := rect.size * pixel_scale
	if panel.scale != panel_scale:
		panel.scale = panel_scale
	if panel.size != panel_size:
		panel.size = panel_size
	panel.z_index = 66 # Translucent cover above detail; external captions remain above it.
	title.text = data.text
	var title_font: Font = data.font
	var title_color: Color = data.foreground
	if title.get_theme_font("font") != title_font:
		title.add_theme_font_override("font", title_font)
	if title.get_theme_color("font_color") != title_color:
		title.add_theme_color_override("font_color", title_color)
	var font := title.get_theme_font("font")
	var measure_key := [data.text, font]
	if panel.get_meta("measure_key", []) != measure_key:
		var measured := font.get_multiline_string_size(data.text, HORIZONTAL_ALIGNMENT_LEFT, -1, TITLE_FONT_SIZE).max(Vector2.ONE)
		title.size = measured
		panel.set_meta("measure_key", measure_key)
	var measured := title.size
	title.scale = Vector2.ONE * minf(panel.size.x * 0.85 / measured.x, panel.size.y * 0.75 / measured.y)
	title.position = (panel.size - title.size * title.scale) * 0.5
	var background: Color = data.background
	background.a = 0.5
	var radius := Corners.fitted_radius(panel.size, minf(12.0, minf(panel.size.x, panel.size.y) * 0.25), 2.0)
	var style_key := [background, data.border, radius]
	if panel.get_meta("style_key", []) != style_key:
		var style := StyleBoxFlat.new()
		style.bg_color = background
		style.border_color = data.border
		style.set_border_width_all(2)
		panel.add_theme_stylebox_override("panel", Corners.style(style, radius, true, true))
		panel.set_meta("style_key", style_key)


func _on_summary_input(event: InputEvent, group: TextNode) -> void:
	if not is_instance_valid(group) or is_hidden(group):
		return
	group._on_label_gui_input(event)
	# A double click opens the normal editor at its original, stable position.
	if group._editing:
		refresh()


func _cache_cover_groups() -> void:
	_cover_groups.clear()
	for object in _objects:
		if not object is Entity:
			continue
		var ancestors: Array[int] = []
		var current: Entity = object.container
		while is_instance_valid(current) and not ancestors.has(current.get_instance_id()):
			ancestors.append(current.get_instance_id())
			current = current.container
		_cover_groups[object.get_instance_id()] = ancestors
	for object in _objects:
		if not object is LineEdge or not is_instance_valid(object.source) or not is_instance_valid(object.target):
			continue
		var from_groups: Array = _cover_groups.get(object.source.get_instance_id(), []).duplicate()
		var to_groups: Array = _cover_groups.get(object.target.get_instance_id(), []).duplicate()
		from_groups.append(object.source.get_instance_id())
		to_groups.append(object.target.get_instance_id())
		_cover_groups[object.get_instance_id()] = from_groups.filter(func(key): return to_groups.has(key))
