extends "res://tests/group_overview_smoke.gd"

func _run() -> void:
	root.size = Vector2i(1280, 800)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	GraphPreferences.set_value("physics", false, false)
	stage.apply_preferences()
	var top := make_node("大标题", Vector2.ZERO)
	var child := make_node("下一层分组", Vector2(-900, 0), top)
	var peer := make_node("下一层任务", Vector2(900, 0), top)
	var deep := make_node("更深层细节", Vector2(-1000, 200), child)
	var deeper := make_node("最深层细节", Vector2(-800, 300), deep)
	var relation := stage.connect_entities(deeper, peer)
	stage.connect_entities(child, deep)
	await zoom_to(2.0)
	# Native canvas ancestors can be separated by a non-CanvasItem node.
	var gap := Node.new()
	deeper.add_child(gap)
	var detached := Polygon2D.new()
	gap.add_child(detached)
	var top_level := Polygon2D.new()
	deeper.add_child(top_level)
	top_level.top_level = true
	var before := JSON.stringify(StageObjectRegistry.capture(stage))
	stage.camera.position = top.aabb.get_center()
	stage.camera.target_position = stage.camera.position
	await zoom_to(.5)
	var overview = stage.group_overview
	check(overview.is_active(top), "Large group reveals a title before tiny headers become unreadable")
	check(overview._summaries.has(top.get_instance_id()), "Root title preview exists")
	check(overview._summaries.has(child.get_instance_id()) and overview._summaries.has(peer.get_instance_id()),
		"Preview shows the immediate next layer of group and ordinary titles")
	check(not overview._summaries.has(deep.get_instance_id()) and not overview._summaries.has(deeper.get_instance_id()),
		"Preview omits deeper levels")
	var links := overview.get_node_or_null("PreviewLinks")
	check(links != null and links.get_child_count() == 1, "Deep endpoints aggregate into one visible next-layer connection")
	if links != null and links.get_child_count() > 0:
		check(links.get_child(0).get_node("Line").points.size() > 2, "Preview connection retains a curved native Line2D")
		check(links.get_child(0).get_node("Head").visible == relation.show_arrow, "Preview retains edge direction")
	check(detached.visibility_layer == 0 and top_level.visibility_layer == 0, "Canvas inheritance breaks and top-level children are also culled")
	check(stage.is_overview_hidden(deeper) and stage.is_overview_hidden(relation), "Collapsed detail cannot steal input")
	check(JSON.stringify(StageObjectRegistry.capture(stage)) == before, "Preview never changes saved layout or containment")
	var panel: Panel = overview._summaries[top.get_instance_id()]
	var initial_fill := preload("res://src/main/continuous_corners.gd").source(panel.get_theme_stylebox("panel")).bg_color
	top.fill_color = Color("#f38ba8")
	overview.refresh()
	check(preload("res://src/main/continuous_corners.gd").source(panel.get_theme_stylebox("panel")).bg_color != initial_fill, "Preview responds to appearance changes without another zoom")
	top.fill_color = Color.TRANSPARENT
	overview.refresh()
	deeper.enter_edit_mode()
	await settle()
	check(not overview.is_active(top) and not stage.is_overview_hidden(deeper), "Editing reveals every ancestor")
	deeper.exit_edit_mode(false)
	await settle()
	check(overview.is_active(top), "Cancel restores the overview")
	if DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("/tmp/pg-next-layer-preview.png")
	await zoom_to(2.0)
	check(overview._summaries.is_empty(), "Zoom in restores original detail")
	check(detached.visibility_layer == 1 and top_level.visibility_layer == 1, "Detached canvas children recover their original layers")
	check(links == null or links.get_child_count() == 0, "Zoom in removes transient preview links")

	# A normal directed tree has no spatial group frames or persisted topic parent.
	var branch := make_node("普通分支标题", Vector2(4000, 0))
	var first := make_node("直接子标题一", Vector2(4500, -200))
	var second := make_node("直接子标题二", Vector2(4500, 200))
	var leaf := make_node("深层文本", Vector2(5000, -200))
	stage.connect_entities(branch, first)
	stage.connect_entities(branch, second)
	stage.connect_entities(first, leaf)
	await zoom_to(2.0)
	var tree_before := JSON.stringify(StageObjectRegistry.capture(stage))
	stage.camera.position = Vector2(4400, 0)
	stage.camera.target_position = stage.camera.position
	await zoom_to(.5)
	check(overview.is_active(branch), "Ungrouped tree branches also enter overview")
	check(overview._summaries.has(branch.get_instance_id()) and overview._summaries.has(first.get_instance_id()),
		"Branch preview includes root and next layer")
	check(not overview._summaries.has(leaf.get_instance_id()), "Branch preview omits deeper text")
	check(branch.container == null and first.topic_parent == null, "View inference does not invent persisted containment")
	check(JSON.stringify(StageObjectRegistry.capture(stage)) == tree_before, "Branch overview leaves document unchanged")

	# Flat spatial groups can contain several graph levels.
	var flat := make_node("平面分组", Vector2(11000, 0))
	var flat_root := make_node("分支根", Vector2(11100, 0), flat)
	var flat_child := make_node("第二层", Vector2(11500, 0), flat)
	var flat_leaf := make_node("第三层", Vector2(11900, 0), flat)
	stage.connect_entities(flat_root, flat_child)
	stage.connect_entities(flat_child, flat_leaf)
	await zoom_to(2.0)
	var flat_before := StageObjectRegistry.capture(stage)
	await zoom_to(.5)
	check(overview._summaries.has(flat.get_instance_id()) and overview._summaries.has(flat_root.get_instance_id()), "Flat spatial group shows its immediate graph root")
	check(not overview._summaries.has(flat_child.get_instance_id()) and not overview._summaries.has(flat_leaf.get_instance_id()), "Graph depth inside a flat container is not mistaken for immediate titles")
	check(StageObjectRegistry.capture(stage) == flat_before and flat_leaf.container == flat, "Graph preview depth does not rewrite spatial containment")

	# Cycles and ambiguous multiple parents must not be treated as a tree.
	var cycle_a := make_node("循环甲", Vector2(8000, 0))
	var cycle_b := make_node("循环乙", Vector2(8300, 0))
	stage.connect_entities(cycle_a, cycle_b)
	stage.connect_entities(cycle_b, cycle_a)
	await settle()
	check(not overview.is_active(cycle_a) and not overview.is_active(cycle_b), "Cycles remain ordinary graph detail")
	var ambiguous := make_node("多父节点", Vector2(8400, 300))
	stage.connect_entities(cycle_a, ambiguous)
	stage.connect_entities(cycle_b, ambiguous)
	await settle()
	check(not overview._preview_parents.has(ambiguous.get_instance_id()), "Multiple incoming parents are not inferred as containment")
	app.queue_free()
	await process_frame
	print("NEXT_LAYER_PREVIEW: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
