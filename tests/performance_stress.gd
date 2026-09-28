extends SceneTree
var stage: Stage
var result := {}
var output := ""
func _initialize() -> void:
	call_deferred("_run")
func checkpoint(phase: String) -> void:
	result["phase"] = phase
	var file = FileAccess.open(output, FileAccess.WRITE)
	file.store_string(JSON.stringify(result))
func _run() -> void:
	var args = OS.get_cmdline_user_args()
	var count := int(args[0]) if args.size() else 100
	var linked := args.size() > 1 and args[1] == "linked"
	output = "/tmp/pg-stress-%d-%s.json" % [count, "linked" if linked else "plain"]
	result = {"nodes":count, "linked":linked,"renderer":RenderingServer.get_current_rendering_method(),"display":DisplayServer.get_name(),"engine":Engine.get_version_info().string}
	checkpoint("startup")
	GraphPreferences.set_value("welcome", false, false)
	GraphPreferences.set_value("theme", "mocha", false)
	var app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	root.size = Vector2i(1280,800)
	for i in 30:
		await process_frame
	stage = app.tabs.get_current_stage()
	var nodes: Array[TextNode] = []
	var columns := maxi(1,ceili(sqrt(float(count))))
	checkpoint("generate")
	for i in count:
		var node: TextNode = StageObjectRegistry.get_scene("text_node").instantiate()
		node.text = "节点 %d Project Graph" % i
		node.position = Vector2((i % columns) * 400, (i / columns) * 120)
		stage.add_child(node)
		nodes.append(node)
		if i % 32 == 31:
			await process_frame
	if linked:
		for i in maxi(0,count - 1):
			var edge: LineEdge = StageObjectRegistry.get_scene("line_edge").instantiate()
			edge.source = nodes[i]
			edge.target = nodes[i+1]
			edge.use_theme_color = true
			stage.add_child(edge)
			if i % 32 == 31:
				await process_frame
	result["spacing_x"] = 400
	result["edges"] = maxi(0,count-1) if linked else 0
	stage.apply_preferences()
	var center := Vector2(columns*400,ceilf(float(count)/columns)*120)*0.5
	var zoom_value := minf(1.0,900.0/maxf(columns*400,1))
	stage.camera.target_zoom = Vector2.ONE*zoom_value
	stage.camera.zoom = stage.camera.target_zoom
	stage.camera.target_position = center
	stage.camera.position = center
	for i in 8:
		await process_frame
	result["max_node_width"] = 0.0
	for node in nodes:
		result["max_node_width"] = maxf(result["max_node_width"], node.aabb.size.x)
	var path = "/tmp/pg-stress-%d-%s.prg" % [count,"linked" if linked else "plain"]
	checkpoint("save")
	var started := Time.get_ticks_usec()
	if not stage.save_to_file(path):
		result["error"] = "save failed"
		checkpoint("failed")
		quit(1)
		return
	result["save_ms"] = (Time.get_ticks_usec()-started)/1000.0
	var file = FileAccess.open(path,FileAccess.READ)
	result["file_bytes"] = file.get_length()
	file.close()
	checkpoint("load")
	started = Time.get_ticks_usec()
	var loaded := await stage.load_from_file(path)
	result["load_ms"] = (Time.get_ticks_usec()-started)/1000.0
	result["loaded"] = loaded
	for i in 8:
		await process_frame
	checkpoint("measure_idle")
	result["idle"] = await measure(false,center,zoom_value)
	checkpoint("measure_navigation")
	result["navigation"] = await measure(true,center,zoom_value)
	result["static_memory_mb"] = Performance.get_monitor(Performance.MEMORY_STATIC)/1048576.0
	checkpoint("complete")
	print("STRESS_RESULT: ",JSON.stringify(result))
	quit()
func measure(navigate: bool, center: Vector2, zoom_value: float) -> Dictionary:
	var times: Array[float] = []
	var started := Time.get_ticks_usec()
	var previous := started
	while Time.get_ticks_usec()-started < 3000000:
		if navigate:
			var t := float(Time.get_ticks_usec()-started)/1000000.0
			stage.camera.target_position = center+Vector2(sin(t*2)*150,cos(t*2)*80)
			stage.camera.target_zoom = Vector2.ONE*zoom_value*(1.0+0.15*sin(t*2))
		await process_frame
		var now := Time.get_ticks_usec()
		times.append((now-previous)/1000.0)
		previous = now
	var elapsed := (Time.get_ticks_usec()-started)/1000000.0
	times.sort()
	return {"fps":times.size()/elapsed,"p95_ms":times[mini(times.size()-1,int(times.size()*0.95))],"max_ms":times[-1],"frames":times.size()}
