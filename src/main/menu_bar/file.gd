extends PopupMenu

@onready var tab_container: TabContainer = %TabContainer
@onready var open_file_dialog: FileDialog = %OpenFileDialog
@onready var save_file_dialog: FileDialog = %SaveFileDialog


func _on_id_pressed(id: int) -> void:
	match id:
		0:
			tab_container.new_tab()
		1:
			open_file_dialog.show()
		2:
			save_file_dialog.show()
