extends CheckButton


func _on_toggled(toggled_on: bool) -> void:
	PhysicsServer2D.set_active(toggled_on)
