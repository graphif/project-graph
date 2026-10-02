extends SceneTree

var failures: Array[String] = []
var app
var stage: Stage


func _initialize() -> void:
	call_deferred("_run")


func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)


func settle() -> void:
	for frame in 6:
		await physics_frame
		await process_frame


func zoom_to(value: float) -> void:
	stage.camera.zoom = Vector2.ONE * value
	stage.camera.target_zoom = stage.camera.zoom
	await settle()


func node_named(text: String) -> TextNode:
	for object in stage.stage_objects():
		if object is TextNode and object.text == text:
			return object
	return null


func make_node(text: String, position: Vector2, container: Entity = null) -> TextNode:
	var node := stage.create_text_node(text, position, false)
	node.freeze = true
	node.container = container
	return node


func _run() -> void:
	root.size = Vector2i(1920, 1080)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", false, false)
	stage.apply_preferences()
	stage.camera.position = Vector2.ZERO
	stage.camera.target_position = Vector2.ZERO
	var group := make_node("产品设计", Vector2(-240, 0))
	group.fill_color = Color("#c50d3c")
	var a := make_node("需求", Vector2(-290, 0), group)
	var b := make_node("实现", Vector2(-190, 0), group)
	var other := make_node("研发", Vector2(240, 0))
	other.fill_color = Color("#336699")
	var c := make_node("测试", Vector2(190, 0), other)
	var d := make_node("发布", Vector2(290, 0), other)
	var inner := stage.connect_entities(a, b)
	inner.text = "依赖"
	var group_relation := stage.connect_entities(group, a)
	group_relation.text = "包含"
	var cross := stage.connect_entities(b, c)
	cross.text = "协作"
	var outside := make_node("外部节点", Vector2(640, 0))
	var outgoing := stage.connect_entities(d, outside)
	await zoom_to(2.0)
	var overview = stage.group_overview
	check(not overview.is_active(group), "Normal zoom shows full detail")
	var before := StageObjectRegistry.capture(stage)
	var original_filter := a.label.mouse_filter
	var original_pickable := a.input_pickable
	await zoom_to(1.0)
	check(not overview.is_active(group), "Innermost group keeps details at 50 percent")
	await zoom_to(0.5)
	check(overview.is_active(group) and overview.is_active(other), "Innermost groups reveal titles after zooming out further")
	check(stage.is_overview_hidden(a) and stage.is_overview_hidden(b), "Group members are covered for interaction")
	check(stage.is_overview_hidden(inner), "Internal edges and captions cannot be picked through the cover")
	check(stage.is_overview_hidden(group_relation), "Group-to-member edge is internal to the overview")
	check(not stage.is_overview_hidden(cross) and not stage.is_overview_hidden(outgoing), "Cross-group and outgoing edges remain")
	check(a.is_visible_in_tree() and inner.is_visible_in_tree(), "Overview leaves physics visibility unchanged")
	check(a.visibility_layer == 0 and a.label.visibility_layer == 1, "Overview hides ordinary member rendering instead of exposing every node")
	var cover: Panel = overview._summaries[group.get_instance_id()]
	var cover_style = preload("res://src/main/continuous_corners.gd").source(cover.get_theme_stylebox("panel"))
	check(is_equal_approx(cover_style.bg_color.a, 0.5), "Overview cover reveals internal detail at half opacity")
	check(not a.input_pickable and a.label.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Hidden members cannot steal native input")
	check(inner.visibility_layer == 0 and inner.get_node("Caption/Label").visibility_layer == 1, "Overview hides internal captions with their edges")
	check(inner.get_node("Caption").z_index == 26, "Ancestor culling preserves caption foreground order")
	check(cross.get_node("Caption/Label").visibility_layer != 0, "Cross-group caption remains visible")
	check(stage.get_node("LineEdgeCreator")._get_entity_at(a.aabb.get_center()) == group, "Connection picking resolves to the group")
	check(stage.get_node("EntityLayerMover")._target_at(a.aabb.get_center(), [] as Array[Entity]) == group, "Layer picking resolves to the group")
	check(not stage.get_node("StageObjectSlicer")._get_stage_objects().has(a), "Cutting cannot target hidden members")
	check(not stage.get_node("StageObjectSlicer")._get_stage_objects().has(inner), "Cutting cannot target hidden internal edges")
	stage.select_all()
	check(stage.selected_ids.has(group.id) and not stage.selected_ids.has(a.id), "Select all uses visible groups")
	stage.select_ids(PackedStringArray())
	check(JSON.stringify(before) == JSON.stringify(StageObjectRegistry.capture(stage)), "Zoom does not change saved objects or geometry")

	# Clicking in the old member rectangle must select the summary instead.
	await click_world(a.aabb.get_center())
	check(stage.selected_ids == PackedStringArray([group.id]), "Native click on member area selects group")
	await settle()
	if DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-group-overview.png")

	# An edit command always reveals the existing native editor, with original selection.
	a.enter_edit_mode()
	await settle()
	check(not overview.is_active(group) and not stage.is_overview_hidden(a), "Editing reveals covered ancestors")
	check(a.text_edit.has_focus() and a.label.mouse_filter == original_filter, "Editor focus and mouse selection survive reveal")
	a.text_edit.select_all()
	check(a.text_edit.get_selected_text() == a.text, "Native select all still works")
	a.exit_edit_mode(false)
	await settle()
	check(overview.is_active(group), "Overview returns after editing ends")

	# Double-clicking the title edits the group through the same native TextEdit.
	await click_world(group.aabb.get_center(), true)
	check(group._editing and group.text_edit.has_focus(), "Summary double click opens the group editor")
	group.exit_edit_mode(false)
	await settle()
	await zoom_to(2.0)
	check(not stage.is_overview_hidden(a) and a.visibility_layer == 1 and a.label.visibility_layer == 1, "Zoom in restores rendering layers")
	check(a.input_pickable == original_pickable and a.label.mouse_filter == original_filter, "Zoom in restores native picking")
	check(inner.visibility_layer == 1 and inner.get_node("Caption/Label").visibility_layer == 1, "Zoom in restores internal edge captions")
	check(inner.get_node("Caption").z_index == 26, "Zoom in restores caption foreground order")
	check(JSON.stringify(before) == JSON.stringify(StageObjectRegistry.capture(stage)), "Repeated overview and edit cancellation leave document unchanged")

	# Nested groups retain inner previews beneath outer covers, without raw members.
	var outer := make_node("项目总览", Vector2.ZERO)
	group.container = outer
	other.container = outer
	await zoom_to(0.9)
	check(not overview.is_active(outer), "Large screen bounds retain detail even below the camera threshold")
	check(stage.camera.min_zoom <= 0.02, "Canvas can zoom out to one percent for large diagrams")
	# Outer groups accept a larger screen footprint instead of becoming tiny.
	await zoom_to(0.5)
	check(overview.is_active(outer) and stage.is_overview_hidden(group), "Active outer group hides nested groups")
	check(stage.is_overview_hidden(cross) and not stage.is_overview_hidden(outgoing), "Common active ancestor hides only internal edges")
	check(overview._summaries.size() == 3, "Outer overview retains both child-group previews")
	check_nested_previews(overview, [group, other, outer])
	check(other.visibility_layer == 0 and c.visibility_layer == 0, "Child-group summaries replace small headers and ordinary nodes")
	await click_world(a.aabb.get_center())
	check(stage.selected_ids == PackedStringArray([outer.id]), "Covered child preview cannot steal input from the outer group")
	stage.select_ids(PackedStringArray())
	var outermost := make_node("更外层", Vector2.ZERO)
	outer.container = outermost
	await zoom_to(0.68)
	check(overview.is_active(outermost), "Third-level title appears while its frame still occupies a substantial viewport area")
	check(stage.is_overview_hidden(outer), "Outermost group takes over nested interaction")
	check(overview._summaries.size() == 2, "Third-level overview keeps only its immediate child preview")
	check_nested_previews(overview, [outer, outermost])
	check(not overview._summaries.has(group.get_instance_id()) and not overview._summaries.has(other.get_instance_id()), "Deeper group previews are omitted")
	a.enter_edit_mode()
	await settle()
	check(not overview.is_active(group) and not overview.is_active(outer) and not overview.is_active(outermost), "Editing inside nested previews reveals every ancestor")
	check(a.label.visibility_layer == 1 and a.text_edit.has_focus(), "Nested editing restores the original rendering and focus")
	a.exit_edit_mode(false)
	await settle()
	check(overview._summaries.size() == 2, "One-layer previews return after edit cancellation")
	if DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-group-overview-nested.png")
	outer.container = null
	outermost.queue_free()
	await zoom_to(0.5)
	var nested_snapshot := StageObjectRegistry.capture(stage)
	await StageObjectRegistry.restore(stage, nested_snapshot)
	await settle()
	check(overview._summaries.size() == 3, "Snapshot restoration rebuilds every group preview without stale nodes")
	check_nested_previews(overview, [node_named("产品设计"), node_named("研发"), node_named("项目总览")])
	check(stage.is_overview_hidden(node_named("需求")), "Restored descendants respect overview")
	stage.delete_objects([node_named("项目总览")])
	await settle()
	check(overview._summaries.is_empty(), "Deleting a group cleans up transient summaries")
	await stage.history.undo()
	await settle()
	check(node_named("项目总览") != null and overview._summaries.size() == 3, "Undo restores group and nested previews")
	await zoom_to(2.0)
	check(not stage.is_overview_hidden(node_named("需求")), "Restored content reappears when zoomed in")
	var document_path := OS.get_environment("PG_OVERVIEW_DOCUMENT")
	if not document_path.is_empty():
		await check_document_preview(document_path)
	app.queue_free()
	await process_frame
	print("GROUP_OVERVIEW: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)


func check_document_preview(path: String) -> void:
	var result := ProjectFile.load(path)
	check(result.ok, "Overview fixture loads successfully")
	if not result.ok:
		return
	await StageObjectRegistry.restore(stage, result.graph)
	await settle()
	var root_group: TextNode
	var groups: Array[TextNode] = []
	for object in stage.stage_objects():
		if object is TextNode:
			object.freeze = true
			if object._container_active:
				groups.append(object)
				if not is_instance_valid(object.container):
					root_group = object
	check(root_group != null, "Overview fixture contains a root group")
	if root_group == null:
		return
	stage.camera.position = root_group.aabb.get_center()
	stage.camera.target_position = stage.camera.position
	await zoom_to(2.0)
	var before := StageObjectRegistry.capture(stage)
	await zoom_to(0.68)
	var overview = stage.group_overview
	check(overview.is_active(root_group), "Document outer group enters overview")
	var previews: Array = []
	for identifier in overview._preview_nodes:
		previews.append(overview._preview_nodes[identifier])
	check(overview._summaries.size() == previews.size(), "Document shows only immediate-layer previews")
	for object in previews:
		check(overview._summaries.has(object.get_instance_id()), "Every visible-layer title has a preview")
	for object in stage.stage_objects():
		if object is TextNode and not object._container_active:
			check(object.visibility_layer == 0, "Document overview omits ordinary body rendering: " + object.text)
		elif object is LineEdge:
			check(object.visibility_layer == 0, "Document overview omits internal edges")
	check(JSON.stringify(before) == JSON.stringify(StageObjectRegistry.capture(stage)), "Document zoom preserves saved content")
	if DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-group-overview-document.png")
	await zoom_to(2.0)
	check(overview._summaries.is_empty(), "Document zoom-in removes temporary previews")
	for object in stage.stage_objects():
		if object is TextNode:
			check(object.label.visibility_layer == 1, "Document zoom-in restores original content")


func check_nested_previews(overview: Node2D, groups: Array) -> void:
	for group in groups:
		var key: int = group.get_instance_id()
		check(overview.is_active(group), "Every group covered by an overview uses its own preview")
		if not overview._summaries.has(key):
			check(false, "Missing nested preview: " + group.text)
			continue
		var panel: Panel = overview._summaries[key]
		check(panel.is_visible_in_tree() and panel.get_node("Title").visible, "Nested preview title stays rendered: " + group.text)
		if is_instance_valid(group.container) and overview._summaries.has(group.container.get_instance_id()):
			var parent_panel: Panel = overview._summaries[group.container.get_instance_id()]
			check(panel.z_index > parent_panel.z_index, "Immediate child preview draws above the parent cover")
			check(panel.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Covered preview is only a visual, not an input target")
			check(group.visibility_layer == 0, "Covered group does not revert to its tiny original title")


func click_world(world_point: Vector2, double_click := false) -> void:
	var viewport := stage.get_viewport()
	var container := viewport.get_parent() as Control
	var local_point := stage.get_canvas_transform() * world_point
	var screen_point := container.get_global_transform_with_canvas() * (local_point * container.size / Vector2(viewport.size))
	var motion := InputEventMouseMotion.new()
	motion.position = screen_point
	motion.global_position = screen_point
	Input.warp_mouse(screen_point)
	Input.parse_input_event(motion)
	Input.flush_buffered_events()
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.pressed = true
	click.double_click = double_click
	click.position = screen_point
	click.global_position = screen_point
	Input.parse_input_event(click)
	Input.flush_buffered_events()
	await process_frame
	click = click.duplicate()
	click.pressed = false
	click.double_click = false
	Input.parse_input_event(click)
	Input.flush_buffered_events()
	await settle()
