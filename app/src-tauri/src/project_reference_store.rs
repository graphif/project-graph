use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::collections::HashSet;
use std::fmt;
use std::fs::{self, File, OpenOptions};
use std::io::{self, ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const APP_IDENTIFIER: &str = "liren.project-graph";
const STORE_FILE_NAME: &str = "ai-project-references.json";
static NEXT_TEMPORARY_FILE_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Debug)]
pub enum ProjectReferenceStoreError {
    PathUnavailable,
    Io(io::Error),
    InvalidStore,
    InvalidSnapshot,
    InvalidSnapshotEntry,
    DuplicateSnapshotReference,
    UnsupportedVersion,
    Clock,
}

impl fmt::Display for ProjectReferenceStoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::PathUnavailable => "Project Object Reference store path is unavailable",
            Self::Io(error) => return write!(formatter, "{error}"),
            Self::InvalidStore => "Invalid Project Object Reference store",
            Self::InvalidSnapshot => "Invalid Project Object Reference snapshot",
            Self::InvalidSnapshotEntry => "Invalid Project Object Reference snapshot entry",
            Self::DuplicateSnapshotReference => "Duplicate Project Object Reference snapshot entry",
            Self::UnsupportedVersion => "Invalid Project Object Reference snapshot version",
            Self::Clock => "System clock is before the Unix epoch",
        };
        formatter.write_str(message)
    }
}

impl std::error::Error for ProjectReferenceStoreError {}

impl From<io::Error> for ProjectReferenceStoreError {
    fn from(error: io::Error) -> Self {
        Self::Io(error)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredProjectReferences {
    version: u8,
    references: Value,
    updated_at: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectReferenceSnapshot {
    entries: Vec<Value>,
    next_node_ref: u64,
    next_edge_ref: u64,
}

#[derive(Deserialize)]
struct ProjectReferenceEntry {
    #[serde(rename = "ref")]
    reference: String,
    uuid: String,
}

pub struct ProjectReferenceStore {
    path: PathBuf,
    legacy_path: Option<PathBuf>,
}

impl ProjectReferenceStore {
    pub fn open_default() -> Result<Self, ProjectReferenceStoreError> {
        if let Some(path) = std::env::var_os("PROJECT_GRAPH_REFERENCE_STORE_PATH") {
            return Ok(Self {
                path: PathBuf::from(path),
                legacy_path: None,
            });
        }
        let data_directory = dirs::data_dir().ok_or(ProjectReferenceStoreError::PathUnavailable)?;
        let path = data_directory.join(APP_IDENTIFIER).join(STORE_FILE_NAME);
        #[cfg(target_os = "macos")]
        let legacy_path = None;
        #[cfg(not(target_os = "macos"))]
        let legacy_path = dirs::home_dir().map(|home| {
            home.join("Library")
                .join("Application Support")
                .join(APP_IDENTIFIER)
                .join(STORE_FILE_NAME)
        });
        Ok(Self { path, legacy_path })
    }

    pub fn load(
        &self,
        project_uri: &str,
        legacy_project_uri: Option<&str>,
    ) -> Result<Option<Value>, ProjectReferenceStoreError> {
        self.migrate_legacy_store()?;
        let _lock = acquire_reference_store_lock(&self.path)?;
        let store = read_store(&self.path)?;
        let value = store.get(&project_key(project_uri)).or_else(|| {
            legacy_project_uri
                .filter(|legacy_uri| *legacy_uri != project_uri)
                .and_then(|legacy_uri| store.get(&project_key(legacy_uri)))
        });
        value.map(decode_snapshot).transpose()
    }

    pub fn save(
        &self,
        project_uri: &str,
        references: Value,
    ) -> Result<(), ProjectReferenceStoreError> {
        let references = validate_snapshot(references)?;
        self.migrate_legacy_store()?;
        let _lock = acquire_reference_store_lock(&self.path)?;
        ensure_existing_store_is_writable(&self.path)?;
        let mut store = read_store(&self.path)?;
        let key = project_key(project_uri);
        if let Some(existing) = store.get(&key) {
            decode_snapshot(existing)?;
        }
        let updated_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| ProjectReferenceStoreError::Clock)?
            .as_millis() as u64;
        store.insert(
            key,
            json!({
                "version": 1,
                "references": references,
                "updatedAt": updated_at,
            }),
        );
        write_store_atomically(&self.path, &store)
    }

    fn migrate_legacy_store(&self) -> Result<(), ProjectReferenceStoreError> {
        let Some(legacy_path) = self.legacy_path.as_deref() else {
            return Ok(());
        };
        if !legacy_path.try_exists()? {
            return Ok(());
        }
        let _destination_lock = acquire_reference_store_lock(&self.path)?;
        let _legacy_lock = acquire_reference_store_lock(legacy_path)?;
        let legacy_store = read_store(legacy_path)?;
        let mut native_store = read_store(&self.path)?;
        let mut changed = false;
        for (key, value) in legacy_store {
            if native_store.contains_key(&key) {
                continue;
            }
            if is_project_reference_key(&key) {
                decode_snapshot(&value)?;
            }
            native_store.insert(key, value);
            changed = true;
        }
        if changed {
            ensure_existing_store_is_writable(&self.path)?;
            write_store_atomically(&self.path, &native_store)?;
        }
        Ok(())
    }

    #[cfg(test)]
    fn with_legacy_path(path: PathBuf, legacy_path: PathBuf) -> Self {
        Self {
            path,
            legacy_path: Some(legacy_path),
        }
    }
}

fn project_key(project_uri: &str) -> String {
    format!("project:{project_uri}:references")
}

fn lock_path(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(".lock");
    PathBuf::from(name)
}

fn acquire_reference_store_lock(path: &Path) -> Result<File, ProjectReferenceStoreError> {
    let parent = path
        .parent()
        .ok_or(ProjectReferenceStoreError::PathUnavailable)?;
    fs::create_dir_all(parent)?;
    let lock = OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .open(lock_path(path))?;
    lock.lock()?;
    Ok(lock)
}

fn read_store(path: &Path) -> Result<Map<String, Value>, ProjectReferenceStoreError> {
    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Map::new()),
        Err(error) => return Err(error.into()),
    };
    let value: Value =
        serde_json::from_str(&content).map_err(|_| ProjectReferenceStoreError::InvalidStore)?;
    value
        .as_object()
        .cloned()
        .ok_or(ProjectReferenceStoreError::InvalidStore)
}

fn ensure_existing_store_is_writable(path: &Path) -> Result<(), ProjectReferenceStoreError> {
    if path.try_exists()? {
        OpenOptions::new().write(true).open(path)?;
    }
    Ok(())
}

fn is_project_reference_key(key: &str) -> bool {
    key.starts_with("project:") && key.ends_with(":references")
}

fn decode_snapshot(value: &Value) -> Result<Value, ProjectReferenceStoreError> {
    let version = value
        .get("version")
        .and_then(Value::as_u64)
        .ok_or(ProjectReferenceStoreError::InvalidSnapshot)?;
    if version != 1 {
        return Err(ProjectReferenceStoreError::UnsupportedVersion);
    }
    let stored: StoredProjectReferences = serde_json::from_value(value.clone())
        .map_err(|_| ProjectReferenceStoreError::InvalidSnapshot)?;
    let _ = stored.updated_at;
    if stored.version != 1 {
        return Err(ProjectReferenceStoreError::UnsupportedVersion);
    }
    validate_snapshot(stored.references)
}

fn validate_snapshot(value: Value) -> Result<Value, ProjectReferenceStoreError> {
    let snapshot: ProjectReferenceSnapshot =
        serde_json::from_value(value).map_err(|_| ProjectReferenceStoreError::InvalidSnapshot)?;
    canonicalize_snapshot(snapshot)
}

fn canonicalize_snapshot(
    snapshot: ProjectReferenceSnapshot,
) -> Result<Value, ProjectReferenceStoreError> {
    if snapshot.next_node_ref < 1 || snapshot.next_edge_ref < 1 {
        return Err(ProjectReferenceStoreError::InvalidSnapshot);
    }
    let mut references = HashSet::new();
    let mut uuids = HashSet::new();
    let mut entries = Vec::with_capacity(snapshot.entries.len());
    for value in snapshot.entries {
        let entry: ProjectReferenceEntry = serde_json::from_value(value)
            .map_err(|_| ProjectReferenceStoreError::InvalidSnapshotEntry)?;
        if !is_object_reference(&entry.reference) || entry.uuid.is_empty() {
            return Err(ProjectReferenceStoreError::InvalidSnapshotEntry);
        }
        if !references.insert(entry.reference.clone()) || !uuids.insert(entry.uuid.clone()) {
            return Err(ProjectReferenceStoreError::DuplicateSnapshotReference);
        }
        entries.push(json!({ "ref": entry.reference, "uuid": entry.uuid }));
    }
    Ok(json!({
        "entries": entries,
        "nextNodeRef": snapshot.next_node_ref,
        "nextEdgeRef": snapshot.next_edge_ref,
    }))
}

fn is_object_reference(reference: &str) -> bool {
    let Some(number) = reference
        .strip_prefix('n')
        .or_else(|| reference.strip_prefix('e'))
    else {
        return false;
    };
    !number.is_empty()
        && !number.starts_with('0')
        && number.bytes().all(|character| character.is_ascii_digit())
}

fn write_store_atomically(
    path: &Path,
    store: &Map<String, Value>,
) -> Result<(), ProjectReferenceStoreError> {
    let parent = path
        .parent()
        .ok_or(ProjectReferenceStoreError::PathUnavailable)?;
    let file_name = path
        .file_name()
        .ok_or(ProjectReferenceStoreError::PathUnavailable)?
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
            .open(&temporary_path)?;
        let serialized =
            serde_json::to_vec(store).map_err(|_| ProjectReferenceStoreError::InvalidStore)?;
        temporary.write_all(&serialized)?;
        temporary.flush()?;
        fs::rename(&temporary_path, path)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary_path);
    }
    result
}

#[tauri::command]
pub(crate) async fn load_project_reference_snapshot(
    project_uri: String,
    legacy_project_uri: Option<String>,
) -> Result<Option<Value>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ProjectReferenceStore::open_default()?.load(&project_uri, legacy_project_uri.as_deref())
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(desktop_error)
}

#[tauri::command]
pub(crate) async fn save_project_reference_snapshot(
    project_uri: String,
    references: Value,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        ProjectReferenceStore::open_default()?.save(&project_uri, references)
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(desktop_error)
}

fn desktop_error(error: ProjectReferenceStoreError) -> String {
    match error {
        ProjectReferenceStoreError::InvalidSnapshot => "保存的 AI 项目引用格式无效".to_owned(),
        ProjectReferenceStoreError::InvalidSnapshotEntry => "AI对象引用快照格式无效".to_owned(),
        ProjectReferenceStoreError::DuplicateSnapshotReference => {
            "AI对象引用快照包含重复引用".to_owned()
        }
        error => error.to_string(),
    }
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
        json!({
            "entries": [{ "ref": "n1", "uuid": format!("node-{number}") }],
            "nextNodeRef": number,
            "nextEdgeRef": 1,
        })
    }

    fn store_at(path: PathBuf) -> ProjectReferenceStore {
        ProjectReferenceStore {
            path,
            legacy_path: None,
        }
    }

    #[test]
    fn loads_a_lazy_store_fixture_and_preserves_other_entries() {
        let directory = TestDirectory::new();
        let path = directory.0.join(STORE_FILE_NAME);
        fs::write(
            &path,
            serde_json::to_vec(&json!({
                "unrelated": { "kept": true },
                project_key("file:///legacy.prg"): {
                    "version": 1,
                    "references": snapshot(2),
                    "updatedAt": 1,
                    "futureField": true,
                }
            }))
            .unwrap(),
        )
        .unwrap();
        let store = store_at(path.clone());

        assert_eq!(
            store
                .load("file:///canonical.prg", Some("file:///legacy.prg"))
                .unwrap(),
            Some(snapshot(2))
        );
        store.save("file:///canonical.prg", snapshot(3)).unwrap();

        let saved: Value = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
        assert_eq!(saved["unrelated"], json!({ "kept": true }));
        assert_eq!(
            saved[project_key("file:///legacy.prg")]["futureField"],
            true
        );
        assert_eq!(
            saved[project_key("file:///canonical.prg")]["references"],
            snapshot(3)
        );
    }

    #[test]
    fn rejects_invalid_snapshots_and_unknown_versions() {
        let directory = TestDirectory::new();
        let path = directory.0.join(STORE_FILE_NAME);
        let store = store_at(path.clone());

        assert!(matches!(
            store.save(
                "file:///graph.prg",
                json!({ "entries": [], "nextNodeRef": 0, "nextEdgeRef": 1 })
            ),
            Err(ProjectReferenceStoreError::InvalidSnapshot)
        ));
        assert!(matches!(
            store.save(
                "file:///graph.prg",
                json!({
                    "entries": [{ "ref": "bad", "uuid": "node-1" }],
                    "nextNodeRef": 1,
                    "nextEdgeRef": 1,
                })
            ),
            Err(ProjectReferenceStoreError::InvalidSnapshotEntry)
        ));
        assert!(matches!(
            store.save(
                "file:///graph.prg",
                json!({
                    "entries": [
                        { "ref": "n1", "uuid": "node-1" },
                        { "ref": "n1", "uuid": "node-2" },
                    ],
                    "nextNodeRef": 2,
                    "nextEdgeRef": 1,
                })
            ),
            Err(ProjectReferenceStoreError::DuplicateSnapshotReference)
        ));
        fs::write(
            &path,
            serde_json::to_vec(&json!({
                project_key("file:///graph.prg"): {
                    "version": 2,
                    "references": snapshot(2),
                    "updatedAt": 1,
                }
            }))
            .unwrap(),
        )
        .unwrap();
        assert!(matches!(
            store.load("file:///graph.prg", None),
            Err(ProjectReferenceStoreError::UnsupportedVersion)
        ));
        let future_store = fs::read(&path).unwrap();
        assert!(matches!(
            store.save("file:///graph.prg", snapshot(3)),
            Err(ProjectReferenceStoreError::UnsupportedVersion)
        ));
        assert_eq!(fs::read(path).unwrap(), future_store);
    }

    #[test]
    fn preserves_desktop_snapshot_validation_errors() {
        assert_eq!(
            desktop_error(ProjectReferenceStoreError::InvalidSnapshot),
            "保存的 AI 项目引用格式无效"
        );
        assert_eq!(
            desktop_error(ProjectReferenceStoreError::InvalidSnapshotEntry),
            "AI对象引用快照格式无效"
        );
        assert_eq!(
            desktop_error(ProjectReferenceStoreError::DuplicateSnapshotReference),
            "AI对象引用快照包含重复引用"
        );
        assert_eq!(
            desktop_error(ProjectReferenceStoreError::UnsupportedVersion),
            "Invalid Project Object Reference snapshot version"
        );
    }

    #[test]
    fn imports_a_valid_legacy_path_without_removing_it() {
        let directory = TestDirectory::new();
        let path = directory.0.join("native").join(STORE_FILE_NAME);
        let legacy_path = directory.0.join("legacy").join(STORE_FILE_NAME);
        fs::create_dir_all(legacy_path.parent().unwrap()).unwrap();
        let legacy_value = json!({
            project_key("file:///graph.prg"): {
                "version": 1,
                "references": snapshot(2),
                "updatedAt": 1,
            }
        });
        fs::write(&legacy_path, serde_json::to_vec(&legacy_value).unwrap()).unwrap();
        let store = ProjectReferenceStore::with_legacy_path(path.clone(), legacy_path.clone());

        assert_eq!(
            store.load("file:///graph.prg", None).unwrap(),
            Some(snapshot(2))
        );
        assert_eq!(
            serde_json::from_slice::<Value>(&fs::read(&path).unwrap()).unwrap(),
            legacy_value
        );
        assert!(legacy_path.exists());
    }

    #[test]
    fn native_keys_win_while_legacy_only_keys_are_imported() {
        let directory = TestDirectory::new();
        let path = directory.0.join("native").join(STORE_FILE_NAME);
        let legacy_path = directory.0.join("legacy").join(STORE_FILE_NAME);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::create_dir_all(legacy_path.parent().unwrap()).unwrap();
        fs::write(
            &path,
            serde_json::to_vec(&json!({
                project_key("file:///graph.prg"): {
                    "version": 1,
                    "references": snapshot(2),
                    "updatedAt": 1,
                }
            }))
            .unwrap(),
        )
        .unwrap();
        fs::write(
            &legacy_path,
            serde_json::to_vec(&json!({
                project_key("file:///graph.prg"): {
                    "version": 2,
                    "references": snapshot(3),
                    "updatedAt": 1,
                },
                project_key("file:///legacy-only.prg"): {
                    "version": 1,
                    "references": snapshot(4),
                    "updatedAt": 1,
                }
            }))
            .unwrap(),
        )
        .unwrap();
        let store = ProjectReferenceStore::with_legacy_path(path.clone(), legacy_path.clone());

        assert_eq!(
            store.load("file:///graph.prg", None).unwrap(),
            Some(snapshot(2))
        );
        assert_eq!(
            store.load("file:///legacy-only.prg", None).unwrap(),
            Some(snapshot(4))
        );
        let native: Value = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
        assert_eq!(
            native[project_key("file:///graph.prg")]["references"],
            snapshot(2)
        );
        assert_eq!(
            native[project_key("file:///legacy-only.prg")]["references"],
            snapshot(4)
        );
        assert!(legacy_path.exists());
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
                    store_at(path.as_ref().clone())
                        .save(project_uri, snapshot(number))
                        .unwrap();
                })
            })
            .collect();
        barrier.wait();
        for worker in workers {
            worker.join().unwrap();
        }
        let store = store_at(path.as_ref().clone());

        assert_eq!(
            store.load("file:///first.prg", None).unwrap(),
            Some(snapshot(2))
        );
        assert_eq!(
            store.load("file:///second.prg", None).unwrap(),
            Some(snapshot(3))
        );
    }

    #[test]
    fn corrupt_store_is_not_rebuilt() {
        let directory = TestDirectory::new();
        let path = directory.0.join(STORE_FILE_NAME);
        fs::write(&path, "not json").unwrap();
        let store = store_at(path.clone());

        assert!(store.save("file:///graph.prg", snapshot(2)).is_err());
        assert_eq!(fs::read_to_string(path).unwrap(), "not json");
    }

    #[test]
    fn read_only_store_is_not_replaced() {
        let directory = TestDirectory::new();
        let path = directory.0.join(STORE_FILE_NAME);
        fs::write(&path, "{}").unwrap();
        let mut permissions = fs::metadata(&path).unwrap().permissions();
        permissions.set_readonly(true);
        fs::set_permissions(&path, permissions).unwrap();
        let store = store_at(path.clone());

        assert!(store.save("file:///graph.prg", snapshot(2)).is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "{}");

        let mut permissions = fs::metadata(&path).unwrap().permissions();
        permissions.set_readonly(false);
        fs::set_permissions(path, permissions).unwrap();
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn default_store_uses_the_tauri_roaming_app_data_contract() {
        assert!(std::env::var_os("PROJECT_GRAPH_REFERENCE_STORE_PATH").is_none());
        let store = ProjectReferenceStore::open_default().unwrap();
        let roaming_app_data = std::env::var_os("APPDATA").unwrap();

        assert_eq!(
            store.path,
            PathBuf::from(roaming_app_data)
                .join(APP_IDENTIFIER)
                .join(STORE_FILE_NAME)
        );
    }
}
