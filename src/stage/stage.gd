class_name Stage
extends Node2D

signal file_error(message: String)
signal file_saved(path: String)
signal file_loaded(path: String)

@onready var history: History = %History
@onready var camera: Camera2D = $Camera
const TEXT_NODE = preload("uid://btnefrbc5lowu")

var current_file_path := ""
var created_at := ""


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			var node: TextNode = TEXT_NODE.instantiate()
			node.text = "..."
			node.position = get_global_mouse_position()
			add_child(node)
			get_viewport().set_input_as_handled()
			history.commit()


func save_to_file(path: String) -> bool:
	var snapshot := StageObjectRegistry.capture(self)
	var camera_state := {
		"position": [camera.target_position.x, camera.target_position.y],
		"zoom": camera.target_zoom.x,
	}
	var result := ProjectFile.save(path, snapshot, camera_state, created_at)
	if not result.ok:
		file_error.emit(result.error)
		return false
	current_file_path = path
	created_at = result.created_at
	file_saved.emit(path)
	return true


func load_from_file(path: String) -> void:
	var result := ProjectFile.load(path)
	if not result.ok:
		file_error.emit(result.error)
		return
	await StageObjectRegistry.restore(self, result.graph)
	var camera_state: Dictionary = result.graph.get("camera", { })
	var position: Variant = _decode_vector2(camera_state.get("position"))
	if position != null:
		camera.target_position = position
	if camera_state.get("zoom") is float or camera_state.get("zoom") is int:
		var zoom := float(camera_state.zoom)
		camera.target_zoom = Vector2(zoom, zoom)
	history.clear()
	current_file_path = path
	created_at = str(result.metadata.get("created_at", ""))
	file_loaded.emit(path)


func _decode_vector2(value):
	if not value is Array or value.size() != 2:
		return null
	if not(value[0] is float or value[0] is int) or not(value[1] is float or value[1] is int):
		return null
	return Vector2(float(value[0]), float(value[1]))
