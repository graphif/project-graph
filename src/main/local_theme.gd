extends RefCounted

var _dark: Theme
var _light: Theme
var _entries: Array[Dictionary] = []
var _light_active := false


func configure(root: Control, dark: Theme, light: Theme) -> void:
	_dark = dark
	_light = light
	_register(root, root)


func _register(node: Node, root: Control) -> void:
	# 弹窗使用自己的主题；舞台由 Stage 更新，不能扫描进这些子树。
	if node is Window or node is SubViewport:
		return
	if node is Control and node != root:
		var entry := {"control": weakref(node), "items": [], "applied": -1}
		var types: Array[StringName] = []
		var variation: StringName = node.theme_type_variation
		while not variation.is_empty() and not types.has(variation):
			types.append(variation)
			variation = _dark.get_type_variation_base(variation)
		var native: StringName = node.get_class()
		while not native.is_empty():
			if not types.has(native):
				types.append(native)
			native = ClassDB.get_parent_class(native)
		for kind in ["color", "stylebox", "icon"]:
			var keys := {}
			for type in types:
				for palette in [_dark, _light]:
					var names: PackedStringArray
					match kind:
						"color": names = palette.get_color_list(type)
						"stylebox": names = palette.get_stylebox_list(type)
						"icon": names = palette.get_icon_list(type)
					for key in names:
						keys[key] = true
			for key in keys:
				# 保留场景和脚本显式设置的局部样式。
				if node.call("has_theme_" + kind + "_override", key):
					continue
				var baseline: Variant = node.call("get_theme_" + kind, key)
				var values: Array = []
				for palette in [_dark, _light]:
					var value: Variant = baseline
					for type in types:
						if palette.call("has_" + kind, key, type):
							value = palette.call("get_" + kind, key, type)
							break
					values.append(value)
				if values[0] != values[1]:
					entry.items.append({"kind": kind, "key": key, "values": values})
		if not entry.items.is_empty():
			_entries.append(entry)
			node.visibility_changed.connect(_apply_entry.bind(entry))
	for child in node.get_children(true):
		_register(child, root)


func apply(light: bool) -> void:
	_light_active = light
	for entry in _entries:
		_apply_entry(entry)


func apply_control(control: Control, light: bool) -> void:
	# 波纹中的实时按钮可以独立换肤，不改变下层页面的配色。
	for entry in _entries:
		if (entry.control as WeakRef).get_ref() == control:
			_apply_entry(entry, int(light))
			return


func _apply_entry(entry: Dictionary, target: int = -1) -> void:
	if target < 0:
		target = int(_light_active)
	var control := (entry.control as WeakRef).get_ref() as Control
	if control == null or not control.is_visible_in_tree() or entry.applied == target:
		return
	# 局部 override 只通知这个控件，避免 Theme 替换向整个子树传播。
	control.begin_bulk_theme_override()
	for item in entry.items:
		control.call("add_theme_" + str(item.kind) + "_override", item.key, item.values[target])
	control.end_bulk_theme_override()
	entry.applied = target
