extends Node
## Short-lived scene-tree job: parsing owns no live nodes; construction stays on main.
signal completed(ok: bool)
const Plan = preload("res://src/project_load_plan.gd")
const Reveal = preload("res://src/load_branch_reveal.gdshader")
const FRAME_BUDGET_USEC := 12000
const MAX_BATCH := 96
const REVEAL_SECONDS := 0.18

class ParseJob extends RefCounted:
	var result := {"ok": false, "error": "无法准备项目，项目数据无效"}
	func run(path: String, viewport_size: Vector2, default_zoom: float) -> void:
		var loaded := ProjectFile.load(path)
		if not loaded.ok:
			result = loaded
			return
		var plan := Plan.build(loaded.graph, viewport_size, default_zoom)
		if not plan.has("ordered"):
			return
		result = loaded
		result["path"] = path
		result["plan"] = plan

var _stage_ref: WeakRef
var _job: ParseJob
var _task := -1
var _phase := 0
var _result := {}
var _ordered: Array = []
var _cursor := 0
var _by_id := {}
var _waiting := {}
var _objects: Array[StageObject] = []
var _snapshot := {"objects": []}
var _comparison := {}
var _tool_modes := {}
var _status: Label
var _elapsed := 0.0
var _last_reveal := 0.0
var _started_usec := 0
var _reveal_index := 0
var _view_finished_usec := 0


func start(stage: Node, path: String) -> void:
	_stage_ref = weakref(stage)
	_started_usec = Time.get_ticks_usec()
	_job = ParseJob.new()
	_status = Label.new()
	_status.text = "正在读取项目…"
	_status.position = Vector2(20, 16)
	var status_font := preload("res://assets/fonts/PingFang-SC-Regular.ttf").duplicate() as FontFile
	status_font.oversampling = 1.0
	_status.add_theme_font_override("font", status_font)
	_status.add_theme_font_size_override("font_size", 18)
	_status.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.get_node("CanvasLayer").add_child(_status)
	process_mode = Node.PROCESS_MODE_ALWAYS
	process_priority = 100
	_task = WorkerThreadPool.add_task(_job.run.bind(path, stage.get_viewport_rect().size, stage.camera.target_zoom.x), false, "Read graph document")


func _process(delta: float) -> void:
	_elapsed += delta
	var stage: Variant = _stage_ref.get_ref()
	if stage == null or not stage.is_inside_tree() or not stage.is_loading:
		if _task >= 0 and not WorkerThreadPool.is_task_completed(_task):
			return
		_join_task()
		_finish(false)
		return
	if _phase == 0:
		_status.text = "正在读取项目" + ".".repeat(1 + int(_elapsed * 3) % 3)
		if not WorkerThreadPool.is_task_completed(_task):
			return
		_join_task()
		_result = _job.result
		_job = null
		if not _result.ok:
			stage.file_error.emit(_result.error)
			_finish(false)
			return
		_begin_restore(stage)
		return
	if _phase == 1:
		_build_batch(stage)
	elif _phase == 2:
		_phase = 3
	elif _phase == 3:
		_capture_batch(stage)
	elif _phase == 4 and _elapsed >= _last_reveal:
		stage.complete_initial_load(_result, _snapshot, _comparison)
		_finish(true)


func _join_task() -> void:
	if _task >= 0:
		WorkerThreadPool.wait_for_task_completion(_task)
		_task = -1


func _begin_restore(stage: Node) -> void:
	stage.finish_interaction()
	for tool_name in ["EntityLayerMover", "NodeRepulsion", "LineEdgeCreator", "StageObjectSlicer"]:
		var tool := stage.get_node(tool_name)
		_tool_modes[tool_name] = tool.process_mode
		tool.process_mode = Node.PROCESS_MODE_DISABLED
	for child in stage.get_children():
		if child is StageObject:
			stage.remove_child(child)
			child.queue_free()
	stage.group_overview.invalidate()
	stage.group_overview.refresh()
	_ordered = _result.plan.ordered
	stage.set_meta("load_canvas_font", _result.plan.font)
	var camera: Camera2D = stage.camera
	var state: Dictionary = _result.graph.get("camera", {})
	camera.target_position = _result.plan.center
	if _result.get("legacy", false):
		var bounds: Rect2 = _result.plan.bounds
		var available: Vector2 = stage.get_viewport_rect().size - Vector2(160, 140)
		var zoom := clampf(minf(available.x / maxf(bounds.size.x, 1),
			available.y / maxf(bounds.size.y, 1)), camera.min_zoom, camera.max_zoom)
		camera.target_zoom = Vector2.ONE * zoom
	else:
		var zoom := clampf(float(state.get("zoom", camera.target_zoom.x)), camera.min_zoom, camera.max_zoom)
		camera.target_zoom = Vector2.ONE * zoom
	camera.position = camera.target_position
	camera.zoom = camera.target_zoom
	camera.velocity = Vector2.ZERO
	_phase = 1


func _build_batch(stage: Node) -> void:
	var deadline := Time.get_ticks_usec() + FRAME_BUDGET_USEC
	var count := 0
	var revealed: Array[Dictionary] = []
	while _cursor < _ordered.size() and count < MAX_BATCH:
		if _cursor == _result.plan.groups.size():
			stage.group_overview.refresh()
			stage.set_meta("loading_overview_revision", stage.layout_revision)
		var entry: Dictionary = _ordered[_cursor]
		_cursor += 1
		count += 1
		var references: Array[Dictionary] = []
		var object := StageObjectRegistry.instantiate_record(entry.record, references)
		if object != null:
			if object is TextNode:
				object.set_meta("prepared_canvas_font", _result.plan.font)
			stage.add_child(object)
			stage.apply_object_preferences(object)
			_objects.append(object)
			if not object.id.is_empty() and not _by_id.has(object.id):
				_by_id[object.id] = object
			for reference in references:
				if _by_id.has(reference.reference_id):
					object.set(reference.property, _by_id[reference.reference_id])
				else:
					if not _waiting.has(reference.reference_id):
						_waiting[reference.reference_id] = []
					_waiting[reference.reference_id].append(reference)
			for reference in _waiting.get(object.id, []):
				if is_instance_valid(reference.object):
					reference.object.set(reference.property, object)
			_waiting.erase(object.id)
			if object is TextNode and _result.plan.groups.has(object.id):
				object.set_loading_container_rect(_result.plan.rects[object.id])
			if stage.has_meta("loading_overview_revision"):
				stage.group_overview.register_loading_object(object)
			revealed.append({"object": object, "reverse": bool(entry.reverse)})
		if Time.get_ticks_usec() >= deadline:
			break
	stage.group_overview.refresh()
	for entry in revealed:
		var object: StageObject = entry.object
		var panel: Variant = stage.group_overview._summaries.get(object.get_instance_id())
		if panel != null or not stage.group_overview.is_hidden(object):
			var seconds := (Time.get_ticks_usec() - _started_usec) / 1000000.0
			var scheduled := 2.2 * float(_reveal_index) / maxf(1, _result.plan.visible_count - 1)
			var delay := maxf(0, scheduled - seconds)
			_reveal_index += 1
			if panel != null:
				_fade(panel, delay)
			else:
				_reveal(object, bool(entry.reverse), delay)
			_last_reveal = maxf(_last_reveal, _elapsed + delay + REVEAL_SECONDS * 2.0)
	if _cursor >= _result.plan.visible_count and _view_finished_usec == 0:
		_view_finished_usec = maxi(Time.get_ticks_usec(), _started_usec + 2400000)
		stage.set_meta("load_view_complete_usec", _view_finished_usec - _started_usec)
	_status.text = ("正在展开 %d / %d" if _cursor < _result.plan.visible_count else "正在准备编辑 %d / %d") % [_cursor, _ordered.size()]
	if _cursor == _ordered.size():
		stage.remove_meta("loading_overview_revision")
		stage.group_overview.invalidate()
		stage.get_node("EntityLayerMover").reset_tracking()
		stage.remove_meta("caption_peer_fractions")
		stage.caption_peers_changed.emit()
		stage.remove_meta("loading_caption_peers_dirty")
		_restore_tools(stage)
		_cursor = 0
		_phase = 2


func _capture_batch(stage: Node) -> void:
	var deadline := Time.get_ticks_usec() + FRAME_BUDGET_USEC
	var count := 0
	while _cursor < _objects.size() and count < 64:
		var object := _objects[_cursor]
		_cursor += 1
		count += 1
		_snapshot.objects.append(StageObjectRegistry._serialize_object(object))
		_comparison[object.id] = StageObjectRegistry.object_comparison_state(object)
		if Time.get_ticks_usec() >= deadline:
			break
	_status.text = "正在完成载入…"
	if _cursor == _objects.size():
		_phase = 4


func _reveal(object: StageObject, reverse: bool, delay := 0.0) -> void:
	if object is LineEdge:
		var material := ShaderMaterial.new()
		material.shader = Reveal
		material.set_shader_parameter("progress", 0.0)
		material.set_shader_parameter("reverse", reverse)
		var previous: Material = object.line.material
		object.line.material = material
		var tween := object.create_tween()
		if delay > 0.0:
			tween.tween_interval(delay)
		tween.tween_property(material, "shader_parameter/progress", 1.0, REVEAL_SECONDS)
		tween.tween_callback(func(): object.line.material = previous)
		_fade(object.arrow_head, delay + REVEAL_SECONDS * 0.75)
		_fade(object.get_node("Caption"), delay + REVEAL_SECONDS * 0.5)
	else:
		_fade(object, delay)


func _fade(item: CanvasItem, delay := 0.0) -> void:
	var color := item.modulate
	item.modulate.a = 0.0
	var tween := item.create_tween()
	if delay > 0.0:
		tween.tween_interval(delay)
	tween.tween_property(item, "modulate", color, REVEAL_SECONDS)


func _restore_tools(stage: Node) -> void:
	for tool_name in _tool_modes:
		stage.get_node(tool_name).process_mode = _tool_modes[tool_name]
	_tool_modes.clear()


func _finish(ok: bool) -> void:
	var stage: Variant = _stage_ref.get_ref()
	if stage != null and stage.is_inside_tree():
		_restore_tools(stage)
		stage.is_loading = false
		stage.loading_file_path = ""
		stage.history._busy = false
	if is_instance_valid(_status):
		_status.queue_free()
	completed.emit(ok)
	queue_free()


func _exit_tree() -> void:
	# Only shutdown can interrupt this root-owned job. Tab closure is polled above.
	_join_task()
