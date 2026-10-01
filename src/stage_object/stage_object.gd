class_name StageObject
extends RigidBody2D

@export var id: String:
	set(value):
		if id == value:
			return
		id = value
		notify_persistent_change()
signal geometry_changed

var geometry_version := 0
var _known_transform := Transform2D.IDENTITY
var _known_local_transform := Transform2D.IDENTITY


func _enter_tree() -> void:
	set_notify_local_transform(true)
	set_notify_transform(true)
	_known_transform = global_transform
	_known_local_transform = transform
	if not visibility_changed.is_connected(invalidate_geometry):
		visibility_changed.connect(invalidate_geometry)
	invalidate_geometry()


func _notification(what: int) -> void:
	if what == NOTIFICATION_LOCAL_TRANSFORM_CHANGED or what == NOTIFICATION_TRANSFORM_CHANGED:
		if transform != _known_local_transform:
			_known_local_transform = transform
			notify_persistent_change()
		if global_transform != _known_transform:
			_known_transform = global_transform
			invalidate_geometry()


# RigidBody2D's native force integration can update the pose without sending
# CanvasItem transform notifications. Recheck after physics flushes the pose,
# through the same notification path used by pointer/property transforms.
func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
	if state.transform != _known_transform:
		call_deferred("_sync_physics_transform")


func _sync_physics_transform() -> void:
	_notification(NOTIFICATION_TRANSFORM_CHANGED)


func invalidate_geometry() -> void:
	geometry_version += 1
	geometry_changed.emit()
	var stage := get_parent()
	if stage != null and stage.has_method("mark_geometry_changed"):
		stage.call("mark_geometry_changed", self)


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


func notify_persistent_change() -> void:
	var stage := get_parent()
	if stage != null and stage.has_method("mark_document_changed"):
		stage.call("mark_document_changed")
