extends Button

@onready var stage: Node = %Stage
var dialog: FileDialog


func _ready() -> void:
	add_to_group("project_file_save")


func open_save_dialog() -> void:
	_on_pressed()


func _on_pressed() -> void:
	if dialog == null:
		dialog = _create_dialog()
		dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		dialog.title = "保存 Project Graph 文件"
		dialog.popup_centered_ratio()


func _create_dialog() -> FileDialog:
	var created := FileDialog.new()
	created.access = FileDialog.ACCESS_FILESYSTEM
	created.filters = PackedStringArray(["*.prg ; Project Graph 文件"])
	created.use_native_dialog = true
	created.file_selected.connect(_on_file_selected)
	add_child(created)
	return created


func _on_file_selected(path: String) -> void:
	if not path.to_lower().ends_with(".prg"):
		path += ".prg"
	stage.save_to_file(path)
