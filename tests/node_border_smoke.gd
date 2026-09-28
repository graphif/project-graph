extends SceneTree

const Corners = preload("res://src/main/continuous_corners.gd")

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
	var outer := stage.create_text_node("Outer", Vector2.ZERO, false)
	var inner := stage.create_text_node("Inner", Vector2(100, 100), false)
	inner.container = outer
	inner.fill_color = Color.TRANSPARENT
	for light in [false, true]:
		GraphPreferences.set_value("theme", "latte" if light else "mocha", false)
		stage.apply_theme(light)
		for fill in [Color.BLACK, Color.WHITE, Color("#89b4fa"), Color("#f38ba880")]:
			outer.fill_color = fill
			stage.get_node("EntityLayerMover").refresh_layout()
			for frame in 3:
				await process_frame
			var border := inner.display_border_color()
			check(is_equal_approx(border.r, border.g) and is_equal_approx(border.g, border.b), "Border stays neutral")
			var expected := Palette.neutral_edge_color(inner.display_background_color(light))
			check(border.is_equal_approx(expected), "Border sees parent composited fill")
			check(Corners.source(inner.label.get_theme_stylebox("normal")).border_color.is_equal_approx(border), "Rendered border refreshes")
	var before := inner.display_border_color()
	inner.border_color = Color.GREEN
	inner.use_theme_border = false
	check(inner.display_border_color().is_equal_approx(before), "Legacy border values cannot override contrast")
	for property in inner.get_property_list():
		if property.name in ["border_color", "use_theme_border"]:
			check((property.usage & PROPERTY_USAGE_EDITOR) == 0, "Border is not editable in Inspector")
			check((property.usage & PROPERTY_USAGE_STORAGE) != 0, "Legacy value remains serializable")
	stage.queue_free()
	await process_frame
	print("NODE_BORDER: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
