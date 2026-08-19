class_name ProjectFile

const FORMAT_VERSION := "3.0.0"
const METADATA_PATH := "metadata.json"
const STAGE_PATH := "stage.json"


static func save(path: String, snapshot: Dictionary, camera_state: Dictionary, previous_created_at: String = "") -> Dictionary:
	var now := Time.get_datetime_string_from_system(true)
	var metadata := {
		"version": FORMAT_VERSION,
		"created_at": previous_created_at if not previous_created_at.is_empty() else now,
		"modified_at": now,
		"object_count": snapshot.get("objects", []).size(),
	}
	var graph := snapshot.duplicate(true)
	graph["camera"] = camera_state

	var writer := ZIPPacker.new()
	var error := writer.open(path)
	if error != OK:
		return _failure("无法创建项目文件: %s" % error_string(error))

	error = _write_json(writer, METADATA_PATH, metadata)
	if error == OK:
		error = _write_json(writer, STAGE_PATH, graph)
	var close_error := writer.close()
	if error != OK:
		return _failure("无法写入项目文件: %s" % error_string(error))
	if close_error != OK:
		return _failure("无法完成项目文件: %s" % error_string(close_error))
	return {"ok": true, "created_at": metadata.created_at}


static func load(path: String) -> Dictionary:
	var reader := ZIPReader.new()
	var error := reader.open(path)
	if error != OK:
		return _failure("无法打开项目文件或文件不是有效的 ZIP: %s" % error_string(error))
	if not reader.file_exists(METADATA_PATH) or not reader.file_exists(STAGE_PATH):
		reader.close()
		return _failure("项目文件必须包含 metadata.json 和 stage.json")

	var metadata_result := _read_json(reader, METADATA_PATH)
	var graph_result := _read_json(reader, STAGE_PATH)
	reader.close()
	if not metadata_result.ok:
		return metadata_result
	if not graph_result.ok:
		return graph_result
	var metadata: Dictionary = metadata_result.data
	var graph: Dictionary = graph_result.data
	var version := str(metadata.get("version", ""))
	if not _is_supported_version(version):
		return _failure("不支持的项目文件版本: %s" % version)
	if not graph.get("objects") is Array:
		return _failure("stage.json 缺少 objects 数组")
	return {"ok": true, "metadata": metadata, "graph": graph}


static func _write_json(writer: ZIPPacker, archive_path: String, value: Dictionary) -> Error:
	var error := writer.start_file(archive_path)
	if error != OK:
		return error
	error = writer.write_file(JSON.stringify(value).to_utf8_buffer())
	var close_error := writer.close_file()
	return error if error != OK else close_error


static func _read_json(reader: ZIPReader, archive_path: String) -> Dictionary:
	var text := reader.read_file(archive_path).get_string_from_utf8()
	var json := JSON.new()
	var error := json.parse(text)
	if error != OK:
		return _failure("%s 不是有效 JSON: %s" % [archive_path, json.get_error_message()])
	if not json.data is Dictionary:
		return _failure("%s 的根值必须是对象" % archive_path)
	return {"ok": true, "data": json.data}


static func _is_supported_version(version: String) -> bool:
	var parts := version.split(".")
	if parts.size() != 3 or not parts[0].is_valid_int() or not parts[1].is_valid_int() or not parts[2].is_valid_int():
		return false
	return int(parts[0]) == 3


static func _failure(message: String) -> Dictionary:
	return {"ok": false, "error": message}
