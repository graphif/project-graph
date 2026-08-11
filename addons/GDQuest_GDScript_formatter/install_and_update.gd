@tool
extends Node

enum HttpRequestState {
	IDLE,
	FETCHING_RELEASE_INFO,
	DOWNLOADING_BINARY,
}

const URL_GITHUB_API_LATEST_RELEASE = "https://api.github.com/repos/gdquest/GDScript-formatter/releases/latest"
signal installation_completed(binary_path: String)
signal installation_failed(error_message: String)

var http_request_state := HttpRequestState.IDLE
var http_request: HTTPRequest = HTTPRequest.new()
var formatter_cache_dir: String


func _init(cache_dir: String) -> void:
	formatter_cache_dir = cache_dir


func _ready() -> void:
	add_child(http_request)
	http_request.request_completed.connect(_on_request_completed)


func install_or_update_formatter() -> void:
	print("Starting GDScript formatter installation...")
	http_request_state = HttpRequestState.FETCHING_RELEASE_INFO
	http_request.request(URL_GITHUB_API_LATEST_RELEASE)


func _on_request_completed(
		_http_result: int,
		response_code: int,
		_http_headers: PackedStringArray,
		body: PackedByteArray,
) -> void:
	if response_code != 200:
		var error_message := "HTTP request failed. Response code: " + str(response_code)
		push_error(error_message)
		http_request_state = HttpRequestState.IDLE
		installation_failed.emit(error_message)
		return

	match http_request_state:
		HttpRequestState.FETCHING_RELEASE_INFO:
			_process_response_latest_release(body)
		HttpRequestState.DOWNLOADING_BINARY:
			_process_response_download_file(body)
		_:
			var error_message := "Unexpected HTTP request state: " + str(http_request_state)
			push_error(error_message)
			http_request_state = HttpRequestState.IDLE
			installation_failed.emit(error_message)


func _process_response_latest_release(body: PackedByteArray) -> void:
	var json = JSON.parse_string(body.get_string_from_utf8())
	if not json or not json.has("assets"):
		var error_message := "Failed to parse release information from GitHub API"
		push_error(error_message)
		http_request_state = HttpRequestState.IDLE
		installation_failed.emit(error_message)
		return

	print("GDScript Formatter release information loaded successfully")

	var assets = json["assets"]
	var tag = json["tag_name"]
	var download_url := _find_matching_asset(assets, tag)

	if download_url.is_empty():
		var error_message := "No matching binary found for current platform"
		push_error(error_message)
		http_request_state = HttpRequestState.IDLE
		installation_failed.emit(error_message)
		return

	print(
		"Found compatible release, starting download...\n",
		"Download URL: ",
		download_url,
	)

	http_request_state = HttpRequestState.DOWNLOADING_BINARY
	http_request.request(download_url)


func _process_response_download_file(body: PackedByteArray) -> void:
	http_request_state = HttpRequestState.IDLE

	print("Download completed successfully (", body.size(), " bytes)")

	var asset_info := _get_platform_info()
	if asset_info.is_empty():
		var error_message := "Failed to determine platform information"
		push_error(error_message)
		installation_failed.emit(error_message)
		return

	print("Extracting and installing binary...")
	var binary_path := _download_and_install_binary(body, asset_info)
	if binary_path.is_empty():
		var error_message := "Installation failed"
		push_error(error_message)
		installation_failed.emit(error_message)
		return

	print(
		"\n".join(
			[
				"GDScript formatter installed successfully!",
				"Binary location: " + binary_path,
			],
		),
	)
	installation_completed.emit(binary_path)


func _get_platform_info() -> Dictionary:
	var os_name := OS.get_name().to_lower()
	var processor_name := OS.get_processor_name().to_lower()
	var architecture := "x86_64"

	if processor_name.contains("aarch64") or processor_name.contains("arm64") or processor_name.contains("apple"):
		architecture = "aarch64"
	elif processor_name.contains("x86_64") or processor_name.contains("amd64"):
		architecture = "x86_64"

	var binary_name := "gdscript-formatter"
	if os_name.contains("windows"):
		binary_name = "gdscript-formatter.exe"

	var platform_info := {
		"architecture": architecture,
		"binary_name": binary_name,
	}

	if os_name.contains("windows"):
		platform_info["os"] = "windows"
	elif os_name.contains("linux"):
		platform_info["os"] = "linux"
	elif os_name.contains("macos") or os_name.contains("osx"):
		platform_info["os"] = "macos"

	return platform_info


func _find_matching_asset(assets: Array, tag: String) -> String:
	var platform_info := _get_platform_info()
	if platform_info.is_empty():
		return ""

	var expected_pattern := "gdscript-formatter-%s-%s-%s" % [tag, platform_info["os"], platform_info["architecture"]]
	if platform_info["os"] == "windows":
		expected_pattern += ".exe"
	expected_pattern += ".zip"

	for asset in assets:
		var asset_name: String = asset["name"]
		if asset_name == expected_pattern:
			return asset["browser_download_url"]

	return ""


func _download_and_install_binary(zip_data: PackedByteArray, platform_info: Dictionary) -> String:
	var binary_name: String = platform_info["binary_name"]
	# We get the contents of the zip file as a byte array. we need to write
	# it to a file to be able to read it. We use a temporary file for that.
	var temp_archive_path := formatter_cache_dir.path_join("temp_formatter_archive.zip")

	print("Installing to cache directory: ", formatter_cache_dir)

	# Create the gdquest cache directory if it doesn't exist
	if not DirAccess.dir_exists_absolute(formatter_cache_dir):
		var dir_result := DirAccess.make_dir_recursive_absolute(formatter_cache_dir)
		if dir_result != OK:
			push_error("Failed to create cache directory: ", formatter_cache_dir)
			return ""

	var temp_file := FileAccess.open(temp_archive_path, FileAccess.WRITE)
	if not temp_file:
		push_error("Failed to create temporary archive file")
		return ""

	temp_file.store_buffer(zip_data)
	temp_file.close()

	var zip_reader := ZIPReader.new()
	var err := zip_reader.open(temp_archive_path)
	if err != OK:
		push_error("Failed to open ZIP archive from temporary file")
		zip_reader.close()
		DirAccess.remove_absolute(temp_archive_path)
		return ""

	var files := zip_reader.get_files()
	var binary_data: PackedByteArray
	var found_binary := false
	var actual_binary_name := ""

	for file_path in files:
		if not file_path.ends_with("/"):
			binary_data = zip_reader.read_file(file_path)
			actual_binary_name = file_path.get_file()
			found_binary = true
			break

	zip_reader.close()

	DirAccess.remove_absolute(temp_archive_path)
	if not found_binary:
		push_error("No executable found in ZIP archive")
		return ""

	var binary_path := formatter_cache_dir.path_join(binary_name)

	var file := FileAccess.open(binary_path, FileAccess.WRITE)
	if not file:
		push_error("Failed to create binary file at: ", binary_path)
		return ""

	file.store_buffer(binary_data)
	file.close()

	if not OS.get_name().to_lower().contains("windows"):
		# This should be equivalent to setting the binary to permissions 755
		const UNIX_EXECUTABLE_PERMISSIONS = (
			FileAccess.UNIX_READ_OWNER
			| FileAccess.UNIX_WRITE_OWNER
			| FileAccess.UNIX_EXECUTE_OWNER
			| FileAccess.UNIX_READ_GROUP
			| FileAccess.UNIX_EXECUTE_GROUP
			| FileAccess.UNIX_READ_OTHER
			| FileAccess.UNIX_EXECUTE_OTHER
		)
		var permissions_error := FileAccess.set_unix_permissions(binary_path, UNIX_EXECUTABLE_PERMISSIONS)
		if permissions_error != OK:
			push_error("Failed to make formatter executable: ", binary_path)
			DirAccess.remove_absolute(binary_path)
			return ""

	return binary_path
