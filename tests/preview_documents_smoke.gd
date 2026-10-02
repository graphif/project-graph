extends "res://tests/group_overview_smoke.gd"
func _run() -> void:
	root.size = Vector2i(1280, 800)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	for file: String in ["教程操作.prg", "教程节点.prg", "tutorial-shortcut-keys-3.1.prg", "思维导图.prg"]:
		var path := "/home/waya/Desktop/project/" + file
		var hash_before := FileAccess.get_sha256(path)
		print("PREVIEW_FIXTURE_LOAD_BEGIN ", file)
		check(await stage.load_from_file(path), "Fixture opens: " + file)
		print("PREVIEW_FIXTURE_LOADED ", file)
		for object in stage.stage_objects():
			object.freeze = true
		stage.select_ids(PackedStringArray())
		var snapshot := StageObjectRegistry.capture(stage)
		for zoom in [2.0, .5, .125, .02]:
			await zoom_to(zoom)
			for identifier in stage.group_overview._summaries:
				check(stage.group_overview._preview_nodes.has(identifier), "Preview includes only the selected visible layer")
			check(StageObjectRegistry.capture(stage) == snapshot, "Fixture zoom preserves document")
			if zoom == .125:
				await RenderingServer.frame_post_draw
				root.get_texture().get_image().save_png("/tmp/pg-preview-" + file + ".png")
		check(FileAccess.get_sha256(path) == hash_before, "Source fixture is unchanged")
		print("PREVIEW_FIXTURE ", file, " objects=", stage.stage_objects().size())
	app.queue_free()
	await process_frame
	print("PREVIEW_FIXTURES: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
