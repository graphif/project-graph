extends SceneTree

var failures: Array[String] = []


func _initialize() -> void:
	var target := Rect2(-80, -40, 160, 80)
	var previous_tip := Vector2.ZERO
	var previous_normal := Vector2.ZERO
	var previous_curve := PackedVector2Array()
	for step in 3601:
		var direction := Vector2.RIGHT.rotated(TAU * step / 3600.0)
		var source := Rect2(direction * 280.0 - Vector2(60, 30), Vector2(120, 60))
		var ports := LineEdge.connection_uvs(source, target)
		var tip := LineEdge.anchor(target, ports[1])
		var curve := LineEdge.connection_curve(source, target, ports, 24)
		if step > 0:
			check(previous_tip.distance_to(tip) < 2.0, "Attachment does not jump between sides")
			if ports.size() > 3:
				check(absf(previous_normal.angle_to(ports[3])) < 0.1, "Corner normal rotates continuously")
			for i in curve.size():
				check(previous_curve[i].distance_to(curve[i]) < 3.0, "Whole curve moves continuously")
		previous_tip = tip
		previous_normal = ports[3] if ports.size() > 3 else Vector2.ZERO
		previous_curve = curve
	print("CONNECTION_CONTINUITY: " + ("PASS" if failures.is_empty() else str(failures)))
	quit(0 if failures.is_empty() else 1)


func check(ok: bool, message: String) -> void:
	if not ok and not failures.has(message):
		failures.append(message)
		push_error(message)
