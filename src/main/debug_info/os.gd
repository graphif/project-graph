extends Label


func _ready() -> void:
	var memory_info = OS.get_memory_info()
	text = "\n".join(
		[
			"CPU: %s" % OS.get_processor_name(),
			"GPU: %s" % RenderingServer.get_video_adapter_name(),
			"GPU 驱动: %s" % RenderingServer.get_video_adapter_api_version(),
			"栈大小: %d KB, 可用内存: %d GB, 物理内存: %d GB"
			% [
				memory_info.stack / 2 ** 10,
				memory_info.available / 2 ** 30,
				memory_info.physical / 2 ** 30,
			],
		]
	)
