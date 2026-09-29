class_name GraphPreferences
extends RefCounted

const PATH := "user://workspace.cfg"
const DEFAULTS := {
	"theme": "system", "grid_h": true, "grid_v": true, "grid_dots": false,
	"snap": false, "physics": true, "effects": true, "welcome": true,
	"left_mode": 0, "right_mode": 0, "ui_scale": 100.0, "camera_speed": 800.0,
	"classroom": false, "privacy": false, "quick": true,
}
static var _config := ConfigFile.new()
static var _loaded := false


static func ensure_loaded() -> void:
	if not _loaded:
		_config.load(PATH)
		# 旧版本默认使用深色主题；首次升级迁移到系统跟随，避免安装后仍锁定深色。
		if not _config.has_section_key("settings", "theme_mode_migrated"):
			if _config.get_value("settings", "theme", "mocha") == "mocha":
				_config.set_value("settings", "theme", "system")
			_config.set_value("settings", "theme_mode_migrated", true)
			_config.save(PATH)
		_loaded = true


static func value(key: String) -> Variant:
	ensure_loaded()
	var stored: Variant = _config.get_value("settings", key, DEFAULTS.get(key))
	if key == "theme" and stored == "park":
		return "mocha"
	return stored


static func set_value(key: String, new_value: Variant, persist: bool = true) -> Error:
	ensure_loaded()
	_config.set_value("settings", key, new_value)
	return flush() if persist else OK


static func flush() -> Error:
	ensure_loaded()
	return _config.save(PATH)


static func recent_files() -> PackedStringArray:
	ensure_loaded()
	return PackedStringArray(_config.get_value("files", "recent", PackedStringArray()))


static func remember(path: String) -> Error:
	var paths := recent_files()
	var index := paths.find(path)
	if index >= 0:
		paths.remove_at(index)
	paths.insert(0, path)
	if paths.size() > 50:
		paths.resize(50)
	return set_recent(paths)


static func set_recent(paths: PackedStringArray) -> Error:
	ensure_loaded()
	_config.set_value("files", "recent", paths)
	return _config.save(PATH)


static func key_bindings() -> Dictionary:
	ensure_loaded()
	return _config.get_value("keys", "bindings", {})


static func save_binding(command: String, event: InputEventKey) -> Error:
	var bindings := key_bindings()
	bindings[command] = {"keycode": event.keycode, "ctrl": event.ctrl_pressed, "shift": event.shift_pressed, "alt": event.alt_pressed, "meta": event.meta_pressed}
	_config.set_value("keys", "bindings", bindings)
	return _config.save(PATH)


static func reset_bindings() -> Error:
	ensure_loaded()
	_config.set_value("keys", "bindings", {})
	return _config.save(PATH)
