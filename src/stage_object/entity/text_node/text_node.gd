class_name TextNode
extends Entity

@export var text: String = "":
	set(value):
		text = value
		if is_node_ready():
			$Label.text = value


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	super._ready()
	$Label.text = text


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	super._process(delta)
