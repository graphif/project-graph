class_name StageObjectRegistry

## 仅登记路径，避免解析 Entity/History 时预加载场景并再次解析 Entity 子类。
const SCENE_PATHS := {
	"legacy_asset": "res://src/stage_object/entity/legacy_asset/legacy_asset.tscn",
	"pen_stroke": "res://src/stage_object/entity/pen_stroke/pen_stroke.tscn",
	"text_node": "uid://btnefrbc5lowu",
	"line_edge": "uid://dodce5rghnax4",
}
static var _scenes: Dictionary[String, PackedScene] = {}

## Script -> type name。惰性构建一次，避免每个对象都实例化场景来探测类型。
static var _type_by_script: Dictionary = { }
## Script -> 可序列化属性名数组。避免每个对象都做一次 get_property_list() 反射筛选。
static var _property_names_by_script: Dictionary = { }


static func get_scene(type_name: String) -> PackedScene:
	if not SCENE_PATHS.has(type_name):
		return null
	if not _scenes.has(type_name):
		var scene := load(SCENE_PATHS[type_name]) as PackedScene
		if scene == null:
			return null
		_scenes[type_name] = scene
	return _scenes[type_name]


static func capture(target_root: Node) -> Dictionary:
	var objects: Array[Dictionary] = []
	_collect_objects(target_root, objects)
	return {"objects": objects}


static func restore(target_root: Node, snapshot: Dictionary) -> void:
	if target_root.has_method("finish_interaction"):
		target_root.call("finish_interaction")
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
		var object := instantiate_record(object_data, pending_references)
		if object == null:
			continue
		if object is TextNode and target_root.has_meta("load_canvas_font"):
			object.set_meta("prepared_canvas_font", target_root.get_meta("load_canvas_font"))
		target_root.add_child(object)
		if not object.id.is_empty() and not by_id.has(object.id):
			by_id[object.id] = object

	for pending_reference in pending_references:
		var object := pending_reference.object as StageObject
		if is_instance_valid(object):
			object.set(pending_reference.property, by_id.get(pending_reference.reference_id))
	var layer_mover := target_root.get_node_or_null("EntityLayerMover")
	if layer_mover != null:
		layer_mover.call("reset_tracking")
	await target_root.get_tree().process_frame


## Reuse the same property/reference restoration for history and initial loading.
static func instantiate_record(record: Dictionary, pending_references: Array[Dictionary]) -> StageObject:
	var scene := get_scene(str(record.get("type", "")))
	if scene == null:
		return null
	var object := scene.instantiate() as StageObject
	if object == null:
		return null
	_restore_transform(object, record.get("transform", {}))
	_restore_properties(object, record.get("properties", {}), pending_references)
	return object


static func _collect_objects(node: Node, result: Array[Dictionary]) -> void:
	for child in node.get_children():
		if not is_instance_valid(child):
			continue
		if child is StageObject:
			result.append(_serialize_object(child))
		else:
			_collect_objects(child, result)


static func _serialize_object(object: StageObject) -> Dictionary:
	var properties := {}
	for property_name in _serializable_property_names(object):
		properties[property_name] = _encode_value(object.get(property_name))
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
	if _type_by_script.is_empty():
		for type_name in SCENE_PATHS:
			var scene: PackedScene = get_scene(type_name)
			if scene == null:
				continue
			var prototype := scene.instantiate()
			_type_by_script[prototype.get_script()] = type_name
			prototype.free()
	return str(_type_by_script.get(object.get_script(), ""))


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


static func _serializable_property_names(object: StageObject) -> PackedStringArray:
	var script: Variant = object.get_script()
	var cached: Variant = _property_names_by_script.get(script)
	if cached != null:
		return cached
	var names := PackedStringArray()
	for property in object.get_property_list():
		if _is_serializable_export(property, property.get("usage", 0)):
			names.append(property.name)
	_property_names_by_script[script] = names
	return names


static func _is_serializable_export(property: Dictionary, usage: int) -> bool:
	return (
		(usage & PROPERTY_USAGE_SCRIPT_VARIABLE) != 0
		and (usage & PROPERTY_USAGE_STORAGE) != 0
		and not str(property.get("name", "")).begins_with("_")
	)


static func _encode_value(value):
	# 只对 Object 做有效性检查: is_instance_valid() 对任何非 Object 值都返回 false,
	# 无条件前置检查会把 String / int / Vector2 等普通属性全部写成 null。
	if value is Object:
		if not is_instance_valid(value):
			return null
		if value is StageObject:
			return {"$ref": value.id}
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


## Native values for unsaved-change checks; document encoding remains in capture().
## Avoid encoding the entire archive again during camera-only navigation.
static func comparison_state(target_root: Node) -> Dictionary:
	var result := {}
	for object in target_root.get_children():
		if not object is StageObject or object.is_queued_for_deletion():
			continue
		result[object.id] = object_comparison_state(object)
	return result


static func object_comparison_state(object: StageObject) -> Dictionary:
	var values := {"script": object.get_script(), "transform": object.transform}
	for name in _serializable_property_names(object):
		var value: Variant = _comparison_value(object.get(name))
		if value is Array or value is Dictionary:
			values[name] = value.duplicate(true)
		elif typeof(value) >= TYPE_PACKED_BYTE_ARRAY and typeof(value) <= TYPE_PACKED_VECTOR4_ARRAY:
			values[name] = value.duplicate()
		else:
			values[name] = value
	return values


static func matches_comparison_state(target_root: Node, state: Dictionary) -> bool:
	var count := 0
	for object in target_root.get_children():
		if not object is StageObject or object.is_queued_for_deletion():
			continue
		count += 1
		var values: Dictionary = state.get(object.id, {})
		if values.get("script") != object.get_script() or values.get("transform") != object.transform:
			return false
		for name in _serializable_property_names(object):
			if not values.has(name) or values[name] != _comparison_value(object.get(name)):
				return false
	return count == state.size()


static func _comparison_value(value: Variant) -> Variant:
	if value is StageObject:
		return {"object_id": value.id} if is_instance_valid(value) else null
	return value
