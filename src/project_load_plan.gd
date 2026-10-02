extends RefCounted
## Document-specific ordering only; native arrays/dictionaries hold the graph.


static func build(graph: Dictionary, viewport_size: Vector2 = Vector2(1280, 719), default_zoom: float = 2.0) -> Dictionary:
	var objects: Array = graph.get("objects", [])
	var records := {}
	var unordered := []
	var positions := {}
	var neighbors := {}
	var incident := {}
	var edges := []
	var group_ids := {}
	var parents := {}
	var rects := {}
	var bounds := Rect2()
	var has_bounds := false
	for record in objects:
		if not record is Dictionary:
			continue
		var props: Dictionary = record.get("properties", {})
		var identifier := str(JSON.to_native(props.get("id", JSON.from_native(""))))
		if identifier.is_empty() or records.has(identifier):
			unordered.append({"record": record, "reverse": false})
			continue
		records[identifier] = record
		if record.get("type") == "line_edge":
			edges.append(identifier)
			continue
		var xy: Array = record.get("transform", {}).get("position", [0.0, 0.0])
		var point := Vector2(float(xy[0]), float(xy[1]))
		positions[identifier] = point
		neighbors[identifier] = []
		incident[identifier] = []
		var size := Vector2(80, 72)
		var asset_size: Variant = props.get("asset_size")
		if asset_size is Array and asset_size.size() == 2:
			size = Vector2(float(asset_size[0]), float(asset_size[1]))
		var width: Variant = props.get("fixed_width")
		if width is float or width is int:
			size.x = maxf(size.x, float(width))
		var rect := Rect2(point, size)
		bounds = bounds.merge(rect) if has_bounds else rect
		has_bounds = true
	for identifier in edges:
		var props: Dictionary = records[identifier].get("properties", {})
		var source := reference_id(props.get("source"))
		var target := reference_id(props.get("target"))
		if neighbors.has(source) and neighbors.has(target):
			neighbors[source].append(target)
			neighbors[target].append(source)
			incident[source].append(identifier)
			incident[target].append(identifier)
	for identifier in positions:
		var props: Dictionary = records[identifier].get("properties", {})
		for property in ["container", "topic_parent"]:
			var parent := reference_id(props.get(property))
			if neighbors.has(parent) and parent != identifier:
				neighbors[identifier].append(parent)
				neighbors[parent].append(identifier)
	var camera_xy: Variant = graph.get("camera", {}).get("position")
	var center := bounds.get_center()
	var font := TextNode._make_canvas_font(preload("res://assets/fonts/PingFang-SC-Regular.ttf"))
	for identifier in positions:
		var record: Dictionary = records[identifier]
		var props: Dictionary = record.get("properties", {})
		var parent := reference_id(props.get("container"))
		if records.has(parent):
			parents[identifier] = parent
			group_ids[parent] = true
		var transform_data: Dictionary = record.get("transform", {})
		var size := Vector2(80, 72)
		var origin := Vector2.ZERO
		if record.get("type") == "text_node":
			var text: String = str(JSON.to_native(props.get("text", JSON.from_native(""))))
			var font_size := int(JSON.to_native(props.get("font_size", JSON.from_native(24))))
			var metrics := font.get_multiline_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
			size = Vector2(maxf(float(props.get("fixed_width", 0)), ceilf(metrics.x) + 62.0),
				(ceilf(font.get_height(font_size)) + 3.0) * maxi(1, text.split("\n").size()) + 20.0)
			origin = -size * 0.5
		elif record.get("type") == "legacy_asset":
			var dimensions: Array = props.get("asset_size", [100.0, 100.0])
			size = Vector2(float(dimensions[0]), float(dimensions[1]))
		elif record.get("type") == "pen_stroke":
			var points: Variant = JSON.to_native(props.get("points"))
			if points is PackedVector2Array and not points.is_empty():
				var pen_rect := Rect2(points[0], Vector2.ZERO)
				for point in points:
					pen_rect = pen_rect.expand(point)
				origin = pen_rect.position
				size = pen_rect.size
		var scale_xy: Array = transform_data.get("scale", [1.0, 1.0])
		var transform := Transform2D(float(transform_data.get("rotation", 0)), Vector2(float(scale_xy[0]), float(scale_xy[1])), 0.0, positions[identifier])
		rects[identifier] = transform * Rect2(origin, size)
	var depths := {}
	for identifier in positions:
		var cursor_id: String = identifier
		var visited_parents := {}
		var depth := 0
		while parents.has(cursor_id) and not visited_parents.has(cursor_id):
			visited_parents[cursor_id] = true
			cursor_id = parents[cursor_id]
			depth += 1
		depths[identifier] = depth
	var group_order := group_ids.keys()
	group_order.sort_custom(func(a: String, b: String) -> bool: return int(depths.get(a, 0)) > int(depths.get(b, 0)))
	for identifier in group_order:
		var members := Rect2()
		var initialized := false
		for child in parents:
			if parents[child] == identifier:
				members = members.merge(rects[child]) if initialized else rects[child]
				initialized = true
		var title_rect: Rect2 = rects[identifier]
		members = members.grow(30.0)
		members.position.y -= title_rect.size.y
		members.size.y += title_rect.size.y
		members.size.x = maxf(members.size.x, title_rect.size.x)
		rects[identifier] = members
	if not rects.is_empty():
		bounds = rects.values()[0]
		for rect in rects.values():
			bounds = bounds.merge(rect)
		center = bounds.get_center()
	if camera_xy is Array and camera_xy.size() == 2:
		center = Vector2(float(camera_xy[0]), float(camera_xy[1]))
	var seeds := positions.keys()
	seeds.sort_custom(func(a: String, b: String) -> bool:
		var distance_a: float = positions[a].distance_squared_to(center)
		var distance_b: float = positions[b].distance_squared_to(center)
		return a < b if is_equal_approx(distance_a, distance_b) else distance_a < distance_b)
	var visited := {}
	var emitted := {}
	var ordered := []
	for seed in seeds:
		if visited.has(seed):
			continue
		var queue := [seed]
		visited[seed] = true
		var cursor := 0
		while cursor < queue.size():
			var identifier: String = queue[cursor]
			cursor += 1
			ordered.append({"record": records[identifier], "reverse": false})
			emitted[identifier] = true
			for edge_id in incident[identifier]:
				if emitted.has(edge_id):
					continue
				var props: Dictionary = records[edge_id].properties
				var source: String = str(props.source.get("$ref", ""))
				var target: String = str(props.target.get("$ref", ""))
				if emitted.has(source) and emitted.has(target):
					ordered.append({"record": records[edge_id], "reverse": identifier == source})
					emitted[edge_id] = true
			for neighbor in neighbors[identifier]:
				if not visited.has(neighbor):
					visited[neighbor] = true
					queue.append(neighbor)
	# Unresolved/unsupported records still follow ordinary restore semantics.
	for identifier in records:
		if not emitted.has(identifier):
			ordered.append({"record": records[identifier], "reverse": false})
	# Groups must exist before their members so overview masks apply on first draw.
	var group_entries := []
	var detail_entries := []
	for entry in ordered:
		var identifier := str(JSON.to_native(entry.record.properties.get("id", JSON.from_native(""))))
		if group_ids.has(identifier):
			group_entries.append(entry)
		else:
			detail_entries.append(entry)
	group_entries.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var id_a := str(JSON.to_native(a.record.properties.id))
		var id_b := str(JSON.to_native(b.record.properties.id))
		if depths.get(id_a, 0) != depths.get(id_b, 0):
			return int(depths.get(id_a, 0)) < int(depths.get(id_b, 0))
		return rects[id_a].get_center().distance_squared_to(center) < rects[id_b].get_center().distance_squared_to(center))
	var levels := {}
	for identifier in group_ids:
		var current: String = identifier
		var level := 0
		var seen := {}
		while group_ids.has(current) and not seen.has(current):
			seen[current] = true
			levels[current] = maxi(int(levels.get(current, 0)), level)
			current = parents.get(current, "")
			level += 1
	var available := viewport_size - Vector2(160, 140)
	var zoom := float(graph.get("camera", {}).get("zoom", clampf(minf(available.x / maxf(bounds.size.x, 1),
		available.y / maxf(bounds.size.y, 1)), 0.02, 3.0)))
	if graph.has("camera") and not graph.camera.has("zoom"):
		zoom = default_zoom
	var active_groups := {}
	for identifier in group_ids:
		var side: float = maxf(rects[identifier].size.x, rects[identifier].size.y)
		var level: int = int(levels.get(identifier, 0))
		if zoom / 2.0 <= maxf(0.20, 0.45 - 0.05 * level) and side * zoom < maxf(viewport_size.x, viewport_size.y) * minf(0.75, 0.15 + 0.20 * level):
			active_groups[identifier] = true
	var covering := {}
	for identifier in positions:
		var ancestors := []
		var current: String = parents.get(identifier, "")
		var seen := {}
		while parents.has(current) or group_ids.has(current):
			if seen.has(current):
				break
			seen[current] = true
			if active_groups.has(current):
				ancestors.append(current)
			current = parents.get(current, "")
		covering[identifier] = ancestors
	var visible_ids := group_ids.duplicate()
	for entry in detail_entries:
		var props: Dictionary = entry.record.properties
		var identifier := str(JSON.to_native(props.id))
		var hidden: bool = not covering.get(identifier, []).is_empty()
		if entry.record.type == "line_edge":
			var source := reference_id(props.get("source"))
			var target := reference_id(props.get("target"))
			var source_groups: Array = covering.get(source, []).duplicate()
			var target_groups: Array = covering.get(target, []).duplicate()
			if active_groups.has(source):
				source_groups.append(source)
			if active_groups.has(target):
				target_groups.append(target)
			hidden = source_groups.any(func(group): return target_groups.has(group))
			if not hidden:
				visible_ids[source] = true
				visible_ids[target] = true
		if not hidden:
			visible_ids[identifier] = true
	var foreground := []
	var background := []
	for entry in detail_entries:
		var identifier := str(JSON.to_native(entry.record.properties.id))
		if visible_ids.has(identifier):
			foreground.append(entry)
		else:
			background.append(entry)
	group_entries.append_array(foreground)
	var visible_count := group_entries.size()
	group_entries.append_array(background)
	group_entries.append_array(unordered)
	return {"ordered": group_entries, "bounds": bounds, "center": center,
		"groups": group_ids, "rects": rects, "font": font, "visible_count": visible_count}


static func reference_id(value: Variant) -> String:
	return str(value.get("$ref", "")) if value is Dictionary else ""
