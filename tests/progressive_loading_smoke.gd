extends SceneTree

var failures: Array[String] = []
var finished := false
var partial_frames := 0
var first_id := ""
var started := 0
var first_visible_usec := 0


func _initialize() -> void:
	call_deferred("_run")


func check(value: bool, message: String) -> void:
	if not value:
		failures.append(message)
		push_error(message)


func _load(stage: Stage, path: String) -> void:
	check(await stage.load_from_file(path), "Document loads")
	finished = true


func _run() -> void:
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	for i in 4:
		await process_frame
	var objects := []
	for i in 120:
		objects.append({"type": "text_node", "transform": {"position": [i * 180.0, 0.0],
			"rotation": 0.0, "scale": [1.0, 1.0]},
			"properties": {"id": JSON.from_native("node-%d" % i), "text": JSON.from_native("主题 %d" % i), "use_theme_border": true}})
		if i > 0:
			objects.append({"type": "line_edge", "transform": {"position": [0.0, 0.0]},
				"properties": {"id": JSON.from_native("edge-%d" % i), "source": {"$ref": "node-%d" % (i - 1)},
					"target": {"$ref": "node-%d" % i}, "show_arrow": true}})
	objects.reverse()
	var path := "/tmp/pg-progressive-test.prg"
	check(ProjectFile.save(path, {"objects": objects}, {"position": [0.0, 0.0], "zoom": 0.5}).ok, "Fixture saves")
	var stage: Stage = app.tabs.get_current_stage()
	stage.child_entered_tree.connect(func(child):
		if child is StageObject:
			child.freeze = true
			if first_id.is_empty():
				first_id = child.id)
	started = Time.get_ticks_usec()
	_load(stage, path)
	var frames := 0
	while not finished and frames < 2000:
		await process_frame
		frames += 1
		var count := stage.stage_objects().size()
		if count > 0 and count < objects.size():
			partial_frames += 1
			if first_visible_usec == 0 and stage.stage_objects()[0].modulate.a > 0.01:
				first_visible_usec = Time.get_ticks_usec() - started
	check(finished, "Load completes within frame limit")
	check(partial_frames > 2, "Graph visibly unfolds over multiple frames")
	check(first_id == "node-0", "Camera center appears before distant branches regardless of archive order")
	check(stage.stage_objects().size() == objects.size(), "All objects survive progressive restoration")
	check(not stage.is_dirty(), "Completed load is clean")
	var by_id := {}
	for object in stage.stage_objects():
		by_id[object.id] = object
	for i in range(1, 120):
		var edge: LineEdge = by_id.get("edge-%d" % i)
		check(edge != null and edge.source == by_id.get("node-%d" % (i - 1)) and edge.target == by_id.get("node-%d" % i), "References remain intact")
	for i in 120:
		check(by_id["node-%d" % i].position.is_equal_approx(Vector2(i * 180.0, 0)), "Animation leaves saved world positions intact")
	print("PROGRESSIVE_LOAD: ", JSON.stringify({"partial_frames": partial_frames, "first_visible_ms": first_visible_usec / 1000.0, "total_ms": (Time.get_ticks_usec() - started) / 1000.0}))
	# Edits/undo use the settled graph, with no replay of the loading animation.
	var center: TextNode = by_id["node-0"]
	stage.history.begin_transaction()
	center.text = "edited"
	stage.history._finish_commit()
	await stage.history.undo()
	check(not stage.is_loading and stage.stage_objects().size() == objects.size(), "Undo restores without progressive loading")
	var restored_center: TextNode
	for object in stage.stage_objects():
		if object.id == "node-0":
			restored_center = object
	check(restored_center != null and restored_center.text == "主题 0", "Undo retains original center text")
	# The tab may disappear while parsing, or while objects are being created.
	var cancel_path := "/tmp/pg-progressive-cancel.prg"
	check(ProjectFile.save(cancel_path, {"objects": objects}, {"position": [0.0, 0.0], "zoom": 0.5}).ok, "Cancellation fixture saves")
	for close_after_first_node in [false, true]:
		app.tabs.load_files(PackedStringArray([cancel_path]))
		var loading: Stage = app.tabs.get_current_stage()
		if close_after_first_node:
			while is_instance_valid(loading) and loading.stage_objects().is_empty():
				await process_frame
		check(loading.is_loading, "Cancellation exercises an unfinished load")
		check(not loading.save_to_file("/tmp/pg-partial-must-not-save.prg"), "Partial graphs cannot overwrite files")
		app._run("closeTab")
		for i in 25:
			await process_frame
		check(not is_instance_valid(loading), "Closing a loading tab releases its scene")
	var next_path := "/tmp/pg-progressive-next.prg"
	check(ProjectFile.save(next_path, {"objects": [objects.back()]}, {"position": [0.0, 0.0], "zoom": 0.5}).ok, "Next fixture saves")
	app.tabs.load_files(PackedStringArray([cancel_path, next_path]))
	app._run("closeTab")
	var next_stage: Stage
	for i in 600:
		await process_frame
		var current: Stage = app.tabs.get_current_stage()
		if current.current_file_path == next_path and not current.is_loading:
			next_stage = current
			break
	check(next_stage != null and next_stage.stage_objects().size() == 1, "Cancelling one file continues the remaining batch")
	DirAccess.remove_absolute(next_path)
	DirAccess.remove_absolute(cancel_path)
	await _check_first_frame_groups(app)
	# Read errors leave the previous document intact and unlock editing.
	var stage_ref: Stage = app.tabs.get_current_stage()
	var previous_objects := stage_ref.stage_objects().size()
	check(not await stage_ref.load_from_file("/tmp/pg-missing-load.prg"), "Missing file is rejected")
	check(not stage_ref.is_loading and not stage_ref.history._busy, "Failed loading unlocks stage")
	check(stage_ref.stage_objects().size() == previous_objects, "Read failure preserves existing graph")
	DirAccess.remove_absolute(path)
	app.queue_free()
	await process_frame
	print("PROGRESSIVE_LOAD: ", "PASS" if failures.is_empty() else failures)
	quit(0 if failures.is_empty() else 1)


func _check_first_frame_groups(app: Node) -> void:
	var records := []
	for i in 400:
		var identifier := "overview-%d" % i
		var parent := "overview-1" if i > 1 else "overview-0"
		var props := {"id": JSON.from_native(identifier), "text": JSON.from_native("第一行\n第二行" if i == 0 else "成员"),
			"font_size": JSON.from_native(24)}
		if i > 0:
			props.container = {"$ref": parent}
		records.append({"type": "text_node", "transform": {"position": [(i % 10) * 45.0, float(i % 5) * 36.0]}, "properties": props})
	records.reverse()
	var path := "/tmp/pg-progressive-overview.prg"
	check(ProjectFile.save(path, {"objects": records}, {"position": [220.0, 40.0], "zoom": 0.2}).ok, "Overview fixture saves")
	var stage: Stage = app.tabs.get_current_stage()
	stage.start_initial_load(path)
	var before_rects := {}
	while stage.is_loading:
		await process_frame
		if stage.has_meta("loading_overview_revision") and stage.stage_objects().size() < records.size():
			for object in stage.stage_objects():
				if object is TextNode and object._container_active:
					check(stage.group_overview._summaries.has(object.get_instance_id()), "Group preview exists before details finish loading")
					before_rects[object.id] = object.aabb
				else:
					check(stage.group_overview.is_hidden(object) and object.visibility_layer == 0, "Internal details stay hidden during construction")
	check(not before_rects.is_empty(), "Partial loading exercises group previews")
	for object in stage.stage_objects():
		if before_rects.has(object.id):
			var before: Rect2 = before_rects[object.id]
			check(before.position.distance_to(object.aabb.position) * stage.camera.zoom.x < 1.0 and before.size.distance_to(object.aabb.size) * stage.camera.zoom.x < 1.0, "Multiline group bounds remain stable after loading")
	check(stage.group_overview._summaries.size() == 2 and not stage.is_dirty(), "Nested previews survive completed load cleanly")
	DirAccess.remove_absolute(path)
