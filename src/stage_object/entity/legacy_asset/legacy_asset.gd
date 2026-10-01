class_name LegacyAsset
extends Entity
## Native image entity used by the master archive importer.

@export_storage var image_base64 := ""
@export_storage var image_format := "png"
@export var asset_size := Vector2(100, 100)
@onready var texture_rect: TextureRect = $TextureRect
@onready var collision_shape: CollisionShape2D = $CollisionShape


func _ready() -> void:
	super()
	var image := Image.new()
	var data := Marshalls.base64_to_raw(image_base64)
	var error := ERR_FILE_UNRECOGNIZED
	match image_format:
		"png": error = image.load_png_from_buffer(data)
		"jpg", "jpeg": error = image.load_jpg_from_buffer(data)
		"webp": error = image.load_webp_from_buffer(data)
		"svg": error = image.load_svg_from_buffer(data)
	if error == OK:
		texture_rect.texture = ImageTexture.create_from_image(image)
	texture_rect.size = asset_size
	collision_shape.shape = RectangleShape2D.new()
	collision_shape.shape.size = asset_size
	collision_shape.position = asset_size / 2
