extends RefCounted
## Adapt master's serializer graph, retaining the original archive separately.
const Decoder = preload("res://src/legacy_stage_decoder.gd")
const MAX_OBJECTS := 5000
const MAX_ARCHIVE_BYTES := 64 * 1024 * 1024
const ENTITY_TYPES := ["TextNode", "Section", "UrlNode", "ConnectPoint", "ImageNode", "SvgNode", "PenStroke"]
var _paths := {}
var _entities := {}
var _parents := {}
var _error := ""


func load_archive(reader: ZIPReader) -> Dictionary:
	if not reader.file_exists("metadata.msgpack") or not reader.file_exists("stage.msgpack"):
		return _failure("旧版项目必须包含 metadata.msgpack 和 stage.msgpack")
	var decoder := Decoder.new()
	var metadata_result := decoder.decode(reader.read_file("metadata.msgpack"))
	if not metadata_result.ok or not metadata_result.data is Dictionary:
		return _failure("旧版 metadata.msgpack 无效: " + metadata_result.error)
	var metadata: Dictionary = metadata_result.data
	var version := str(metadata.get("version", ""))
	if not version.begins_with("2."):
		return _failure("不支持的旧版项目版本: " + version)
	var result := decoder.decode(reader.read_file("stage.msgpack"))
	if not result.ok or not result.data is Array:
		return _failure("旧版 stage.msgpack 无效: " + result.error)
	_index(result.data, "")
	if not _error.is_empty():
		return _failure(_error)
	if _entities.size() > MAX_OBJECTS:
		return _failure("旧版项目对象过多")
	for object in _entities.values():
		if not _validate_object(object):
			return _failure("旧版对象字段无效: " + str(object.get("uuid", "")))
	for identifier in _entities:
		var object: Dictionary = _entities[identifier]
		if object.get("_") == "Section":
			if not object.get("children", []) is Array:
				return _failure("旧版分组 children 必须是数组")
			for child in object.get("children", []):
				var child_id := _reference(child)
				if child_id == identifier or _parents.has(child_id):
					return _failure("旧版分组包含重复或自引用成员")
				_parents[child_id] = identifier
	for identifier in _parents:
		var visited := {}
		var cursor: String = identifier
		while _parents.has(cursor):
			if visited.has(cursor):
				return _failure("旧版分组包含循环引用")
			visited[cursor] = true
			cursor = _parents[cursor]
	var objects := []
	for identifier in _entities:
		var converted := _convert(_entities[identifier], reader)
		if not _error.is_empty():
			return _failure(_error)
		objects.append_array(converted)
	var entries := {}
	var total := 0
	for name in reader.get_files():
		if name.ends_with("/"):
			continue
		var data := reader.read_file(name)
		total += data.size()
		if total > MAX_ARCHIVE_BYTES:
			return _failure("旧版存档解压内容过大")
		entries["legacy/" + name] = data
	return {"ok": true, "metadata": metadata, "graph": {"objects": objects},
		"preserved_entries": entries, "legacy": true}


func _index(value: Variant, path: String, depth := 0) -> void:
	if not _error.is_empty():
		return
	if depth > Decoder.MAX_DEPTH or _paths.size() >= Decoder.MAX_VALUES:
		_error = "旧版对象图层级或数量过多"
		return
	_paths[path] = value
	if value is Dictionary:
		if value.has("uuid"):
			if not value.uuid is String or value.uuid.is_empty() or _entities.has(value.uuid):
				_error = "旧版对象 UUID 无效或重复"
				return
			_entities[value.uuid] = value
		for key in value:
			_index(value[key], path + "/" + str(key), depth + 1)
	elif value is Array:
		for i in value.size():
			_index(value[i], path + "/" + str(i), depth + 1)


func _reference(value: Variant) -> String:
	var visited := {}
	while value is Dictionary and value.has("$"):
		var path: String = str(value["$"])
		if not _paths.has(path) or visited.has(path):
			_error = "旧版项目包含无效路径引用: " + path
			return ""
		visited[path] = true
		value = _paths[path]
	if not value is Dictionary or not value.get("uuid") is String or not ENTITY_TYPES.has(value.get("_")):
		_error = "旧版引用必须指向舞台实体"
		return ""
	return value.uuid


func _convert(object: Dictionary, reader: ZIPReader) -> Array:
	var kind := str(object.get("_", ""))
	var identifier := str(object.uuid)
	var properties := {"id": JSON.from_native(identifier)}
	var rect := _rect(object)
	var position := rect.position
	var type_name := "text_node"
	if _parents.has(identifier):
		properties["container"] = {"$ref": _parents[identifier]}
	match kind:
		"TextNode", "Section", "UrlNode", "ConnectPoint":
			var content := str(object.get("text", object.get("title", "")))
			if kind == "UrlNode" and content.is_empty():
				content = str(object.get("url", ""))
			properties["text"] = JSON.from_native(content)
			properties["font_size"] = JSON.from_native(int(32 * pow(2.0, clampf(float(object.get("fontScaleLevel", 0)), -4, 8) / 2.0)))
			properties["fixed_width"] = JSON.from_native(rect.size.x if kind != "Section" else 0.0)
			properties["fill_color"] = JSON.from_native(_color(object.get("color", {})))
			properties["use_theme_border"] = JSON.from_native(true)
			# Existing TextNode label has a local origin of (-14.5, -36).
			position += Vector2(14.5, 36.0)
		"ImageNode", "SvgNode":
			type_name = "legacy_asset"
			var attachment_id := str(object.get("attachmentId", ""))
			var attachment_name := ""
			for name in reader.get_files():
				if name.begins_with("attachments/" + attachment_id + "."):
					attachment_name = name
					break
			if attachment_name.is_empty():
				_error = "旧版图片缺少附件: " + attachment_id
				return []
			var bytes := reader.read_file(attachment_name)
			if bytes.size() > Decoder.MAX_BYTES:
				_error = "旧版图片附件过大"
				return []
			var extension := attachment_name.get_extension().to_lower()
			var image := Image.new()
			var error := ERR_FILE_UNRECOGNIZED
			match extension:
				"png": error = image.load_png_from_buffer(bytes)
				"jpg", "jpeg": error = image.load_jpg_from_buffer(bytes)
				"webp": error = image.load_webp_from_buffer(bytes)
				"svg": error = image.load_svg_from_buffer(bytes)
			if error != OK:
				_error = "旧版图片附件无法解码: " + attachment_name
				return []
			properties["image_base64"] = JSON.from_native(Marshalls.raw_to_base64(bytes))
			properties["image_format"] = JSON.from_native(extension)
			properties["asset_size"] = [maxf(1, rect.size.x), maxf(1, rect.size.y)]
		"PenStroke":
			type_name = "pen_stroke"
			position = Vector2.ZERO
			var points := PackedVector2Array()
			for segment in object.get("segments", []):
				points.append(_vector(segment.get("location", {})))
			properties["points"] = JSON.from_native(points)
			var color := _color(object.get("color", {}))
			properties["stroke_color"] = JSON.from_native(color if color.a > 0 else Color("#a6adc8"))
		"LineEdge", "ArcEdge", "MultiTargetUndirectedEdge":
			var endpoints := []
			for endpoint in object.get("associationList", []):
				endpoints.append(_reference(endpoint))
			if endpoints.size() < 2:
				_error = "旧版连线至少需要两个端点"
				return []
			var branches := []
			var color := _color(object.get("color", {}))
			for i in range(1, endpoints.size()):
				var edge_properties := {
					"id": JSON.from_native(identifier if i == 1 else identifier + ":branch:" + str(i)),
					"source": {"$ref": endpoints[0]}, "target": {"$ref": endpoints[i]},
					"text": JSON.from_native(str(object.get("text", "")) if i == 1 else ""),
					"stroke_color": JSON.from_native(color),
					"use_theme_color": JSON.from_native(color.a == 0.0),
					"show_arrow": JSON.from_native(kind != "MultiTargetUndirectedEdge" and object.get("arrowType", "default") != "none"),
				}
				branches.append(_snapshot("line_edge", Vector2.ZERO, edge_properties))
			return branches
		_:
			_error = "暂不支持的旧版对象类型: " + kind
			return []
	return [_snapshot(type_name, position, properties)]


func _snapshot(type_name: String, position: Vector2, properties: Dictionary) -> Dictionary:
	return {"type": type_name, "transform": {"position": [position.x, position.y],
		"rotation": 0.0, "scale": [1.0, 1.0]}, "properties": properties}


func _rect(object: Dictionary) -> Rect2:
	var box: Dictionary = object.get("collisionBox", object.get("_collisionBoxNormal", {}))
	for shape in box.get("shapes", []):
		if shape.get("_") == "Rectangle":
			return Rect2(_vector(shape.get("location", {})), _vector(shape.get("size", {})))
	return Rect2(Vector2.ZERO, Vector2(30, 30))


func _vector(value: Dictionary) -> Vector2:
	return Vector2(float(value.get("x", 0)), float(value.get("y", 0)))


func _color(value: Dictionary) -> Color:
	return Color(float(value.get("r", 0)) / 255.0, float(value.get("g", 0)) / 255.0,
		float(value.get("b", 0)) / 255.0, float(value.get("a", 0)))


func _failure(message: String) -> Dictionary:
	return {"ok": false, "error": message}


func _validate_object(object: Dictionary) -> bool:
	var kind := str(object.get("_", ""))
	for property in ["color", "collisionBox", "_collisionBoxNormal"]:
		if object.has(property) and not object[property] is Dictionary:
			return false
	for property in ["children", "segments", "associationList"]:
		if object.has(property) and not object[property] is Array:
			return false
	var box: Dictionary = object.get("collisionBox", object.get("_collisionBoxNormal", {}))
	if not box.get("shapes", []) is Array:
		return false
	for shape in box.get("shapes", []):
		if not shape is Dictionary:
			return false
		for property in ["location", "size"]:
			if shape.has(property) and not _valid_vector(shape[property]):
				return false
	var color: Dictionary = object.get("color", {})
	for component in ["r", "g", "b", "a"]:
		if color.has(component) and not (color[component] is int or color[component] is float):
			return false
	if object.has("fontScaleLevel") and not (object.fontScaleLevel is int or object.fontScaleLevel is float):
		return false
	if kind == "PenStroke":
		for segment in object.get("segments", []):
			if not segment is Dictionary or not _valid_vector(segment.get("location")):
				return false
	return true


func _valid_vector(value: Variant) -> bool:
	return value is Dictionary and (value.get("x") is int or value.get("x") is float) and (value.get("y") is int or value.get("y") is float)
