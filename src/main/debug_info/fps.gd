extends Label


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	text = "FPS: %d, PFPS: %d" % [Engine.get_frames_per_second(), Engine.physics_ticks_per_second]
