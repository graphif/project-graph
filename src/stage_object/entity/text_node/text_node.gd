class_name TextNode
extends Entity

@onready var label: Label = $Label
@onready var text_edit: TextEdit = $TextEdit

@export var text: String = "":
	set(value):
		text = value
		if is_node_ready():
			label.text = value

var is_dragging: bool = false
var drag_offset: Vector2 = Vector2.ZERO


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	super._ready()
	label.text = text


func _gui_input(event: InputEvent) -> void:
	# 进入编辑模式
	if label.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			enter_edit_mode()
			get_viewport().set_input_as_handled()
			return
	# 开始拖拽
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				is_dragging = true
				# 记录鼠标点击位置相对于节点左上角的偏移量，防止节点瞬间“跳”到鼠标中心
				drag_offset = get_local_mouse_position()
			else:
				is_dragging = false
			# edge case: 在编辑状态下拖拽另一个节点，导致无法退出编辑状态，所以这里不调用set_input_as_handled
			return
	# 拖拽
	if event is InputEventMouseMotion and is_dragging:
		# 将全局鼠标位置转换为父节点坐标系，减去偏移量得到新位置
		global_position = get_global_mouse_position() - drag_offset
		get_viewport().set_input_as_handled()
		return


func _unhandled_input(event: InputEvent) -> void:
	if text_edit.visible and event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			if not text_edit.get_global_rect().has_point(event.global_position):
				exit_edit_mode()
				get_viewport().set_input_as_handled()


func enter_edit_mode() -> void:
	text_edit.text = text
	text_edit.text_changed.emit()
	label.hide()
	text_edit.show()
	text_edit.grab_focus()


func exit_edit_mode() -> void:
	if label.visible:
		return
	text = text_edit.text
	text_edit.hide()
	label.show()
