extends Control


func _ready() -> void:
	var screen_fps := DisplayServer.screen_get_refresh_rate(DisplayServer.SCREEN_OF_MAIN_WINDOW)
	Engine.physics_ticks_per_second = screen_fps
