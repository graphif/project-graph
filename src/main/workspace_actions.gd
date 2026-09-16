class_name WorkspaceActions
extends RefCounted

static var clipboard: Dictionary = {}
static var clipboard_text := ""


static func copy_selection(stage: Stage) -> void:
	var selected := stage.selected_ids.duplicate()
	var roots := stage.drag_entities()
	for object in stage.stage_objects():
		if object is Entity:
			for root in roots:
				if object.is_inside_container(root) and not selected.has(object.id):
					selected.append(object.id)
					break
	for object in stage.stage_objects():
		if object is LineEdge and is_instance_valid(object.source) and is_instance_valid(object.target) and selected.has(object.source.id) and selected.has(object.target.id) and not selected.has(object.id):
			selected.append(object.id)
	var objects: Array = StageObjectRegistry.capture(stage).objects
	var copied: Array = []
	for object in objects:
		if selected.has(str(object.properties.get("id", ""))):
			copied.append(object)
	clipboard = {"objects": copied}
	var text := []
	for node in stage.selected_objects():
		if node is TextNode:
			text.append(node.text)
	clipboard_text = "\n".join(text)
	DisplayServer.clipboard_set(clipboard_text)


static func paste(stage: Stage) -> void:
	stage.finish_text_editing()
	stage.history.begin_transaction()
	if clipboard.is_empty() or DisplayServer.clipboard_get() != clipboard_text:
		stage.create_text_node(DisplayServer.clipboard_get(), stage.camera.target_position, false)
	else:
		var by_old_id := {}
		var pending: Array[Dictionary] = []
		var ids := PackedStringArray()
		for data in clipboard.objects:
			var scene: PackedScene = StageObjectRegistry.get_scene(str(data.type))
			if scene == null:
				continue
			var node := scene.instantiate() as StageObject
			var old_id := str(data.properties.get("id", ""))
			var properties: Dictionary = data.properties.duplicate(true)
			properties.erase("id")
			StageObjectRegistry._restore_transform(node, data.get("transform", {}))
			StageObjectRegistry._restore_properties(node, properties, pending)
			node.position += Vector2(48, 48)
			stage.add_child(node)
			by_old_id[old_id] = node
			ids.append(node.id)
		for reference in pending:
			reference.object.set(reference.property, by_old_id.get(reference.reference_id))
		var complete_ids := PackedStringArray()
		for id in ids:
			for node in stage.stage_objects():
				if node.id != id:
					continue
				if node is LineEdge and (not is_instance_valid(node.source) or not is_instance_valid(node.target)):
					stage.remove_child(node)
					node.queue_free()
				else:
					complete_ids.append(id)
		stage.select_ids(complete_ids)
	stage.get_node("EntityLayerMover").reset_tracking()
	stage.history.commit()


static func generate(stage: Stage, source: String, mode: int) -> int:
	var lines := source.split("\n")
	stage.history.begin_transaction()
	var parents: Array[TextNode] = []
	var all_ids := PackedStringArray()
	var count := 0
	for raw in lines:
		if raw.strip_edges().is_empty():
			continue
		var stripped := raw.strip_edges()
		var depth := (raw.length() - raw.lstrip(" \t").length()) / 2
		if raw.begins_with("\t"):
			depth = raw.length() - raw.lstrip("\t").length()
		if mode == 1:
			if stripped.begins_with("#"):
				depth = maxi(0, stripped.length() - stripped.lstrip("#").length() - 1)
				stripped = stripped.lstrip("#").strip_edges()
			else:
				stripped = stripped.trim_prefix("- ").trim_prefix("* ")
		if mode == 2:
			depth = 0
		depth = mini(depth, parents.size())
		var node := stage.create_text_node(stripped, stage.camera.target_position + Vector2(depth * 280, count * 96), false)
		all_ids.append(node.id)
		if depth > 0:
			var edge := StageObjectRegistry.get_scene("line_edge").instantiate() as LineEdge
			edge.source = parents[depth - 1]
			edge.target = node
			edge.source_uv = Vector2(1, 0.5)
			edge.target_uv = Vector2(0, 0.5)
			stage.add_child(edge)
		parents.resize(depth + 1)
		parents[depth] = node
		count += 1
	stage.select_ids(all_ids)
	stage.history.commit()
	return count


static func export_text(stage: Stage, format: String, selected_only := true) -> String:
	var nodes := stage.selected_objects() if selected_only else stage.stage_objects()
	var texts := PackedStringArray()
	for node in nodes:
		if node is TextNode:
			texts.append(node.text)
	if format == "mermaid":
		var result := "graph TD\n"
		for node in nodes:
			if node is TextNode:
				result += "  n%s[\"%s\"]\n" % [node.id, node.text.replace("\"", "&quot;").replace("\n", " ")]
		for edge in stage.stage_objects():
			if edge is LineEdge and is_instance_valid(edge.source) and is_instance_valid(edge.target) and nodes.has(edge.source) and nodes.has(edge.target):
				result += "  n%s --> n%s\n" % [edge.source.id, edge.target.id]
		return result
	var chosen := {}
	var children := {}
	var indegree := {}
	for node in nodes:
		if node is TextNode:
			chosen[node.id] = node
			children[node.id] = PackedStringArray()
			indegree[node.id] = 0
	for edge in stage.stage_objects():
		if edge is LineEdge and is_instance_valid(edge.source) and is_instance_valid(edge.target) and chosen.has(edge.source.id) and chosen.has(edge.target.id):
			var outgoing: PackedStringArray = children[edge.source.id]
			if not outgoing.has(edge.target.id):
				outgoing.append(edge.target.id)
				children[edge.source.id] = outgoing
				indegree[edge.target.id] += 1
	var result := PackedStringArray()
	if format == "network":
		for id in chosen:
			if children[id].is_empty():
				if indegree[id] == 0:
					result.append(chosen[id].text)
			else:
				for target in children[id]:
					result.append(chosen[id].text + " → " + chosen[target].text)
		return "\n".join(result)
	var visited := {}
	for id in chosen:
		if indegree[id] == 0:
			_append_tree_text(id, 0, chosen, children, visited, format == "markdown", result)
	for id in chosen:
		if not visited.has(id):
			_append_tree_text(id, 0, chosen, children, visited, format == "markdown", result)
	return "\n".join(result)


static func export_svg(stage: Stage, selected_only := false) -> String:
	var objects := stage.selected_objects() if selected_only else stage.stage_objects()
	if objects.is_empty():
		return ""
	var bounds := objects[0].aabb
	for object in objects:
		bounds = bounds.merge(object.aabb)
	bounds = bounds.grow(24)
	var svg := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s">\n' % [bounds.position.x, bounds.position.y, bounds.size.x, bounds.size.y]
	for object in objects:
		if object is LineEdge or object is PenStroke:
			var line: Line2D = object.line
			var points := PackedStringArray()
			for point in line.points:
				var world := line.to_global(point)
				points.append("%s,%s" % [world.x, world.y])
			svg += '<polyline points="%s" fill="none" stroke="#%s" stroke-width="%s"/>\n' % [" ".join(points), line.default_color.to_html(false), line.width]
			if object is LineEdge:
				var arrow_points := PackedStringArray()
				for point in object.arrow_head.polygon:
					var world: Vector2 = object.arrow_head.to_global(point)
					arrow_points.append("%s,%s" % [world.x, world.y])
				svg += '<polygon points="%s" fill="#%s"/>\n' % [" ".join(arrow_points), line.default_color.to_html(false)]
		elif object is TextNode:
			var rect := object.aabb
			svg += '<rect x="%s" y="%s" width="%s" height="%s" rx="6" fill="#%s" fill-opacity="%s" stroke="#%s" stroke-width="2"/>\n' % [rect.position.x, rect.position.y, rect.size.x, rect.size.y, object.fill_color.to_html(false), object.fill_color.a, object.border_color.to_html(false)]
			var y: float = rect.position.y + object.font_size + 10
			for text_line in object.text.split("\n"):
				svg += '<text x="%s" y="%s" font-size="%s" fill="#e5e7eb">%s</text>\n' % [rect.position.x + 15, y, object.font_size, text_line.xml_escape()]
				y += object.font_size * 1.3
	return svg + "</svg>"


static func graph_components(stage: Stage) -> Array[Dictionary]:
	var entities: Array[StageObject] = []
	var adjacency := {}
	for object in stage.stage_objects():
		if object is Entity:
			entities.append(object)
			adjacency[object.id] = PackedStringArray()
	var edges: Array[LineEdge] = []
	for object in stage.stage_objects():
		if object is LineEdge and is_instance_valid(object.source) and is_instance_valid(object.target):
			edges.append(object)
			if adjacency.has(object.source.id) and adjacency.has(object.target.id):
				var a: PackedStringArray = adjacency[object.source.id]
				a.append(object.target.id)
				adjacency[object.source.id] = a
				var b: PackedStringArray = adjacency[object.target.id]
				b.append(object.source.id)
				adjacency[object.target.id] = b
	var visited := {}
	var result: Array[Dictionary] = []
	for entity in entities:
		if visited.has(entity.id):
			continue
		var queue := [entity.id]
		var ids := PackedStringArray()
		while not queue.is_empty():
			var id: String = queue.pop_front()
			if visited.has(id):
				continue
			visited[id] = true
			ids.append(id)
			queue.append_array(Array(adjacency.get(id, PackedStringArray())))
		var component_edges := 0
		var max_degree := 0
		for id in ids:
			max_degree = maxi(max_degree, adjacency[id].size())
		for edge in edges:
			if ids.has(edge.source.id) and ids.has(edge.target.id):
				component_edges += 1
		var kind := "独立节点"
		if ids.size() > 1:
			kind = "路径" if max_degree <= 2 else ("星形" if max_degree == ids.size() - 1 else "树")
			if component_edges >= ids.size():
				kind = "网络"
		result.append({"ids": ids, "edges": component_edges, "kind": kind, "title": entity.text if entity is TextNode else "画笔"})
	return result


static func _append_tree_text(id: String, depth: int, nodes: Dictionary, children: Dictionary, visited: Dictionary, markdown: bool, result: PackedStringArray) -> void:
	var line: String = str(nodes[id].text).replace("\n", " ")
	var prefix := "  ".repeat(depth) + ("- " if markdown else "")
	if visited.has(id):
		result.append(prefix + "↪ " + line)
		return
	result.append(prefix + line)
	visited[id] = true
	for child_id in children[id]:
		_append_tree_text(child_id, depth + 1, nodes, children, visited, markdown, result)
