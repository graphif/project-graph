extends Node2D

## View-only overview with camera and screen-size gates tuned for earlier titles.
## Preserve detail beneath a translucent title cover; only block its interaction.
@export_range(0.01, 1.0) var camera_scale_threshold := 0.60
@export_range(0.01, 1.0) var viewport_size_ratio := 0.30

const Corners = preload("res://src/main/continuous_corners.gd")
const TITLE_FONT_SIZE := 64

@onready var _template: Panel = $SummaryTemplate
var _active: Dictionary = {}
var _hidden: Dictionary = {}
var _suppressed: Dictionary = {}
var _summaries: Dictionary = {}


func _ready() -> void:
	# Layout, camera and edge geometry run first. Never affect physics visibility.
	process_priority = 50


func _process(_delta: float) -> void:
	refresh()


func is_hidden(object: StageObject) -> bool:
	# Covered details remain drawn, but cannot be selected through the overview.
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


func refresh() -> void:
	var stage := get_parent()
	var camera: Camera2D = stage.camera
	var viewport_size := get_viewport_rect().size
	var viewport_side := maxf(viewport_size.x, viewport_size.y)
	var normalized_zoom: float = camera.zoom.x / camera.REFERENCE_ZOOM
	if normalized_zoom > camera_scale_threshold and _suppressed.is_empty():
		return
	var objects: Array = stage.stage_objects()
	var blocked: Dictionary = {}
	# Programmatic edit commands must reveal the original editor and its ancestors.
	# Zooming itself is already suspended while a native text editor has focus.
	for object in objects:
		if object is TextNode and object._editing:
			_block_ancestors(object, blocked)
		elif object is LineEdge and object.get_node("Caption")._editing:
			if is_instance_valid(object.source):
				_block_ancestors(object.source, blocked)
			if is_instance_valid(object.target):
				_block_ancestors(object.target, blocked)
	_active.clear()
	if normalized_zoom <= camera_scale_threshold:
		for object in objects:
			if not object is TextNode or not object._container_active or not object.is_visible_in_tree():
				continue
			var key: int = object.get_instance_id()
			var screen_size: Vector2 = object.aabb.size * camera.zoom
			if not blocked.has(key) and maxf(screen_size.x, screen_size.y) < viewport_side * viewport_size_ratio:
				_active[key] = object

	var ancestors: Dictionary = {}
	for object in objects:
		if object is Entity:
			ancestors[object.get_instance_id()] = _active_ancestors(object)
	_hidden.clear()
	for object in objects:
		var key: int = object.get_instance_id()
		if object is Entity:
			if not (ancestors[key] as Array).is_empty():
				_hidden[key] = true
		elif object is LineEdge and is_instance_valid(object.source) and is_instance_valid(object.target):
			var from_groups: Array = ancestors.get(object.source.get_instance_id(), []).duplicate()
			var to_groups: Array = ancestors.get(object.target.get_instance_id(), []).duplicate()
			# A group-to-member relation is internal too, even though a group
			# is not its own ancestor in the persistent containment tree.
			if _active.has(object.source.get_instance_id()):
				from_groups.append(object.source.get_instance_id())
			if _active.has(object.target.get_instance_id()):
				to_groups.append(object.target.get_instance_id())
			for group_key in from_groups:
				if to_groups.has(group_key):
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
			object.input_pickable = not _hidden.has(key) and bool(_suppressed[key].pickable)
			var replace_group: bool = _active.has(key) and not _hidden.has(key)
			for item in _suppressed[key].items:
				if not is_instance_valid(item.node):
					continue
				# Only replace the visible group's old frame/title. Its members
				# stay rendered below the 50% cover, including nested groups.
				var layer: int = 0 if replace_group else item.layer
				if item.node.visibility_layer != layer:
					item.node.visibility_layer = layer
				if object is LineEdge and item.node != object and item.node.z_index != 0:
					item.node.z_index = 0 # Internal captions belong beneath the cover too.

	for key in _summaries.keys():
		if not _active.has(key) or _hidden.has(key):
			_summaries[key].queue_free()
			_summaries.erase(key)
	for key in _active:
		if _hidden.has(key):
			continue
		var group: TextNode = _active[key]
		var panel := _summaries.get(key) as Panel
		if panel == null:
			panel = _template.duplicate() as Panel
			panel.name = "Summary_" + group.id
			add_child(panel)
			panel.gui_input.connect(_on_summary_input.bind(group))
			_summaries[key] = panel
		_update_summary(group, panel)


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
	_suppressed.erase(key)


func _exit_tree() -> void:
	for key in _suppressed.keys():
		_restore(key)


func _update_summary(group: TextNode, panel: Panel) -> void:
	var rect := group.aabb
	var pixel_scale := maxf(get_global_transform_with_canvas().get_scale().x, 0.01)
	var summary_key := [rect, pixel_scale, group.text, group.label.get_theme_font("font"), group.label.get_theme_color("font_color"), group.display_background_color(group._display_theme_is_light()), group.display_border_color()]
	if panel.get_meta("summary_key", []) == summary_key:
		return
	panel.set_meta("summary_key", summary_key)
	var screen_side := maxf(rect.size.x, rect.size.y) * pixel_scale
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
	var title := panel.get_node("Title") as Label
	title.visible = screen_side >= 20.0
	title.text = group.text
	var title_font := group.label.get_theme_font("font")
	var title_color := group.label.get_theme_color("font_color")
	if title.get_theme_font("font") != title_font:
		title.add_theme_font_override("font", title_font)
	if title.get_theme_color("font_color") != title_color:
		title.add_theme_color_override("font_color", title_color)
	var font := title.get_theme_font("font")
	var measure_key := [group.text, font]
	if panel.get_meta("measure_key", []) != measure_key:
		var measured := font.get_multiline_string_size(group.text, HORIZONTAL_ALIGNMENT_LEFT, -1, TITLE_FONT_SIZE).max(Vector2.ONE)
		title.size = measured
		panel.set_meta("measure_key", measure_key)
	var measured := title.size
	title.scale = Vector2.ONE * minf(panel.size.x * 0.85 / measured.x, panel.size.y * 0.75 / measured.y)
	title.position = (panel.size - title.size * title.scale) * 0.5
	var light: bool = group._display_theme_is_light()
	var background := group.display_background_color(light)
	background.a = 0.5
	var radius := Corners.fitted_radius(panel.size, minf(12.0, minf(panel.size.x, panel.size.y) * 0.25), 2.0)
	var style_key := [background, group.display_border_color(), radius]
	if panel.get_meta("style_key", []) != style_key:
		var style := StyleBoxFlat.new()
		style.bg_color = background
		style.border_color = group.display_border_color()
		style.set_border_width_all(2)
		panel.add_theme_stylebox_override("panel", Corners.style(style, radius, true, true))
		panel.set_meta("style_key", style_key)


func _on_summary_input(event: InputEvent, group: TextNode) -> void:
	if not is_instance_valid(group):
		return
	group._on_label_gui_input(event)
	# A double click opens the normal editor at its original, stable position.
	if group._editing:
		refresh()
