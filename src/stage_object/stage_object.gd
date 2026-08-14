class_name StageObject
extends RigidBody2D

@export var id: String


func _init() -> void:
	id = NanoID.generate()


var aabb: Rect2:
	get:
		var rect := Rect2()
		var initialized := false

		for child in get_children():
			if child is CollisionShape2D:
				var collision_shape := child as CollisionShape2D

				if collision_shape.shape == null:
					continue

				var local_rect := collision_shape.shape.get_rect()

				var points := [
					collision_shape.to_global(local_rect.position),
					collision_shape.to_global(Vector2(local_rect.end.x, local_rect.position.y)),
					collision_shape.to_global(Vector2(local_rect.position.x, local_rect.end.y)),
					collision_shape.to_global(local_rect.end),
				]

				for point in points:
					if not initialized:
						rect = Rect2(point, Vector2.ZERO)
						initialized = true
					else:
						rect = rect.expand(point)

		return rect
