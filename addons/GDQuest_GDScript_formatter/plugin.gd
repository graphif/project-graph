## This plug-in adds support for automatically formatting GDScript files on save
## and via a command in the Godot Editor, using the GDQuest GDScript Formatter.
##
## It also provides an option to install or update the formatter binary from the GitHub releases.
##
## See our website for more information on the formatter and how to use it:
## https://www.gdquest.com/library/gdscript_formatter/
@tool
extends EditorPlugin

const FormatterInstaller = preload("install_and_update.gd")
const FormatterMenu = preload("menu.gd")

const EDITOR_SETTINGS_CATEGORY = "gdquest_gdscript_formatter/"
const SETTING_FORMAT_ON_SAVE = "format_on_save"
const SETTING_SHORTCUT = "shortcut"
const SETTING_USE_SPACES = "use_spaces"
const SETTING_INDENT_SIZE = "indent_size"
const SETTING_FORMAT_MODE = "format_mode"
const SETTING_REORDER_CODE = "reorder_code"
const SETTING_SAFE_MODE = "safe_mode"
const SETTING_FORMATTER_PATH = "formatter_path"
const SETTING_LINT_ON_SAVE = "lint_on_save"
const SETTING_LINT_LINE_LENGTH = "lint_line_length"
const SETTING_LINT_IGNORED_RULES = "lint_ignored_rules"
# Directories to ignore when Format on Save is enabled
const SETTING_IGNORED_DIRECTORIES = "format_on_save_ignored_directories"

## Represents the modes the user wants to use by default, notably when running
## the formatter on save.
enum FormatMode {
	NORMAL,
	## Reorder the code according to the official style guide every time the
	## formatter runs. Note that without this option, you can still reorder any
	## time from the format menu in the script editor.
	REORDER_CODE,
	## Reparse the formatted code and compare its structure with the original.
	##
	## [b]WARNING:[/b] this is an imperfect check. It does not guarantee that
	## formatting is 100% safe or semantically equivalent. We always recommend
	## using a version control system when running the formatter.
	##
	## This is an option used notably for development of the formatter, when
	## testing it on new codebases, to quickly catch bugs on unsupported
	## GDScript syntax.
	##
	## When using the formatter normally on individual scripts, you can always
	## undo after formatting or use a version control system to track, review,
	## and undo changes.
	VERIFY_STRUCTURE,
}

const COMMAND_PALETTE_CATEGORY = "gdquest gdscript formatter/"
const COMMAND_PALETTE_FORMAT_SCRIPT = "Format GDScript"
const COMMAND_PALETTE_LINT_SCRIPT = "Lint GDScript"
const COMMAND_PALETTE_INSTALL_UPDATE = "Install or Update Formatter"
const COMMAND_PALETTE_UNINSTALL = "Uninstall Formatter"
const COMMAND_PALETTE_REPORT_ISSUE = "Report Issue"

var DEFAULT_SETTINGS = {
	SETTING_FORMAT_ON_SAVE: false,
	SETTING_USE_SPACES: false,
	SETTING_INDENT_SIZE: 4,
	SETTING_FORMAT_MODE: FormatMode.NORMAL,
	SETTING_FORMATTER_PATH: "",
	SETTING_LINT_ON_SAVE: false,
	SETTING_LINT_LINE_LENGTH: 100,
	SETTING_LINT_IGNORED_RULES: "",
	SETTING_IGNORED_DIRECTORIES: PackedStringArray(["addons/"]),
}

## Which gutter lint icons are shown in.
## By default, gutter 0 is for breakpoints and 1 is for things like overrides.
const GUTTER_LINT_ICON_INDEX = 2
const GUTTER_LINT_ICONS_NAME = "gdscript_formatter_lint_icons"

var connection_list: Array[Resource] = []
var installer: FormatterInstaller = null
var formatter_cache_dir: String
var menu: FormatterMenu = null
var _has_uninstall_command := false
var _has_formatter_command := false
var _has_format_command := false
var _has_lint_command := false
var _already_warned_about_reorder_on_save := false
# Used to auto detect changes to the project's .editorconfig file.
var _editorconfig_last_modified_time := -1
# Editorconfig allows setting rules per path glob. We track globs for the format
# on save rule here so users can enable it selectively for specific folders.
var _editorconfig_format_on_save_rules: Array[Dictionary] = []


func _init() -> void:
	migrate_format_mode_setting()
	if not has_editor_setting(SETTING_FORMAT_MODE):
		set_editor_setting(SETTING_FORMAT_MODE, DEFAULT_SETTINGS[SETTING_FORMAT_MODE])
	register_format_mode_setting()

	for setting: String in DEFAULT_SETTINGS.keys():
		if setting == SETTING_FORMAT_MODE:
			continue
		if not has_editor_setting(setting):
			set_editor_setting(setting, DEFAULT_SETTINGS[setting])

	if not has_editor_setting(SETTING_SHORTCUT):
		var default_shortcut := InputEventKey.new()
		default_shortcut.echo = false
		default_shortcut.pressed = true
		default_shortcut.keycode = KEY_I
		default_shortcut.ctrl_pressed = true
		default_shortcut.shift_pressed = false
		default_shortcut.alt_pressed = true

		var shortcut := Shortcut.new()
		shortcut.events.push_back(default_shortcut)

		set_editor_setting(SETTING_SHORTCUT, shortcut)


func register_format_mode_setting() -> void:
	var editor_settings := EditorInterface.get_editor_settings()
	var setting_name := EDITOR_SETTINGS_CATEGORY + SETTING_FORMAT_MODE
	editor_settings.add_property_info({
		"name": setting_name,
		"type": TYPE_INT,
		"hint": PROPERTY_HINT_ENUM,
		"hint_string": "Normal,Reorder code,Verify structure",
	})
	editor_settings.set_initial_value(setting_name, DEFAULT_SETTINGS[SETTING_FORMAT_MODE], false)


## Converts the old independent settings to the mutually exclusive format mode.
## The legacy safe mode takes priority because it is the least destructive option.
func migrate_format_mode_setting() -> void:
	if has_editor_setting(SETTING_FORMAT_MODE):
		return

	# Inferring a version number from the old settings; editor settings does not
	# give us a neat way to version our settings so we do it manually. It's just
	# to keep track of migrations.
	var version := -1
	if has_editor_setting(SETTING_REORDER_CODE) or has_editor_setting(SETTING_SAFE_MODE):
		version = 1

	# Upgrade to version 2; that's when we merged safe mode and reorder code
	# into a single format mode (because they're mutually exclusive).
	if version == 1:
		var format_mode := FormatMode.NORMAL
		if has_editor_setting(SETTING_SAFE_MODE) and get_editor_setting(SETTING_SAFE_MODE) as bool:
			format_mode = FormatMode.VERIFY_STRUCTURE
		elif has_editor_setting(SETTING_REORDER_CODE) and get_editor_setting(SETTING_REORDER_CODE) as bool:
			format_mode = FormatMode.REORDER_CODE

		set_editor_setting(SETTING_FORMAT_MODE, format_mode)

		# Remove the old settings so users do not see two conflicting configurations.
		var editor_settings := EditorInterface.get_editor_settings()
		for setting_name: String in [SETTING_REORDER_CODE, SETTING_SAFE_MODE]:
			if has_editor_setting(setting_name):
				editor_settings.erase(EDITOR_SETTINGS_CATEGORY + setting_name)

		version = 2


func _enter_tree() -> void:
	formatter_cache_dir = EditorInterface.get_editor_paths().get_cache_dir().path_join("gdquest")
	installer = FormatterInstaller.new(formatter_cache_dir)
	add_child(installer)
	installer.installation_completed.connect(
		func _on_installation_completed(binary_path: String) -> void:
			set_editor_setting(SETTING_FORMATTER_PATH, binary_path)
			_has_formatter_command = has_command(binary_path)
			if not _has_formatter_command:
				push_error("GDScript Formatter: Installed binary cannot be executed: " + binary_path)
				return
			add_format_command()
			add_lint_command()
			# After installing the formatter we can add the menu option to show the uninstall command
			if is_instance_valid(menu):
				menu.update_menu(true)
	)
	installer.installation_failed.connect(
		func _on_installation_failed(error_message: String) -> void:
			push_error("Formatter installation failed: ", error_message)
	)

	_has_formatter_command = has_command(get_editor_setting(SETTING_FORMATTER_PATH))
	add_format_command()
	add_lint_command()
	add_install_update_command()
	add_uninstall_command()
	add_report_issue_command()

	menu = FormatterMenu.new()
	add_child(menu)
	menu.menu_item_selected.connect(_on_menu_item_selected)
	menu.update_menu(is_formatter_installed_locally())

	update_shortcut()
	resource_saved.connect(_on_resource_saved)


func _exit_tree() -> void:
	resource_saved.disconnect(_on_resource_saved)

	remove_format_command()
	remove_lint_command()
	remove_install_update_command()
	remove_uninstall_command()
	remove_report_issue_command()

	installer.queue_free()
	installer = null

	if is_instance_valid(menu):
		menu.menu_item_selected.disconnect(_on_menu_item_selected)
		menu.remove_formatter_menu()
		menu.queue_free()
		menu = null


func _shortcut_input(event: InputEvent) -> void:
	var shortcut := get_editor_setting(SETTING_SHORTCUT) as Shortcut
	if not is_instance_valid(shortcut):
		return
	if not shortcut.matches_event(event) or not event.is_pressed() or event.is_echo():
		return
	if format_current_script():
		get_tree().root.set_input_as_handled()


func format_current_script() -> bool:
	if not is_formatter_available():
		return false
	if not EditorInterface.get_script_editor().is_visible_in_tree():
		return false
	var current_script := EditorInterface.get_script_editor().get_current_script()
	if not is_instance_valid(current_script) or not current_script is GDScript:
		return false
	var code_edit: CodeEdit = EditorInterface.get_script_editor().get_current_editor().get_base_editor()

	var formatted_code := format_code(current_script, false, code_edit.text)
	if formatted_code.is_empty():
		return false

	reload_code_edit(code_edit, formatted_code)
	return true


func lint_current_script() -> bool:
	if not is_formatter_available():
		return false
	if not EditorInterface.get_script_editor().is_visible_in_tree():
		return false

	var current_script := EditorInterface.get_script_editor().get_current_script()
	if not is_instance_valid(current_script) or not current_script is GDScript:
		return false

	var code_edit: CodeEdit = EditorInterface.get_script_editor().get_current_editor().get_base_editor()

	var lint_issues := lint_code(current_script)
	if lint_issues.is_empty():
		print("No linting issues found.")
		clear_lint_highlights(code_edit)
		return true

	apply_lint_highlights(code_edit, lint_issues)
	print_lint_summary(lint_issues, current_script.resource_path)

	return true


func update_shortcut() -> void:
	for obj: Resource in connection_list:
		obj.changed.disconnect(update_shortcut)

	connection_list.clear()

	var shortcut := get_editor_setting(SETTING_SHORTCUT) as Shortcut
	if is_instance_valid(shortcut):
		for event: InputEvent in shortcut.events:
			if is_instance_valid(event):
				event.changed.connect(update_shortcut)
				connection_list.push_back(event)

	remove_format_command()
	add_format_command()


func _on_resource_saved(saved_resource: Resource) -> void:
	if saved_resource is not GDScript:
		return

	var script := saved_resource as GDScript
	var do_format_on_save := get_editor_setting(SETTING_FORMAT_ON_SAVE) as bool
	var editorconfig_format_on_save = get_editorconfig_format_on_save(script.resource_path)
	if editorconfig_format_on_save != null:
		do_format_on_save = editorconfig_format_on_save as bool
	var lint_on_save := get_editor_setting(SETTING_LINT_ON_SAVE) as bool
	if do_format_on_save and get_format_mode() == FormatMode.REORDER_CODE and not _already_warned_about_reorder_on_save:
		push_warning("GDScript Formatter: Reorder code is enabled for format on save. It is usually better used manually.")
		_already_warned_about_reorder_on_save = true

	if not do_format_on_save and not lint_on_save:
		return

	var ignored_directories = get_editor_setting(SETTING_IGNORED_DIRECTORIES)
	var path = script.resource_path.trim_prefix("res://")

	var script_path_parts := path.split("/")

	for directory: String in ignored_directories:
		var normalized_dir := directory.trim_prefix("res://")
		var directory_parts := normalized_dir.split("/")

		var matches := true
		for i in range(directory_parts.size()):
			if directory_parts[i] != script_path_parts[i]:
				matches = false
				break

		if matches:
			return

	if not is_formatter_available() or not is_instance_valid(script):
		return

	if do_format_on_save:
		var formatted_code := format_code(script, false)
		if formatted_code.is_empty():
			return

		script.source_code = formatted_code
		ResourceSaver.save(script)
		# The argument (keep_state parameter) tells Godot to try to preserve the
		# state of the script instance, like static variables. Without this,
		# attempting to reload tool scripts will fail with an error because they
		# are already instantiated in the editor and instantiated scripts are
		# not allowed to force reload without unloading first.
		script.reload(true)

		var script_editor := EditorInterface.get_script_editor()
		var open_script_editors := script_editor.get_open_script_editors()
		var open_scripts := script_editor.get_open_scripts()

		if not open_scripts.has(script):
			return

		if script_editor.get_current_script() == script:
			reload_code_edit(script_editor.get_current_editor().get_base_editor(), formatted_code, true)
		elif open_scripts.size() == open_script_editors.size():
			for i: int in range(open_scripts.size()):
				if open_scripts[i] == script:
					reload_code_edit(open_script_editors[i].get_base_editor(), formatted_code, true)
					return
		else:
			push_error("GDScript Formatter error: Unknown situation, can't reload code editor in Editor. Please report this issue.")

	if lint_on_save:
		var code_edit: CodeEdit = EditorInterface.get_script_editor().get_current_editor().get_base_editor()
		var lint_issues := lint_code(script)
		if lint_issues.is_empty():
			clear_lint_highlights(code_edit)
		else:
			apply_lint_highlights(code_edit, lint_issues)
			print_lint_summary(lint_issues, script.resource_path)


func add_format_command() -> void:
	if _has_format_command:
		return
	var formatter_path := get_editor_setting(SETTING_FORMATTER_PATH) as String
	if formatter_path.is_empty() or not _has_formatter_command:
		if not formatter_path.is_empty():
			push_error(
				'GDScript Formatter: The command "%s" can\'t be found in your environment.\n' % formatter_path +
				'\tIf you have not installed the formatter, use the install/update command from the command palette.\n' +
				'\tIf you have installed the formatter, change "formatter_path" to a valid command in the "GDScript Formatter" section in Editor Settings.',
			)
		return
	var shortcut := get_editor_setting(SETTING_SHORTCUT) as Shortcut
	EditorInterface.get_command_palette().add_command(
		COMMAND_PALETTE_FORMAT_SCRIPT,
		COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_FORMAT_SCRIPT,
		format_current_script,
		shortcut.get_as_text() if is_instance_valid(shortcut) else "None",
	)
	_has_format_command = true


func remove_format_command() -> void:
	if not _has_format_command:
		return
	EditorInterface.get_command_palette().remove_command(COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_FORMAT_SCRIPT)
	_has_format_command = false


func add_lint_command() -> void:
	if not _has_formatter_command or _has_lint_command:
		return

	EditorInterface.get_command_palette().add_command(
		COMMAND_PALETTE_LINT_SCRIPT,
		COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_LINT_SCRIPT,
		lint_current_script,
	)
	_has_lint_command = true


func remove_lint_command() -> void:
	if not _has_lint_command:
		return
	EditorInterface.get_command_palette().remove_command(
		COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_LINT_SCRIPT,
	)
	_has_lint_command = false


func add_install_update_command() -> void:
	EditorInterface.get_command_palette().add_command(
		COMMAND_PALETTE_INSTALL_UPDATE,
		COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_INSTALL_UPDATE,
		installer.install_or_update_formatter,
	)


func remove_install_update_command() -> void:
	EditorInterface.get_command_palette().remove_command(COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_INSTALL_UPDATE)


func add_uninstall_command() -> void:
	if is_formatter_installed_locally():
		EditorInterface.get_command_palette().add_command(
			COMMAND_PALETTE_UNINSTALL,
			COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_UNINSTALL,
			uninstall_formatter,
		)
		_has_uninstall_command = true


func remove_uninstall_command() -> void:
	if not _has_uninstall_command:
		return
	EditorInterface.get_command_palette().remove_command(COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_UNINSTALL)
	_has_uninstall_command = false


func add_report_issue_command() -> void:
	EditorInterface.get_command_palette().add_command(
		COMMAND_PALETTE_REPORT_ISSUE,
		COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_REPORT_ISSUE,
		report_issue,
	)


func remove_report_issue_command() -> void:
	EditorInterface.get_command_palette().remove_command(COMMAND_PALETTE_CATEGORY + COMMAND_PALETTE_REPORT_ISSUE)


func has_command(command: String) -> bool:
	if command.is_empty():
		return false
	var output: Array = []
	var exit_code := OS.execute(command, ["--version"], output, true)
	return exit_code == OK


func is_formatter_available() -> bool:
	if _has_formatter_command:
		return true
	_has_formatter_command = has_command(get_editor_setting(SETTING_FORMATTER_PATH))
	return _has_formatter_command


func is_formatter_installed_locally() -> bool:
	var binary_name := "gdscript-formatter"
	if OS.get_name().to_lower().contains("windows"):
		binary_name = "gdscript-formatter.exe"
	var binary_path := formatter_cache_dir.path_join(binary_name)
	return FileAccess.file_exists(binary_path)


func uninstall_formatter() -> void:
	var binary_name := "gdscript-formatter"
	if OS.get_name().to_lower().contains("windows"):
		binary_name = "gdscript-formatter.exe"
	var binary_path := formatter_cache_dir.path_join(binary_name)

	if FileAccess.file_exists(binary_path):
		DirAccess.remove_absolute(binary_path)
		print("GDScript formatter uninstalled successfully from: ", binary_path)
		set_editor_setting(SETTING_FORMATTER_PATH, DEFAULT_SETTINGS[SETTING_FORMATTER_PATH])
		_has_formatter_command = false

		remove_format_command()
		remove_lint_command()
		add_format_command()
		remove_uninstall_command()
		add_uninstall_command()
		if is_instance_valid(menu):
			menu.update_menu(false)
	else:
		push_error("GDScript formatter not found in cache directory: ", binary_path)


func reorder_code() -> bool:
	if not is_formatter_available():
		return false
	if not EditorInterface.get_script_editor().is_visible_in_tree():
		return false
	var current_script := EditorInterface.get_script_editor().get_current_script()
	if not is_instance_valid(current_script) or not current_script is GDScript:
		return false
	var code_edit: CodeEdit = EditorInterface.get_script_editor().get_current_editor().get_base_editor()

	var formatted_code := format_code(current_script, true, code_edit.text)
	if formatted_code.is_empty():
		return false

	reload_code_edit(code_edit, formatted_code)
	return true


func report_issue() -> void:
	OS.shell_open("https://github.com/GDQuest/GDScript-formatter/issues")


func show_help() -> void:
	OS.shell_open("https://www.gdquest.com/library/gdscript_formatter/")


func _on_menu_item_selected(command: String) -> void:
	match command:
		"format_script":
			format_current_script()
		"lint_script":
			lint_current_script()
		"reorder_code":
			reorder_code()
		"install_update":
			installer.install_or_update_formatter()
		"uninstall":
			uninstall_formatter()
		"report_issue":
			report_issue()
		"help":
			show_help()
		_:
			push_warning("Unsupported command sent from the menu: " + command)


## Reloads the code editor with new text while preserving editor state.
## This includes cursor position, scroll position, breakpoints, bookmarks, and folds.
func reload_code_edit(
		code_edit: CodeEdit,
		new_text: String,
		tag_saved := false,
) -> void:
	var editor_state := CodeEditState.new(code_edit)
	code_edit.text = new_text
	if tag_saved:
		code_edit.tag_saved_version()
	editor_state.restore_to_editor(code_edit)
	code_edit.update_minimum_size()
	code_edit.text_changed.emit()


func get_editor_setting(setting_name: String) -> Variant:
	var editor_settings := EditorInterface.get_editor_settings()
	var full_setting_key := EDITOR_SETTINGS_CATEGORY + setting_name
	if editor_settings.has_setting(full_setting_key):
		return editor_settings.get_setting(full_setting_key)
	return DEFAULT_SETTINGS[setting_name]


func set_editor_setting(setting_name: String, value: Variant) -> void:
	var editor_settings := EditorInterface.get_editor_settings()
	var full_setting_key := EDITOR_SETTINGS_CATEGORY + setting_name
	editor_settings.set_setting(full_setting_key, value)


func has_editor_setting(setting_name: String) -> bool:
	var editor_settings := EditorInterface.get_editor_settings()
	var full_setting_key := EDITOR_SETTINGS_CATEGORY + setting_name
	return editor_settings.has_setting(full_setting_key)


## Returns true if this script should be formatted automatically on save, based
## on the project's .editorconfig file. Returns false if the config says not to
## format on save. Returns null if no rule matches (then it's the user editor
## settings that take over).
func get_editorconfig_format_on_save(script_path: String) -> Variant:
	var editorconfig_path := ProjectSettings.globalize_path("res://.editorconfig")
	var modified_time := FileAccess.get_modified_time(editorconfig_path)
	if modified_time != _editorconfig_last_modified_time:
		_editorconfig_last_modified_time = modified_time
		_editorconfig_format_on_save_rules.clear()
		load_editorconfig_format_on_save_rules(editorconfig_path)

	var relative_script_path := script_path.trim_prefix("res://")
	var format_on_save = null
	for rule: Dictionary in _editorconfig_format_on_save_rules:
		var pattern := rule["pattern"] as String
		if pattern.is_empty() or editorconfig_section_matches(pattern, relative_script_path):
			format_on_save = rule["format_on_save"]

	return format_on_save


## Loads the project editorconfig file and parses format on save rules.
func load_editorconfig_format_on_save_rules(editorconfig_path: String) -> void:
	var editorconfig_file := FileAccess.open(editorconfig_path, FileAccess.READ)
	if editorconfig_file == null:
		return

	var pattern := ""

	while not editorconfig_file.eof_reached():
		var line := editorconfig_file.get_line().strip_edges()
		if line.is_empty() or line.begins_with("#") or line.begins_with(";"):
			continue

		if line.begins_with("[") and line.ends_with("]"):
			pattern = line.trim_prefix("[").trim_suffix("]")
			continue

		if not line.contains("="):
			continue

		var key_and_value := line.split("=", true, 1)
		if key_and_value[0].strip_edges().to_lower() != "gdscript_formatter_format_on_save":
			continue

		match key_and_value[1].strip_edges().to_lower():
			"true":
				_editorconfig_format_on_save_rules.append({"pattern": pattern, "format_on_save": true})
			"false":
				_editorconfig_format_on_save_rules.append({"pattern": pattern, "format_on_save": false})

	editorconfig_file.close()


## Returns true if an EditorConfig section applies to a saved script.
## pattern: The EditorConfig pattern to match against.
## relative_script_path: The path of the script relative to the project root.
func editorconfig_section_matches(pattern: String, relative_script_path: String) -> bool:
	if pattern.is_empty():
		return false

	var normalized_pattern := pattern.trim_prefix("/")
	var matching_path := relative_script_path
	# If there's no / in the pattern it means this pattern targets a filename.
	# It's not a folder/path glob pattern.
	if not normalized_pattern.contains("/"):
		matching_path = relative_script_path.get_file()

	return matching_path.match(normalized_pattern)


## Formats GDScript code using the GDScript Formatter and returns it as a string.
## When source_content is null, reads the code from the GDScript resource directly.
## Otherwise, formats source_content without reading from the file.
##
## Pass a string through source_content when the user is editing the script in
## the editor and requests formatting without having saved their changes (in
## that case, the code they're editing only exists in the script editor's open
## tab).
func format_code(script: GDScript, force_reorder := false, source_content: Variant = null) -> String:
	var script_path := script.resource_path
	if source_content == null and script_path.is_empty():
		push_error("GDScript Formatter Error: Can't format an unsaved script.")
		return ""

	# Source content is not set, read from the GDScript resource instead.
	#
	# This is a bit of a hack to avoid two issues:
	#
	# 1. Running GDScript formatter on stdin/stdout through Godot with
	# OS.execute() has encoding issues with UTF-8 characters and we don't have
	# control over the output encoding (it might be assuming ASCII characters)
	#
	# 2. If we modify a file in place using the external formatter from Godot,
	# it will bring up a pop-up that warns users that the file has been changed
	# outside Godot.
	#
	# To work around that, I save a copy of the script as a temporary file,
	# format the file, and read it specifically as a UTF-8 string.
	if source_content == null:
		var source_file := FileAccess.open(ProjectSettings.globalize_path(script_path), FileAccess.READ)
		if not source_file:
			push_error("GDScript Formatter Error: Cannot read source file: " + script_path)
			return ""

		# FileAccess.get_as_text() reads the file as UTF-8. We use it here and after
		# formatting the temporary file.
		source_content = source_file.get_as_text()
		source_file.close()

	var path_temporary_file := OS.get_temp_dir().path_join("gdscript_formatter_%d.gd" % Time.get_ticks_msec())
	var temporary_file := FileAccess.open(path_temporary_file, FileAccess.WRITE)
	if temporary_file == null:
		push_error("GDScript Formatter Error: Cannot create temporary file: " + path_temporary_file)
		return ""
	temporary_file.store_string(source_content as String)
	temporary_file.close()

	var formatter_arguments := PackedStringArray()
	if get_editor_setting(SETTING_USE_SPACES):
		formatter_arguments.push_back("--use-spaces")
		formatter_arguments.push_back("--indent-size=%d" % get_editor_setting(SETTING_INDENT_SIZE))

	var format_mode := get_format_mode()
	var should_reorder := force_reorder or format_mode == FormatMode.REORDER_CODE

	if should_reorder:
		formatter_arguments.push_back("--reorder-code")

	if not force_reorder and format_mode == FormatMode.VERIFY_STRUCTURE:
		# NB: this is a deprecated flag, replaced with --verify-structure, but
		# we keep it here for users that have a previous version of the
		# formatter installed.
		formatter_arguments.push_back("--safe")

	formatter_arguments.push_back(path_temporary_file)

	var output: Array = []
	var exit_code := OS.execute(
		get_editor_setting(SETTING_FORMATTER_PATH),
		formatter_arguments,
		output,
		true,
	)

	var formatted_content := ""
	if exit_code == OK:
		var result_file := FileAccess.open(path_temporary_file, FileAccess.READ)
		if result_file:
			formatted_content = result_file.get_as_text()
			result_file.close()
		else:
			push_error("Format GDScript: Cannot read formatted output from temp file")
	else:
		push_error("Format GDScript failed: " + (script_path if not script_path.is_empty() else "unsaved script"))
		push_error(
			"\tExit code: " + str(exit_code) + " Output: " +
			(output[0].strip_edges() if output.size() > 0 else "No output"),
		)
		push_error('\tIf your script does not have any syntax errors, this might be a formatter bug.')

	if FileAccess.file_exists(path_temporary_file):
		DirAccess.remove_absolute(path_temporary_file)

	return formatted_content


func get_format_mode() -> int:
	return get_editor_setting(SETTING_FORMAT_MODE) as int


## Lints a GDScript file using the GDScript Formatter's linter,
## and returns an array of lint issues.
func lint_code(script: GDScript) -> Array:
	var script_path := script.resource_path
	var output: Array = []
	var formatter_arguments: Array = ["lint", ProjectSettings.globalize_path(script_path)]

	var max_line_length := get_editor_setting(SETTING_LINT_LINE_LENGTH) as int
	formatter_arguments.append("--max-line-length")
	formatter_arguments.append(str(max_line_length))

	var ignored_rules := get_editor_setting(SETTING_LINT_IGNORED_RULES) as String
	if not ignored_rules.is_empty():
		formatter_arguments.append("--disable")
		formatter_arguments.append(ignored_rules)

	var exit_code := OS.execute(get_editor_setting(SETTING_FORMATTER_PATH), formatter_arguments, output)
	if exit_code == OK:
		return [] # No issues found

	if exit_code == 1:
		# Parse lint output - the output is a single string with multiple lines
		var issues = []
		for output_item in output:
			var lines = output_item.split("\n")
			for line in lines:
				var trimmed_line = line.strip_edges()
				if trimmed_line.is_empty():
					continue
				var issue = parse_lint_issue(trimmed_line)
				if issue != null and not issue.is_empty():
					issues.push_back(issue)
		return issues

	push_error("Lint GDScript failed: " + script_path)
	push_error("\tExit code: " + str(exit_code) + " Output: " + (output.front().strip_edges() if output.size() > 0 else "No output"))
	return []


## Parses a lint issue line and returns a dictionary with issue information
func parse_lint_issue(line: String) -> Dictionary:
	# Expected format: filename:line:rule:severity: message
	var regex = RegEx.new()
	regex.compile(r"^(.*\.gd):(\d+):([^:]+):([^:]+):([\s\S]*)$")
	var result = regex.search(line)
	if result:
		return {
			"line": int(result.get_string(2)) - 1,
			"rule": result.get_string(3),
			"severity": result.get_string(4),
			"message": result.get_string(5).strip_edges(),
		}
	return { }


## Applies lint highlighting to the code editor
func apply_lint_highlights(code_edit: CodeEdit, issues: Array) -> void:
	clear_lint_highlights(code_edit)

	# Add and set up gutter for lint icons if not already present.
	# We check by name to avoid conflicts with gutters added by other addons.
	# Once added, the gutter is never removed so the layout doesn't shift on clear.
	var has_lint_gutter := false
	for i: int in code_edit.get_gutter_count():
		if code_edit.get_gutter_name(i) == GUTTER_LINT_ICONS_NAME:
			has_lint_gutter = true
			break
	if not has_lint_gutter:
		code_edit.add_gutter(GUTTER_LINT_ICON_INDEX)
		code_edit.set_gutter_name(GUTTER_LINT_ICON_INDEX, GUTTER_LINT_ICONS_NAME)
		code_edit.set_gutter_type(GUTTER_LINT_ICON_INDEX, CodeEdit.GutterType.GUTTER_TYPE_ICON)
		const EDITOR_ICON_DEFAULT_WIDTH = 16.0
		code_edit.set_gutter_width(GUTTER_LINT_ICON_INDEX, EDITOR_ICON_DEFAULT_WIDTH * EditorInterface.get_editor_scale())

	for issue in issues:
		var line_number: int = issue.line
		var severity: String = issue.severity

		var color := Color(1, 0, 0, 0.1) if severity == "error" else Color(1, 1, 0, 0.1)
		code_edit.set_line_background_color(line_number, color)
		var icon_name := "StatusError" if severity == "error" else "StatusWarning"
		var icon := EditorInterface.get_editor_theme().get_icon(icon_name, "EditorIcons")
		code_edit.set_line_gutter_icon(line_number, GUTTER_LINT_ICON_INDEX, icon)


## Prints a detailed summary of lint issues to the output
func print_lint_summary(issues: Array, script_path: String) -> void:
	print_rich("\n[b]=== Linting Results for %s ===[/b]\n" % script_path)
	print_rich("[b]Found [i]%s[/i] issue(s)\n[/b]" % issues.size())

	for issue in issues:
		var line_display = str(issue.line + 1) # Convert back to 1-based for display
		var severity_label = issue.severity.to_upper()
		print_rich(
			"[color=%s]%s[/color] on line [color=cyan]%s[/color] ([i]%s[/i])" % [
				"red" if severity_label == "ERROR" else "yellow",
				severity_label,
				line_display,
				issue.rule,
			],
		)
		print_rich("[i]%s[/i]\n" % [issue.message])

	print_rich("[b]=== End Linting Results ===[/b]\n")


## Clears all lint highlighting from the code editor.
## The lint gutter is intentionally kept so the layout does not shift.
func clear_lint_highlights(code_edit: CodeEdit) -> void:
	var lint_gutter_index := -1
	for i: int in code_edit.get_gutter_count():
		if code_edit.get_gutter_name(i) == GUTTER_LINT_ICONS_NAME:
			lint_gutter_index = i
			break

	for line in range(code_edit.get_line_count()):
		code_edit.set_line_background_color(line, Color(0, 0, 0, 0))
		if lint_gutter_index != -1:
			code_edit.set_line_gutter_icon(line, lint_gutter_index, null)


## Data structure to hold code editor state information
class CodeEditState:
	var caret_line: int
	var caret_column: int
	var horizontal_scroll: int
	var vertical_scroll: int
	var breakpoints: Dictionary[int, String] = { }
	var bookmarks: Dictionary[int, String] = { }
	var folds: Dictionary[int, String] = { }
	var code_edit: CodeEdit


	func _init(code_edit: CodeEdit) -> void:
		self.code_edit = code_edit
		caret_line = code_edit.get_caret_line()
		caret_column = code_edit.get_caret_column()
		horizontal_scroll = code_edit.scroll_horizontal
		vertical_scroll = code_edit.scroll_vertical

		for line in code_edit.get_breakpointed_lines():
			breakpoints[line] = code_edit.get_line(line)
		for line in code_edit.get_bookmarked_lines():
			bookmarks[line] = code_edit.get_line(line)
		for line in code_edit.get_folded_lines():
			folds[line] = code_edit.get_line(line)


	func restore_to_editor(code_edit: CodeEdit) -> void:
		var new_line_count := code_edit.get_line_count()

		_restore_line_features(breakpoints, code_edit.set_line_as_breakpoint, new_line_count)
		_restore_line_features(bookmarks, code_edit.set_line_as_bookmarked, new_line_count)
		_restore_line_features(folds, func(line: int, _is_folded: bool) -> void: code_edit.fold_line(line), new_line_count)

		code_edit.set_caret_line(caret_line)
		code_edit.set_caret_column(caret_column)

		code_edit.scroll_horizontal = horizontal_scroll
		code_edit.scroll_vertical = vertical_scroll


	## Restores line-based features (breakpoints, bookmarks, folds) by finding the best matching lines
	## in the new text based on similarity to the original line text.
	##
	## Big thanks to https://github.com/Daylily-Zeleen/GDScript-Formatter for this approach.
	func _restore_line_features(
			stored_features: Dictionary,
			set_line_func: Callable,
			new_line_count: int,
	) -> void:
		var stored_lines := PackedInt64Array(stored_features.keys())
		for line_index in range(stored_lines.size()):
			var original_line := stored_lines[line_index] as int
			var original_text := stored_features[original_line] as String

			# After formatting lines can move, so we need to find the best match for the original line
			# to restore the breakpoints, bookmarks, and folds.
			# We first check the same line, then we expand our search outwards until we find a match.
			# We use a similarity threshold of 0.9 to account for minor changes in the line text.
			# This should be sufficient for most cases, but might need adjustment for edge cases.
			# If no match is found, we skip restoring this feature
			if original_line < new_line_count and code_edit.get_line(original_line).similarity(original_text) > 0.9:
				set_line_func.call(original_line, true)
				continue

			var line_above := original_line - 1
			var line_below := original_line + 1
			while line_above >= 0 or line_below < new_line_count:
				if line_below < new_line_count and code_edit.get_line(line_below).similarity(original_text) > 0.9:
					set_line_func.call(line_below, true)
					break
				if line_above >= 0 and code_edit.get_line(line_above).similarity(original_text) > 0.9:
					set_line_func.call(line_above, true)
					break

				line_above -= 1
				line_below += 1
