extends Line2D
## View-only fallback for a Control border thinner than one viewport pixel.
## The normal style continues to own its fill, margins and world geometry.

const Corners = preload("res://src/main/continuous_corners.gd")

@export var style_name: StringName = &"normal"
@onready var _control: Control = get_parent() as Control
var _refresh_key: Array = []
var _event_driven := false
var _bucket_offset := 0.0
var _basis_key := Transform2D.IDENTITY
var _outline_key: Array = []
var _outline := PackedVector2Array()


func _ready() -> void:
	# Overview masks are restored at priority 50; refresh after that transition.
	process_priority = 51
	_control.resized.connect(_queue_refresh)
	_control.theme_changed.connect(_queue_refresh)
	_control.visibility_changed.connect(_queue_refresh)
	var ancestor: Node = _control
	while ancestor != null:
		if ancestor.has_signal("geometry_changed"):
			ancestor.connect("geometry_changed", _queue_refresh)
			_bucket_offset = float(posmod(str(ancestor.get("id")).hash(), 16)) / 16.0
		if ancestor.has_signal("view_changed"):
			ancestor.connect("view_changed", _queue_refresh)
			_event_driven = true
			break
		ancestor = ancestor.get_parent()


func _queue_refresh(_world_rect: Rect2 = Rect2(), _zoom_steps: float = 0.0) -> void:
	set_process(true)


func _process(_delta: float) -> void:
	if _event_driven:
		set_process(false)
	var ancestor: CanvasItem = _control
	while ancestor != null:
		if ancestor.visibility_layer & get_viewport().canvas_cull_mask == 0:
			return
		ancestor = null if ancestor.top_level else ancestor.get_parent() as CanvasItem
	if not _control.is_visible_in_tree() or visibility_layer == 0:
		return
	var original := Corners.source(_control.get_theme_stylebox(style_name))
	if original == null:
		hide()
		return
	var border_width := float(original.border_width_left)
	var canvas := _control.get_global_transform_with_canvas()
	# Full basis inversion keeps the border aligned even on rotated/scaled nodes.
	var basis := Transform2D(canvas.x, canvas.y, Vector2.ZERO)
	if is_zero_approx(basis.determinant()):
		hide()
		return
	var actual_scale := minf(canvas.x.length(), canvas.y.length())
	visible = border_width > 0.0 and original.border_color.a > 0.0 and border_width * actual_scale < 1.0
	if not visible:
		return
	# Round down: between buckets the core grows slightly, never below one pixel.
	var bucket := floori(log(actual_scale) / log(2.0) * 16.0 + _bucket_offset)
	var sampled_scale := pow(2.0, (bucket - _bucket_offset) / 16.0)
	var normalized_basis := Transform2D(canvas.x / actual_scale, canvas.y / actual_scale, Vector2.ZERO)
	var ratio := sampled_scale / actual_scale
	basis.x *= ratio
	basis.y *= ratio
	var radius := float(original.corner_radius_top_left)
	var key := [bucket, _control.size, radius, border_width, original.border_color]
	if key == _refresh_key and normalized_basis.is_equal_approx(_basis_key):
		return
	_refresh_key = key
	_basis_key = normalized_basis
	transform = basis.affine_inverse()
	default_color = original.border_color
	var outline_key := [_control.size, radius, border_width]
	if outline_key != _outline_key:
		_outline_key = outline_key
		_outline = Corners.outline(Rect2(Vector2.ZERO, _control.size).grow(-border_width * 0.5), maxf(0.0, radius - border_width * 0.5))
	# Native packed-array transformation avoids a GDScript loop per corner point.
	points = basis * _outline
