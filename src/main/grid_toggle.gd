extends CheckButton

@onready var grid: ColorRect = %Stage/CanvasLayer/Grid


func _on_toggled(toggled_on: bool) -> void:
	grid.visible = not grid.visible
