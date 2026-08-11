use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::fs::{self, File, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const STORE_FILE_NAME: &str = "ai-project-references.json";
static NEXT_TEMPORARY_FILE_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredProjectReferences {
    version: u8,
    references: Value,
    updated_at: u64,
}

fn project_key(project_uri: &str) -> String {
    format!("project:{project_uri}:references")
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(path) = std::env::var_os("PROJECT_GRAPH_REFERENCE_STORE_PATH") {
        return Ok(PathBuf::from(path));
    }
    app.path()
        .app_data_dir()
        .map(|directory| directory.join(STORE_FILE_NAME))
        .map_err(|error| error.to_string())
}

fn lock_path(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(".lock");
    PathBuf::from(name)
}

pub fn acquire_reference_store_lock(path: &Path) -> Result<File, String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Project Object Reference store path has no parent".to_owned())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let lock = OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .open(lock_path(path))
        .map_err(|error| error.to_string())?;
    lock.lock().map_err(|error| error.to_string())?;
    Ok(lock)
}

fn read_store(path: &Path) -> Result<Map<String, Value>, String> {
    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Map::new()),
        Err(error) => return Err(error.to_string()),
    };
    let value: Value = serde_json::from_str(&content).map_err(|error| error.to_string())?;
    value
        .as_object()
        .cloned()
        .ok_or_else(|| "Invalid Project Object Reference store".to_owned())
}

fn write_store_atomically(path: &Path, store: &Map<String, Value>) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Project Object Reference store path has no parent".to_owned())?;
    let file_name = path
        .file_name()
        .ok_or_else(|| "Project Object Reference store path has no file name".to_owned())?
        .to_string_lossy();
    let temporary_path = parent.join(format!(
        ".{file_name}.{}.{}.tmp",
        std::process::id(),
        NEXT_TEMPORARY_FILE_ID.fetch_add(1, Ordering::Relaxed)
    ));
    let result = (|| {
        let mut temporary = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary_path)
            .map_err(|error| error.to_string())?;
        let serialized = serde_json::to_vec(store).map_err(|error| error.to_string())?;
        temporary
            .write_all(&serialized)
            .map_err(|error| error.to_string())?;
        temporary.flush().map_err(|error| error.to_string())?;
        fs::rename(&temporary_path, path).map_err(|error| error.to_string())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary_path);
    }
    result
}

fn load_snapshot(path: &Path, project_uri: &str) -> Result<Option<Value>, String> {
    let _lock = acquire_reference_store_lock(path)?;
    let store = read_store(path)?;
    let Some(value) = store.get(&project_key(project_uri)) else {
        return Ok(None);
    };
    let stored: StoredProjectReferences =
        serde_json::from_value(value.clone()).map_err(|error| error.to_string())?;
    if stored.version != 1 {
        return Err("Invalid Project Object Reference snapshot version".to_owned());
    }
    let _ = stored.updated_at;
    Ok(Some(stored.references))
}

fn save_snapshot(path: &Path, project_uri: &str, references: Value) -> Result<(), String> {
    let _lock = acquire_reference_store_lock(path)?;
    let mut store = read_store(path)?;
    let updated_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis() as u64;
    store.insert(
        project_key(project_uri),
        json!({
            "version": 1,
            "references": references,
            "updatedAt": updated_at,
        }),
    );
    write_store_atomically(path, &store)
}

#[tauri::command]
pub(crate) async fn load_project_reference_snapshot(
    app: AppHandle,
    project_uri: String,
) -> Result<Option<Value>, String> {
    let path = store_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || load_snapshot(&path, &project_uri))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub(crate) async fn save_project_reference_snapshot(
    app: AppHandle,
    project_uri: String,
    references: Value,
) -> Result<(), String> {
    let path = store_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || save_snapshot(&path, &project_uri, references))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Barrier};
    use std::thread;

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "project-graph-reference-store-{}-{}",
                std::process::id(),
                NEXT_TEMPORARY_FILE_ID.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&path).unwrap();
            Self(path)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.0).unwrap();
        }
    }

    fn snapshot(number: u64) -> Value {
        json!({ "entries": [], "nextNodeRef": number, "nextEdgeRef": 1 })
    }

    #[test]
    fn concurrent_projects_keep_both_snapshots() {
        let directory = TestDirectory::new();
        let path = Arc::new(directory.0.join(STORE_FILE_NAME));
        let barrier = Arc::new(Barrier::new(3));
        let workers: Vec<_> = [("file:///first.prg", 2), ("file:///second.prg", 3)]
            .into_iter()
            .map(|(project_uri, number)| {
                let path = Arc::clone(&path);
                let barrier = Arc::clone(&barrier);
                thread::spawn(move || {
                    barrier.wait();
                    save_snapshot(&path, project_uri, snapshot(number)).unwrap();
                })
            })
            .collect();
        barrier.wait();
        for worker in workers {
            worker.join().unwrap();
        }

        assert_eq!(
            load_snapshot(&path, "file:///first.prg").unwrap(),
            Some(snapshot(2))
        );
        assert_eq!(
            load_snapshot(&path, "file:///second.prg").unwrap(),
            Some(snapshot(3))
        );
    }

    #[test]
    fn corrupt_store_is_not_rebuilt() {
        let directory = TestDirectory::new();
        let path = directory.0.join(STORE_FILE_NAME);
        fs::write(&path, "not json").unwrap();

        assert!(save_snapshot(&path, "file:///graph.prg", snapshot(2)).is_err());
        assert_eq!(fs::read_to_string(path).unwrap(), "not json");
    }
}
