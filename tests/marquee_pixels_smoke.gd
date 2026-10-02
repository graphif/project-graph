extends "res://tests/group_overview_smoke.gd"
func _run() -> void:
	root.size = Vector2i(1280, 800)
	app = load("res://src/main/main.tscn").instantiate()
	root.add_child(app)
	await settle()
	app.get_node("UIOverlay/Welcome").hide()
	stage = app.tabs.get_current_stage()
	stage.set_process(false)
	stage.camera.set_process(false)
	stage.get_node("CanvasLayer/Grid").hide()
	var view := stage.get_viewport() as SubViewport
	view.transparent_bg = true
	var line := stage.get_node("SelectionOverlay/Marquee") as Line2D
	for zoom: float in [.02, .125, .25, .5, 1.0, 2.0, 3.0]:
		stage.camera.zoom = Vector2.ONE * zoom
		stage.camera.target_zoom = stage.camera.zoom
		stage.camera.position = Vector2(125, -90)
		stage.camera.force_update_scroll()
		for phase: float in [0.0, .25, .5, .75]:
			var start := Vector2(120, 110) + Vector2.ONE * phase
			var end := Vector2(420, 290) + Vector2.ONE * phase
			var container := view.get_parent() as Control
			var screen := container.get_global_transform_with_canvas() * (end * container.size / Vector2(view.size))
			root.grab_focus()
			Input.warp_mouse(screen)
			var motion := InputEventMouseMotion.new()
			motion.position = end
			view.push_input(motion, true)
			for frame in 2:
				await process_frame
			stage._marquee_start = stage.get_canvas_transform().affine_inverse() * start
			stage._update_marquee()
			await RenderingServer.frame_post_draw
			var pixels := view.get_texture().get_image()
			check(line.closed and line.points.size() == 4, "Marquee remains a closed four-corner rectangle")
			var corners := PackedVector2Array()
			for point in line.points:
				corners.append(line.get_global_transform_with_canvas() * point)
			check(corners[0].distance_to(start) < 1.0 and corners[2].distance_to(end) < 1.5, "Marquee corners follow the pointer in viewport pixels")
			var missing := 0
			for side in 4:
				for step in range(1, 20):
					var point := corners[side].lerp(corners[(side + 1) % 4], float(step) / 20.0)
					var coverage := 0.0
					for x in range(maxi(0, floori(point.x) - 3), mini(pixels.get_width(), ceili(point.x) + 4)):
						for y in range(maxi(0, floori(point.y) - 3), mini(pixels.get_height(), ceili(point.y) + 4)):
							coverage = maxf(coverage, pixels.get_pixel(x,y).a)
					if coverage < .4:
						missing += 1
			check(missing == 0, "All four marquee edges remain visible: zoom=%s phase=%s missing=%s" % [zoom, phase, missing])
			if zoom == .125 and phase == .25:
				pixels.save_png("/tmp/pg-marquee-regression.png")
	stage._marquee_active = true
	stage._marquee_original_ids = PackedStringArray()
	stage.cancel_marquee_selection()
	check(not line.visible and line.points.is_empty(), "Cancel clears the temporary rectangle")
	app.queue_free()
	await process_frame
	print("MARQUEE_PIXELS: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)
