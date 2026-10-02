extends RefCounted
## Bounded reader for the JSON-compatible MessagePack emitted by master.
## Binary, extension, non-string map keys and non-finite numbers are rejected.
const MAX_BYTES := 16 * 1024 * 1024
const MAX_VALUES := 300000
const MAX_DEPTH := 100

var _buffer := StreamPeerBuffer.new()
var _error := ""
var _values := 0


func decode(data: PackedByteArray) -> Dictionary:
	if data.is_empty() or data.size() > MAX_BYTES:
		return {"ok": false, "error": "MessagePack 文件为空或过大"}
	_buffer.data_array = data
	_buffer.big_endian = true
	_error = ""
	_values = 0
	var value: Variant = _read(0)
	if _error.is_empty() and _buffer.get_available_bytes() != 0:
		_error = "MessagePack 包含多余数据"
	return {"ok": _error.is_empty(), "error": _error, "data": value}


func _require(count: int) -> bool:
	if count < 0 or count > _buffer.get_available_bytes():
		_error = "MessagePack 数据截断"
		return false
	return true


func _length(bytes: int) -> int:
	if not _require(bytes):
		return 0
	match bytes:
		1: return _buffer.get_u8()
		2: return _buffer.get_u16()
		4: return _buffer.get_u32()
	return 0


func _read(depth: int) -> Variant:
	_values += 1
	if depth > MAX_DEPTH or _values > MAX_VALUES:
		_error = "MessagePack 层级或元素数量过多"
	if not _error.is_empty() or not _require(1):
		return null
	var tag := _buffer.get_u8()
	if tag <= 0x7f:
		return tag
	if tag >= 0xe0:
		return tag - 256
	if tag >= 0xa0 and tag <= 0xbf:
		return _string(tag & 0x1f)
	if tag >= 0x90 and tag <= 0x9f:
		return _array(tag & 0x0f, depth)
	if tag >= 0x80 and tag <= 0x8f:
		return _map(tag & 0x0f, depth)
	match tag:
		0xc0: return null
		0xc2: return false
		0xc3: return true
		0xcc, 0xcd, 0xce: return _length(1 << (tag - 0xcc))
		0xcf:
			if not _require(8):
				return null
			var high := _buffer.get_u32()
			var low := _buffer.get_u32()
			if high > 0x7fffffff:
				_error = "MessagePack 整数超出范围"
				return null
			return (high << 32) | low
		0xd0:
			if _require(1): return _buffer.get_8()
		0xd1:
			if _require(2): return _buffer.get_16()
		0xd2:
			if _require(4): return _buffer.get_32()
		0xd3:
			if _require(8): return _buffer.get_64()
		0xca, 0xcb:
			if not _require(4 if tag == 0xca else 8):
				return null
			var number := _buffer.get_float() if tag == 0xca else _buffer.get_double()
			if not is_finite(number):
				_error = "MessagePack 包含非有限数字"
			return number
		0xd9, 0xda, 0xdb:
			return _string(_length(1 << (tag - 0xd9)))
		0xdc, 0xdd:
			return _array(_length(2 if tag == 0xdc else 4), depth)
		0xde, 0xdf:
			return _map(_length(2 if tag == 0xde else 4), depth)
		_:
			_error = "不支持的 MessagePack 类型: 0x%02x" % tag
	return null


func _string(length: int) -> Variant:
	if not _error.is_empty() or not _require(length):
		return null
	return _buffer.get_data(length)[1].get_string_from_utf8()


func _array(length: int, depth: int) -> Variant:
	if not _error.is_empty() or length > MAX_VALUES - _values or not _require(length):
		if _error.is_empty():
			_error = "MessagePack 数组过大"
		return null
	var array := []
	for i in length:
		array.append(_read(depth + 1))
		if not _error.is_empty():
			return null
	return array


func _map(length: int, depth: int) -> Variant:
	if not _error.is_empty() or length > (MAX_VALUES - _values) / 2 or not _require(length * 2):
		if _error.is_empty():
			_error = "MessagePack 对象过大"
		return null
	var map := {}
	for i in length:
		var key: Variant = _read(depth + 1)
		if not _error.is_empty():
			return null
		if not key is String or map.has(key):
			_error = "MessagePack 对象键无效或重复"
			return null
		map[key] = _read(depth + 1)
		if not _error.is_empty():
			return null
	return map
