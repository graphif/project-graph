extends SceneTree

var failures: Array[String] = []
var app
var stage: Stage


func _initialize() -> void:
	call_deferred("_run")


func check(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
		push_error(message)


func settle() -> void:
	for i in 4:
		await physics_frame
		await process_frame


func _run() -> void:
	var decoder = preload("res://src/legacy_stage_decoder.gd").new()
	for bytes in [PackedByteArray(), PackedByteArray([0xdc, 0xff, 0xff]), PackedByteArray([0x91]),
			PackedByteArray([0xc1]), PackedByteArray([0xc0, 0xc0]), PackedByteArray([0xcf, 0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0])]:
		check(not decoder.decode(bytes).ok, "Malformed MessagePack is rejected")
	var nil_and_bool = decoder.decode(PackedByteArray([0x93, 0xc0, 0xc2, 0xc3]))
	check(nil_and_bool.ok and nil_and_bool.data == [null, false, true], "Nil and booleans decode without output")
	var float_buffer := StreamPeerBuffer.new()
	float_buffer.big_endian = true
	float_buffer.put_u8(0xcb)
	float_buffer.put_double(1.23456789012345)
	check(decoder.decode(float_buffer.data_array).data == 1.23456789012345, "Float64 precision is retained")
	root.size = Vector2i(1920, 1080)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", false, false)
	stage.apply_preferences()
	var folder := OS.get_environment("PG_LEGACY_DOCUMENTS")
	if folder.is_empty():
		folder = "/home/waya/Desktop/project"
	var names := ["教程操作.prg", "教程节点.prg", "tutorial-shortcut-keys-3.1.prg"]
	var only_name := OS.get_environment("PG_LEGACY_FILE")
	if not only_name.is_empty():
		names = [only_name]
	for name in names:
		var path := folder.path_join(name)
		var original_hash := FileAccess.get_sha256(path)
		var result := ProjectFile.load(path)
		check(result.ok, "Master document opens: " + name + " " + str(result.get("error", "")))
		if not result.ok:
			continue
		check(result.get("legacy", false), "Master format detected")
		var expected := {"教程操作.prg": 1027, "教程节点.prg": 180, "tutorial-shortcut-keys-3.1.prg": 623}
		var ids := {}
		for data in result.graph.objects:
			ids[JSON.to_native(data.properties.id)] = true
		check(ids.size() >= expected[name], "Every master UUID survives conversion")
		check(await stage.load_from_file(path), "Stage document loading succeeds")
		await settle()
		check(stage.stage_objects().size() == result.graph.objects.size(), "Registry restores every converted object")
		var editable: TextNode
		for object in stage.stage_objects():
			if object is LineEdge:
				check(is_instance_valid(object.source) and is_instance_valid(object.target), "Edge endpoints restored")
			elif object.get_script() == preload("res://src/stage_object/entity/legacy_asset/legacy_asset.gd"):
				check(object.texture_rect.texture != null, "Attachment texture restored")
				check(object.aabb.has_area(), "Attachment has live collision bounds")
			elif object is TextNode and not object.text.is_empty() and editable == null:
				editable = object
		check(editable != null, "Imported text is editable")
		var edited_id := editable.id
		var changed_text := editable.text + " [import test]"
		stage.history.begin_transaction()
		editable.text = changed_text
		stage.history.commit()
		await stage.history.undo()
		await settle()
		var restored_text := ""
		for object in stage.stage_objects():
			if object.id == edited_id:
				restored_text = object.text
		check(restored_text != changed_text, "Imported edit can be undone")
		await stage.history.redo()
		await settle()
		var saved_path := "/tmp/pg-legacy-roundtrip.prg"
		check(stage.save_to_file(saved_path), "Converted document saves")
		var saved := ProjectFile.load(saved_path)
		check(saved.ok and not saved.legacy, "Saved document uses native Godot format")
		check(saved.preserved_entries == result.preserved_entries, "All original archive entries survive byte-for-byte")
		check(await stage.load_from_file(saved_path), "Converted document reloads")
		await settle()
		for object in stage.stage_objects():
			if object.id == edited_id:
				check(object.text == changed_text, "Edited text survives save and reload")
		check(stage.stage_objects().size() == result.graph.objects.size(), "Converted graph survives roundtrip")
		if not OS.get_environment("PG_LEGACY_SCREENSHOT").is_empty():
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png(OS.get_environment("PG_LEGACY_SCREENSHOT"))
		check(FileAccess.get_sha256(path) == original_hash, "Test does not change source document")
		DirAccess.remove_absolute(saved_path)
		print("LEGACY_IMPORT: PASS " + name + " objects=" + str(stage.stage_objects().size()))
	app.queue_free()
	await process_frame
	if failures.is_empty():
		print("LEGACY_IMPORT_SMOKE: PASS")
		quit(0)
	else:
		print("LEGACY_IMPORT_SMOKE: FAIL ", failures)
		quit(1)
