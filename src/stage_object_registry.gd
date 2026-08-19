class_name StageObjectRegistry

const SCENES := {
	"text_node": preload("uid://btnefrbc5lowu"),
	"line_edge": preload("uid://dodce5rghnax4"),
}


static func capture(target_root: Node) -> Dictionary:
	var objects: Array[Dictionary] = []
	_collect_objects(target_root, objects)
	return {"objects": objects}


static func restore(target_root: Node, snapshot: Dictionary) -> void:
	for child in target_root.get_children():
		if child is StageObject:
			child.queue_free()
	await target_root.get_tree().process_frame

	var by_id := {}
	var pending_references: Array[Dictionary] = []
	var objects: Array = snapshot.get("objects", [])

	for object_data in objects:
		if not object_data is Dictionary:
			continue
		var type_name := str(object_data.get("type", ""))
		var scene: PackedScene = SCENES.get(type_name)
		if scene == null:
			continue
		var object := scene.instantiate() as StageObject
		if object == null:
			continue
		_restore_transform(object, object_data.get("transform", {}))
		_restore_properties(object, object_data.get("properties", {}), pending_references)
		target_root.add_child(object)
		if not object.id.is_empty() and not by_id.has(object.id):
			by_id[object.id] = object

	for reference in pending_references:
		var object := reference.object as StageObject
		if is_instance_valid(object):
			object.set(reference.property, by_id.get(reference.reference_id))
	await target_root.get_tree().process_frame


static func _collect_objects(node: Node, result: Array[Dictionary]) -> void:
	for child in node.get_children():
		if child is StageObject:
			result.append(_serialize_object(child))
		else:
			_collect_objects(child, result)


static func _serialize_object(object: StageObject) -> Dictionary:
	var properties := {}
	for property in object.get_property_list():
		var usage: int = property.get("usage", 0)
		if not _is_serializable_export(property, usage):
			continue
		properties[property.name] = _encode_value(object.get(property.name))
	return {
		"type": _type_for(object),
		"transform": {
			"position": _encode_vector2(object.position),
			"rotation": object.rotation,
			"scale": _encode_vector2(object.scale),
		},
		"properties": properties,
	}


static func _type_for(object: StageObject) -> String:
	for type_name in SCENES:
		var scene: PackedScene = SCENES[type_name]
		var prototype := scene.instantiate()
		var matches: bool = prototype.get_script() == object.get_script()
		prototype.free()
		if matches:
			return type_name
	return ""


static func _restore_transform(object: StageObject, transform: Dictionary) -> void:
	var position: Variant = _decode_vector2(transform.get("position"))
	if position != null:
		object.position = position
	if transform.get("rotation") is float or transform.get("rotation") is int:
		object.rotation = float(transform.rotation)
	var scale: Variant = _decode_vector2(transform.get("scale"))
	if scale != null:
		object.scale = scale


static func _restore_properties(object: StageObject, properties: Dictionary, pending_references: Array[Dictionary]) -> void:
	var property_names := _serializable_property_names(object)
	for property_name in properties:
		if not property_names.has(property_name):
			continue
		var value = properties[property_name]
		if value is Dictionary and value.has("$ref"):
			pending_references.append({
				"object": object,
				"property": property_name,
				"reference_id": str(value["$ref"]),
			})
			continue
		object.set(property_name, _decode_value(value, object.get(property_name)))


static func _serializable_property_names(object: StageObject) -> Dictionary:
	var names := {}
	for property in object.get_property_list():
		if _is_serializable_export(property, property.get("usage", 0)):
			names[property.name] = true
	return names


static func _is_serializable_export(property: Dictionary, usage: int) -> bool:
	return (
		(usage & PROPERTY_USAGE_SCRIPT_VARIABLE) != 0
		and (usage & PROPERTY_USAGE_STORAGE) != 0
		and not str(property.get("name", "")).begins_with("_")
	)


static func _encode_value(value):
	if value is StageObject:
		return {"$ref": value.id} if is_instance_valid(value) else null
	if value is Vector2:
		return _encode_vector2(value)
	return JSON.from_native(value)


static func _decode_value(value, current_value):
	if current_value is Vector2:
		var decoded: Variant = _decode_vector2(value)
		return decoded if decoded != null else current_value
	return JSON.to_native(value)


static func _encode_vector2(value: Vector2) -> Array[float]:
	return [value.x, value.y]


static func _decode_vector2(value):
	if not value is Array or value.size() != 2:
		return null
	if not (value[0] is float or value[0] is int):
		return null
	if not (value[1] is float or value[1] is int):
		return null
	return Vector2(float(value[0]), float(value[1]))
