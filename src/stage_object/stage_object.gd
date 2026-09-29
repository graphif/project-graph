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

				# Native Rect2 transformation computes the same world-space AABB,
				# including rotation/skew, without per-corner GDScript allocations.
				var world_rect := collision_shape.global_transform * collision_shape.shape.get_rect()
				rect = rect.merge(world_rect) if initialized else world_rect
				initialized = true

		return rect
