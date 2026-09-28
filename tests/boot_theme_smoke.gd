extends SceneTree
const Palette = preload("res://src/main/theme_palette.gd")
func _initialize() -> void:
	call_deferred("_run")
func _run() -> void:
	var main_scene = load("res://src/main/main.tscn")
	assert(main_scene != null)
	var failed := false
	for mode in ["light", "mocha", "system"]:
		GraphPreferences.set_value("theme", mode, false)
		var boot = load("res://src/boot/boot.tscn").instantiate()
		root.add_child(boot)
		boot.set_process(false)
		var light := Palette.is_light(mode)
		if not boot.background.color.is_equal_approx(Palette.color(light, "surface.app")):
			failed = true
			push_error("Boot background ignores theme: " + mode)
		var style = boot.progress_bar.get_theme_stylebox("fill") as StyleBoxFlat
		if not style.bg_color.is_equal_approx(Palette.color(light, "accent.primary")):
			failed = true
			push_error("Boot progress ignores theme accent: " + mode)
		boot.free()
	print("BOOT_THEME: ", "FAIL" if failed else "PASS")
	quit(1 if failed else 0)
