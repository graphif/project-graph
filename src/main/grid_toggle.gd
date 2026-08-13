extends CheckButton

@onready var grid: ColorRect = %Grid


func _on_toggled(toggled_on: bool) -> void:
	grid.visible = not grid.visible
