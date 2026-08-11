extends Label


func _ready() -> void:
	var memory_info = OS.get_memory_info()
	text = "\n".join(
		[
			"CPU: %s" % OS.get_processor_name(),
			"GPU: %s" % RenderingServer.get_video_adapter_name(),
			"GPU Driver: %s" % RenderingServer.get_video_adapter_api_version(),
			"Stack: %d KB, Available: %d GB, Physical: %d GB"
			% [
				memory_info.stack / 2 ** 10,
				memory_info.available / 2 ** 30,
				memory_info.physical / 2 ** 30,
			],
		]
	)
