extends Control

const MAIN_SCENE := "res://src/main/main.tscn"
const MIN_SPLASH_TIME := 0.4

const Palette = preload("res://src/main/theme_palette.gd")
var _light := false

@onready var background: ColorRect = $Background
@onready var center: VBoxContainer = $Center
@onready var logo: TextureRect = $Center/Logo
@onready var title: Label = $Center/Title
@onready var status: Label = $Center/Status
@onready var progress_bar: ProgressBar = $Center/ProgressBar

var _elapsed := 0.0
var _transition_started := false
var _load_requested := false


func _ready() -> void:
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_light = Palette.is_light(str(GraphPreferences.value("theme")))
	background.color = Palette.color(_light, "surface.app")

	center.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	center.grow_horizontal = Control.GROW_DIRECTION_BOTH
	center.grow_vertical = Control.GROW_DIRECTION_BOTH
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_theme_constant_override("separation", 20)

	logo.texture = load("res://project-graph-icon.svg") as Texture2D
	logo.custom_minimum_size = Vector2(192.0, 192.0)
	logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	logo.modulate = Color.WHITE
	logo.modulate.a = 0.0
	logo.scale = Vector2(0.86, 0.86)

	title.text = "Project Graph"
	title.add_theme_font_size_override("font_size", 48)
	title.add_theme_color_override("font_color", Palette.color(_light, "text.primary"))
	title.modulate.a = 0.0

	status.text = "正在准备工作区"
	status.add_theme_font_size_override("font_size", 22)
	status.add_theme_color_override("font_color", Palette.color(_light, "text.secondary"))
	status.modulate.a = 0.0

	progress_bar.show_percentage = false
	progress_bar.custom_minimum_size = Vector2(320.0, 6.0)
	progress_bar.modulate.a = 0.0
	_apply_progress_style()

	var request_error := ResourceLoader.load_threaded_request(MAIN_SCENE, "PackedScene")
	_load_requested = request_error == OK
	if not _load_requested:
		status.text = "工作区加载失败"
		progress_bar.modulate = Palette.color(_light, "status.error")

	var tween := create_tween().set_parallel(true)
	tween.tween_property(logo, "modulate:a", 1.0, 0.28).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(logo, "scale", Vector2.ONE, 0.42).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(title, "modulate:a", 1.0, 0.24).set_delay(0.08)
	tween.tween_property(status, "modulate:a", 1.0, 0.24).set_delay(0.16)
	tween.tween_property(progress_bar, "modulate:a", 1.0, 0.24).set_delay(0.22)


func _process(delta: float) -> void:
	_elapsed += delta
	if not _load_requested:
		return

	var load_progress := [0.0]
	var load_status := ResourceLoader.load_threaded_get_status(MAIN_SCENE, load_progress)
	progress_bar.value = clampf(load_progress[0] * 100.0, 0.0, 100.0)

	if load_status == ResourceLoader.THREAD_LOAD_FAILED:
		status.text = "工作区加载失败"
		progress_bar.modulate = Palette.color(_light, "status.error")
		_load_requested = false
		return

	if load_progress[0] < 0.99:
		status.text = "正在加载工作区"

	if _transition_started or _elapsed < MIN_SPLASH_TIME or load_status != ResourceLoader.THREAD_LOAD_LOADED:
		return

	var scene := ResourceLoader.load_threaded_get(MAIN_SCENE) as PackedScene
	if scene == null:
		status.text = "工作区加载失败"
		progress_bar.modulate = Palette.color(_light, "status.error")
		_load_requested = false
		return

	progress_bar.value = 100.0
	status.text = "即将进入工作区"
	_transition_started = true
	get_tree().change_scene_to_packed(scene)


func _apply_progress_style() -> void:
	var background_style := StyleBoxFlat.new()
	background_style.bg_color = Palette.color(_light, "surface.field")
	background_style.corner_radius_top_left = 3
	background_style.corner_radius_top_right = 3
	background_style.corner_radius_bottom_left = 3
	background_style.corner_radius_bottom_right = 3
	progress_bar.add_theme_stylebox_override("background", background_style)

	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = Palette.color(_light, "accent.primary")
	fill_style.corner_radius_top_left = 3
	fill_style.corner_radius_top_right = 3
	fill_style.corner_radius_bottom_left = 3
	fill_style.corner_radius_bottom_right = 3
	progress_bar.add_theme_stylebox_override("fill", fill_style)
