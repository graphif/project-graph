extends SceneTree
const Palette = preload("res://src/main/theme_palette.gd")
func _initialize() -> void:
	for light in [false, true]:
		var canvas: Color = Palette.color(light, "surface.canvas")
		for fill in [Color("#89b4fa"), Color("#f38ba8"), Color("#777777"), Color.BLACK, Color.WHITE]:
			for alpha in [1.0, 0.78, 0.6084, 0.1]:
				var background := canvas.blend(Color(fill, alpha))
				var text_color: Color = Palette.neutral_text_color(background)
				assert(is_equal_approx(text_color.r, text_color.g) and is_equal_approx(text_color.g, text_color.b))
				var a := text_color.srgb_to_linear().get_luminance()
				var b := background.srgb_to_linear().get_luminance()
				var contrast := (maxf(a, b) + 0.05) / (minf(a, b) + 0.05)
				var possible := maxf((b + 0.05) / 0.05, 1.05 / (b + 0.05))
				assert(contrast >= minf(7.0, possible) - 0.01)
	print("TEXT_CONTRAST: PASS")
	quit()
