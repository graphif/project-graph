## This module handles adding a menu to the script editor with formatter commands.
## It safely locates the script editor's menu bar and adds our custom menu.
@tool
extends Node

signal menu_item_selected(command: String)

const MENU_TEXT = "Format"
const MENU_ITEMS = {
	"format_script": "Format Current Script",
	"lint_script": "Lint Current Script",
	"reorder_code": "Reorder Code",
	"install_update": "Install or Update Formatter",
	"uninstall": "Uninstall Formatter",
	"report_issue": "Report Issue",
	"help": "Help",
}

var menu_button: MenuButton = null
var popup_menu: PopupMenu = null


func _ready() -> void:
	# At the start we insert the menu in the script editor
	var script_editor := EditorInterface.get_script_editor()
	var last_menu_button := _find_last_menu_button(script_editor)
	if not is_instance_valid(last_menu_button):
		push_warning("GDScript Formatter: Could not find valid menu button in script editor. Menu will not be available. Use the command palette instead.")
		return

	menu_button = MenuButton.new()
	menu_button.text = MENU_TEXT
	menu_button.switch_on_hover = true
	menu_button.flat = false
	menu_button.theme_type_variation = &"FlatMenuButton"

	popup_menu = menu_button.get_popup()
	_populate_menu()

	popup_menu.id_pressed.connect(_on_menu_item_pressed)
	last_menu_button.add_sibling(menu_button)


## Cleans up the menu from the script editor. Call this when disabling the
## plugin (in _exit_tree()).
func remove_formatter_menu() -> void:
	if is_instance_valid(menu_button):
		if is_instance_valid(popup_menu):
			popup_menu.id_pressed.disconnect(_on_menu_item_pressed)
		menu_button.queue_free()
		menu_button = null
		popup_menu = null


func update_menu(show_uninstall: bool) -> void:
	if not is_instance_valid(popup_menu):
		return
	popup_menu.clear()
	_populate_menu(show_uninstall)


## Searches for and returns the last menu node in the script editor top menu bar,
## or null if not found.
func _find_last_menu_button(script_editor: Control) -> MenuButton:
	# The first child of the script editor should be a VBoxContainer (main container for the script editor main screen)
	# Then the first child of that container should be an HBoxContainer (the menu bar)
	# This is based on the current structure of Godot's script editor as of Godot 4.5
	# Note: We add multiple checks in there with null returns mainly in case something changes in a future
	if script_editor.get_child_count() == 0:
		return null

	var main_container := script_editor.get_child(0)
	if not is_instance_valid(main_container) or not main_container is VBoxContainer:
		return null

	if main_container.get_child_count() == 0:
		return null

	var menu_bar := main_container.get_child(0)
	if not is_instance_valid(menu_bar) or not menu_bar is HBoxContainer:
		return null

	# We reached the menu bar. So now we loop through all the children look for
	# the last menu button, which would be the last menu in the menu list.
	# Note: Here the goal is to insert the menu after the debug menu, but we
	# don't check for the button text because "debug" would only work in English
	# this should work in any language.
	var last_menu_button: MenuButton = null
	for child in menu_bar.get_children():
		if child is MenuButton:
			last_menu_button = child as MenuButton

	return last_menu_button


func _populate_menu(show_uninstall: bool = true) -> void:
	if not is_instance_valid(popup_menu):
		return

	var current_item_index := 0

	popup_menu.add_item(MENU_ITEMS["format_script"], current_item_index)
	popup_menu.set_item_metadata(current_item_index, "format_script")
	popup_menu.set_item_tooltip(current_item_index, "Run the GDScript Formatter over the current script")

	current_item_index += 1
	popup_menu.add_item(MENU_ITEMS["lint_script"], current_item_index)
	popup_menu.set_item_metadata(current_item_index, "lint_script")
	popup_menu.set_item_tooltip(current_item_index, "Check the current script for linting issues")

	current_item_index += 1
	popup_menu.add_item(MENU_ITEMS["reorder_code"], current_item_index)
	popup_menu.set_item_metadata(current_item_index, "reorder_code")
	popup_menu.set_item_tooltip(current_item_index, "Reorder the code elements in the current script according to the GDScript Style Guide")

	popup_menu.add_separator()

	# NOTE: When we add separators, it bumps the internal index of menu items.
	# That's why we have to increase it even on separators. Otherwise the
	# tooltip will lose sync.
	current_item_index += 2
	popup_menu.add_item(MENU_ITEMS["install_update"], current_item_index)
	popup_menu.set_item_metadata(current_item_index, "install_update")
	popup_menu.set_item_tooltip(current_item_index, "Download the latest version of the GDScript Formatter")

	if show_uninstall:
		current_item_index += 1
		popup_menu.add_item(MENU_ITEMS["uninstall"], current_item_index)
		popup_menu.set_item_metadata(current_item_index, "uninstall")
		popup_menu.set_item_tooltip(current_item_index, "Remove the GDScript Formatter installed through this add-on from your computer")

	popup_menu.add_separator()

	# Bumped index by 1 extra step because of the previous separator.
	current_item_index += 2
	popup_menu.add_item(MENU_ITEMS["report_issue"], current_item_index)
	popup_menu.set_item_metadata(current_item_index, "report_issue")
	popup_menu.set_item_tooltip(current_item_index, "Tell us about problems or bugs you found")

	current_item_index += 1
	popup_menu.add_item(MENU_ITEMS["help"], current_item_index)
	popup_menu.set_item_metadata(current_item_index, "help")
	popup_menu.set_item_tooltip(current_item_index, "Learn how to use the GDScript Formatter")


func _on_menu_item_pressed(id: int) -> void:
	if not is_instance_valid(popup_menu):
		return

	var command: String = popup_menu.get_item_metadata(id)
	if not command.is_empty():
		menu_item_selected.emit(command)
