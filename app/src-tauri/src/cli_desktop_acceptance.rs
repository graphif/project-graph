use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::thread;
use std::time::Duration;

fn required_path(variable: &str) -> Result<PathBuf, String> {
    std::env::var_os(variable)
        .map(PathBuf::from)
        .ok_or_else(|| format!("Missing desktop acceptance path: {variable}"))
}

#[tauri::command]
pub(crate) fn load_cli_desktop_acceptance_manifest() -> Result<Value, String> {
    let path = required_path("PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_MANIFEST_PATH")?;
    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn write_cli_desktop_acceptance_state(state: Value) -> Result<(), String> {
    let path = required_path("PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_STATE_PATH")?;
    let content = serde_json::to_vec(&state).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) async fn wait_for_cli_desktop_acceptance_completion() -> Result<(), String> {
    let path = required_path("PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_COMPLETION_PATH")?;
    tauri::async_runtime::spawn_blocking(move || {
        while !path.exists() {
            thread::sleep(Duration::from_millis(25));
        }
    })
    .await
    .map_err(|error| error.to_string())
}
