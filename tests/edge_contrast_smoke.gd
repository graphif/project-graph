extends SceneTree

const Palette = preload("res://src/main/theme_palette.gd")
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _run() -> void:
	var stage: Stage = load("res://src/stage/stage.tscn").instantiate()
	root.add_child(stage)
	await process_frame
	var a := stage.create_text_node("A", Vector2(-200, 0), false)
	var b := stage.create_text_node("B", Vector2(200, 0), false)
	var edge: LineEdge = StageObjectRegistry.get_scene("line_edge").instantiate()
	edge.source = a
	edge.target = b
	stage.add_child(edge)
	await process_frame
	check(edge.use_theme_color, "New edge defaults to adaptive gray")
	for light in [false, true]:
		edge.apply_theme(light)
		var color := edge.display_stroke_color()
		check(is_equal_approx(color.r, color.g) and is_equal_approx(color.g, color.b), "Default is neutral gray")
		check(color.r < 0.5 if light else color.r > 0.5, "Gray follows canvas brightness")
	var group := stage.create_text_node("Group", Vector2.ZERO, false)
	a.container = group
	b.container = group
	group.fill_color = Color.WHITE
	stage.get_node("EntityLayerMover").refresh_layout()
	edge.apply_theme(false)
	var on_white := edge.display_stroke_color()
	group.fill_color = Color.BLACK
	var on_black := edge.display_stroke_color()
	check(on_white.r < on_black.r, "Gray follows container fill")
	edge.stroke_color = Color("#f38ba8")
	check(not edge.use_theme_color, "Setting color opts out")
	for light in [true, false]:
		edge.apply_theme(light)
		check(edge.display_stroke_color() == Color("#f38ba8"), "Explicit color retained")
	edge.use_theme_color = true
	check(edge.display_stroke_color() != Color("#f38ba8"), "Reset opts into gray")
	stage.queue_free()
	await process_frame
	print("EDGE_CONTRAST: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
