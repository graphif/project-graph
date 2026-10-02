extends SceneTree
var failures: Array[String] = []
var stage: Stage
func _initialize() -> void:
	call_deferred("_run")
func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)
func settle() -> void:
	for i in 8:
		await physics_frame
		await process_frame
func screen(point: Vector2) -> Vector2:
	var viewport := stage.get_viewport()
	var container := viewport.get_parent() as Control
	return container.get_global_transform_with_canvas() * ((stage.get_canvas_transform() * point) * container.size / Vector2(viewport.size))
func motion(point: Vector2) -> void:
	root.warp_mouse(screen(point))
	var event := InputEventMouseMotion.new()
	event.position = screen(point)
	event.global_position = event.position
	Input.parse_input_event(event)
	Input.flush_buffered_events()
func button(point: Vector2, pressed: bool, shift := false, ctrl := false) -> void:
	var event := InputEventMouseButton.new()
	event.button_index = MOUSE_BUTTON_LEFT
	event.pressed = pressed
	event.position = screen(point)
	event.global_position = event.position
	event.shift_pressed = shift
	event.ctrl_pressed = ctrl
	Input.parse_input_event(event)
	Input.flush_buffered_events()
func _run() -> void:
	root.size = Vector2i(1440,1000)
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	GraphPreferences.set_value("physics",false,false)
	GraphPreferences.set_value("left_mode",0,false)
	GraphPreferences.set_value("snap",false,false)
	stage = app.tabs.get_current_stage()
	stage.camera.position = Vector2.ZERO
	stage.camera.target_position = Vector2.ZERO
	stage.camera.zoom = Vector2.ONE * 2.0
	stage.camera.target_zoom = stage.camera.zoom
	var path := OS.get_environment("PG_IMAGE_DOCUMENT")
	var original_hash := FileAccess.get_sha256(path) if not path.is_empty() else ""
	var asset: LegacyAsset
	if path.is_empty():
		var image := Image.create(16,16,false,Image.FORMAT_RGBA8)
		image.fill(Color.CORNFLOWER_BLUE)
		asset = StageObjectRegistry.get_scene("legacy_asset").instantiate() as LegacyAsset
		asset.image_base64 = Marshalls.raw_to_base64(image.save_png_to_buffer())
		asset.asset_size = Vector2(160,120)
		asset.position = Vector2(-80,-60)
		stage.add_child(asset)
	else:
		check(await stage.load_from_file(path), "Real image document loads")
		for object in stage.stage_objects():
			if object is LegacyAsset:
				asset = object
				break
	check(asset != null, "Document contains an image")
	if asset == null:
		app.queue_free()
		quit(1)
		return
	stage.camera.position = asset.aabb.get_center()
	stage.camera.target_position = stage.camera.position
	stage.camera.zoom = Vector2.ONE * 2.0
	stage.camera.target_zoom = stage.camera.zoom
	await settle()
	print("IMAGE_INPUT_ENV: ",{"picking":stage.get_viewport().physics_object_picking,"texture_filter":asset.texture_rect.mouse_filter})
	stage.history.clear()
	var before := StageObjectRegistry.capture(stage)
	var asset_id := asset.id
	var origin := asset.global_position
	var point := asset.aabb.get_center()
	motion(point)
	button(point,true)
	await settle()
	check(stage.selected_ids == PackedStringArray([asset.id]),"Click image selects the image")
	check(asset.is_dragging,"Click image starts native drag")
	var displacement := Vector2(90,60)
	motion(point + displacement)
	await settle()
	check(asset.global_position.is_equal_approx(origin + displacement),"Pointer drag moves the image")
	button(point + displacement,false)
	await settle()
	stage.history._finish_commit()
	check(stage.history._undo_stack.size() == 1,"Image drag commits one undo step")
	var after := StageObjectRegistry.capture(stage)
	await stage.history.undo()
	await settle()
	check(StageObjectRegistry.capture(stage) == before,"Undo restores image data and position")
	await stage.history.redo()
	await settle()
	check(StageObjectRegistry.capture(stage) == after,"Redo restores dragged image")
	var moved_asset: LegacyAsset
	for object in stage.stage_objects():
		if object is LegacyAsset and object.id == asset_id: moved_asset = object
	var another := stage.create_text_node("Other", moved_asset.aabb.end + Vector2(120,0),false)
	stage.select_ids(PackedStringArray([another.id]))
	point = moved_asset.aabb.get_center()
	motion(point)
	button(point,true,true)
	await process_frame
	button(point,false,true)
	await settle()
	check(stage.selected_ids.has(another.id) and stage.selected_ids.has(moved_asset.id),"Shift click adds an image to selection")
	button(point,true,false,true)
	await process_frame
	button(point,false,false,true)
	await settle()
	check(stage.selected_ids == PackedStringArray([moved_asset.id]),"Ctrl click selects only the image")
	if not path.is_empty(): check(FileAccess.get_sha256(path) == original_hash,"Source document is unchanged")
	app.queue_free()
	await process_frame
	print("IMAGE_INTERACTION: ","PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)
