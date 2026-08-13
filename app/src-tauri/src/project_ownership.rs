use crate::project_runtime_bridge::ProjectRuntimeBridgeManager;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs::{self, File, OpenOptions, TryLockError};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;

const OWNERSHIP_RETRY_DELAY: Duration = Duration::from_secs(5);
#[cfg(not(test))]
const APP_IDENTIFIER: &str = "liren.project-graph";
#[cfg(not(test))]
const OWNERSHIP_DIRECTORY_NAME: &str = "project-ownership";
pub(crate) const OWNERSHIP_DIRECTORY_ENVIRONMENT_VARIABLE: &str =
    "PROJECT_GRAPH_OWNERSHIP_DIRECTORY";
static NEXT_DESKTOP_OWNERSHIP_ID: AtomicU64 = AtomicU64::new(1);

enum ExclusiveLockAttempt {
    Acquired { used_retry: bool },
    Contended,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CanonicalProjectPath(PathBuf);

impl CanonicalProjectPath {
    pub fn as_path(&self) -> &Path {
        &self.0
    }

    pub(crate) fn to_protocol_string(&self) -> String {
        let path = self.0.to_string_lossy();
        #[cfg(windows)]
        {
            if let Some(path) = path.strip_prefix(r"\\?\UNC\") {
                return format!(r"\\{path}");
            }
            if let Some(path) = path.strip_prefix(r"\\?\") {
                return path.to_owned();
            }
        }
        path.into_owned()
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ProjectOwner {
    Connectable { endpoint: String },
    UnconnectableHolder,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ProjectOwnershipError {
    NotFound,
    LoadFailed,
    Busy { owner: ProjectOwner },
}

impl ProjectOwnershipError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::NotFound => "PROJECT_NOT_FOUND",
            Self::LoadFailed => "PROJECT_LOAD_FAILED",
            Self::Busy { .. } => "PROJECT_BUSY",
        }
    }

    pub fn owner(&self) -> Option<&ProjectOwner> {
        match self {
            Self::Busy { owner } => Some(owner),
            Self::NotFound | Self::LoadFailed => None,
        }
    }
}

#[derive(Debug)]
pub struct ProjectOwnership {
    canonical_path: CanonicalProjectPath,
    ownership_lock: File,
    connectable_owner_lock: Option<File>,
}

struct OwnershipArtifactPaths {
    ownership_lock: PathBuf,
    connectable_owner_lock: PathBuf,
    connectable_owner_record: PathBuf,
}

#[derive(Clone, Copy)]
enum OwnershipArtifact {
    OwnershipLock,
    ConnectableOwnerLock,
    ConnectableOwnerRecord,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(
    tag = "status",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub(crate) enum DesktopOwnershipAcquisition {
    Acquired {
        ownership_id: String,
        canonical_path: String,
    },
    AlreadyOwned {
        ownership_id: String,
        canonical_path: String,
    },
}

#[derive(Default)]
struct DesktopOwnershipState {
    ownership_by_id: HashMap<String, ProjectOwnership>,
    ownership_id_by_path: HashMap<PathBuf, String>,
    acquiring_paths: HashSet<PathBuf>,
}

#[derive(Default)]
pub(crate) struct DesktopProjectOwnershipManager {
    state: Mutex<DesktopOwnershipState>,
    acquisition_finished: Condvar,
}

#[derive(Debug, Serialize)]
pub(crate) struct DesktopProjectOwnershipError {
    code: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    owner: Option<ProjectOwner>,
}

impl From<ProjectOwnershipError> for DesktopProjectOwnershipError {
    fn from(error: ProjectOwnershipError) -> Self {
        let code = error.code();
        let owner = error.owner().cloned();
        Self { code, owner }
    }
}

impl DesktopProjectOwnershipManager {
    #[cfg(test)]
    pub(crate) fn acquire(
        &self,
        project_path: &Path,
    ) -> Result<DesktopOwnershipAcquisition, ProjectOwnershipError> {
        self.acquire_with_retry_delay(project_path, OWNERSHIP_RETRY_DELAY)
    }

    pub(crate) fn acquire_connectable(
        &self,
        project_path: &Path,
        endpoint: &str,
    ) -> Result<DesktopOwnershipAcquisition, ProjectOwnershipError> {
        self.acquire_with_owner_and_retry_delay(
            project_path,
            ProjectOwner::Connectable {
                endpoint: endpoint.to_owned(),
            },
            OWNERSHIP_RETRY_DELAY,
        )
    }

    pub(crate) fn acquire_for_save(
        &self,
        project_path: &Path,
    ) -> Result<DesktopOwnershipAcquisition, ProjectOwnershipError> {
        let canonical_path = canonicalize_project_save_target(project_path)?;
        self.acquire_canonical_with_owner_and_retry_delay(
            canonical_path,
            ProjectOwner::UnconnectableHolder,
            OWNERSHIP_RETRY_DELAY,
        )
    }

    #[cfg(test)]
    fn acquire_with_retry_delay(
        &self,
        project_path: &Path,
        retry_delay: Duration,
    ) -> Result<DesktopOwnershipAcquisition, ProjectOwnershipError> {
        self.acquire_with_owner_and_retry_delay(
            project_path,
            ProjectOwner::UnconnectableHolder,
            retry_delay,
        )
    }

    fn acquire_with_owner_and_retry_delay(
        &self,
        project_path: &Path,
        owner: ProjectOwner,
        retry_delay: Duration,
    ) -> Result<DesktopOwnershipAcquisition, ProjectOwnershipError> {
        let canonical_path = canonicalize_project_path(project_path)?;
        self.acquire_canonical_with_owner_and_retry_delay(canonical_path, owner, retry_delay)
    }

    fn acquire_canonical_with_owner_and_retry_delay(
        &self,
        canonical_path: CanonicalProjectPath,
        owner: ProjectOwner,
        retry_delay: Duration,
    ) -> Result<DesktopOwnershipAcquisition, ProjectOwnershipError> {
        {
            let mut state = self
                .state
                .lock()
                .map_err(|_| ProjectOwnershipError::LoadFailed)?;
            loop {
                if let Some(ownership_id) = state
                    .ownership_id_by_path
                    .get(canonical_path.as_path())
                    .cloned()
                {
                    return Ok(DesktopOwnershipAcquisition::AlreadyOwned {
                        ownership_id,
                        canonical_path: canonical_path.to_protocol_string(),
                    });
                }
                if state.acquiring_paths.insert(canonical_path.0.clone()) {
                    break;
                }
                state = self
                    .acquisition_finished
                    .wait(state)
                    .map_err(|_| ProjectOwnershipError::LoadFailed)?;
            }
        }

        let ownership_result = acquire_canonical_project_ownership_with_retry_delay(
            canonical_path.clone(),
            owner,
            retry_delay,
        );
        let mut state = self
            .state
            .lock()
            .map_err(|_| ProjectOwnershipError::LoadFailed)?;
        state.acquiring_paths.remove(canonical_path.as_path());
        let ownership = match ownership_result {
            Ok(ownership) => ownership,
            Err(error) => {
                self.acquisition_finished.notify_all();
                return Err(error);
            }
        };
        let ownership_id = format!(
            "desktop-{}-{}",
            std::process::id(),
            NEXT_DESKTOP_OWNERSHIP_ID.fetch_add(1, Ordering::Relaxed)
        );
        let canonical_path_string = canonical_path.to_protocol_string();
        state
            .ownership_id_by_path
            .insert(canonical_path.0, ownership_id.clone());
        state
            .ownership_by_id
            .insert(ownership_id.clone(), ownership);
        self.acquisition_finished.notify_all();
        Ok(DesktopOwnershipAcquisition::Acquired {
            ownership_id,
            canonical_path: canonical_path_string,
        })
    }

    pub(crate) fn make_connectable(
        &self,
        ownership_id: &str,
        endpoint: &str,
    ) -> Result<(), ProjectOwnershipError> {
        let canonical_path = {
            let state = self
                .state
                .lock()
                .map_err(|_| ProjectOwnershipError::LoadFailed)?;
            let ownership = state
                .ownership_by_id
                .get(ownership_id)
                .ok_or(ProjectOwnershipError::LoadFailed)?;
            if ownership.connectable_owner_lock.is_some() {
                return Ok(());
            }
            ownership.canonical_path.clone()
        };
        let owner = ProjectOwner::Connectable {
            endpoint: endpoint.to_owned(),
        };
        let connectable_owner_lock =
            acquire_connectable_owner_lock(&canonical_path, &owner, OWNERSHIP_RETRY_DELAY, false)?;
        let mut state = self
            .state
            .lock()
            .map_err(|_| ProjectOwnershipError::LoadFailed)?;
        let ownership = state
            .ownership_by_id
            .get_mut(ownership_id)
            .ok_or(ProjectOwnershipError::LoadFailed)?;
        ownership.connectable_owner_lock = Some(connectable_owner_lock);
        Ok(())
    }

    pub(crate) fn release(&self, ownership_id: &str) -> Result<(), ProjectOwnershipError> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| ProjectOwnershipError::LoadFailed)?;
        let Some(ownership) = state.ownership_by_id.remove(ownership_id) else {
            return Ok(());
        };
        state
            .ownership_id_by_path
            .remove(ownership.canonical_path().as_path());
        drop(ownership);
        Ok(())
    }
}

#[tauri::command]
pub(crate) async fn acquire_desktop_project_ownership(
    manager: tauri::State<'_, Arc<DesktopProjectOwnershipManager>>,
    runtime_bridge: tauri::State<'_, Arc<ProjectRuntimeBridgeManager>>,
    project_path: String,
) -> Result<DesktopOwnershipAcquisition, DesktopProjectOwnershipError> {
    let manager = Arc::clone(manager.inner());
    let endpoint = runtime_bridge.endpoint().to_owned();
    tauri::async_runtime::spawn_blocking(move || {
        manager.acquire_connectable(Path::new(&project_path), &endpoint)
    })
    .await
    .map_err(|_| DesktopProjectOwnershipError::from(ProjectOwnershipError::LoadFailed))?
    .map_err(DesktopProjectOwnershipError::from)
}

#[tauri::command]
pub(crate) async fn acquire_desktop_project_ownership_for_save(
    manager: tauri::State<'_, Arc<DesktopProjectOwnershipManager>>,
    project_path: String,
) -> Result<DesktopOwnershipAcquisition, DesktopProjectOwnershipError> {
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.acquire_for_save(Path::new(&project_path)))
        .await
        .map_err(|_| DesktopProjectOwnershipError::from(ProjectOwnershipError::LoadFailed))?
        .map_err(DesktopProjectOwnershipError::from)
}

#[tauri::command]
pub(crate) fn make_desktop_project_ownership_connectable(
    manager: tauri::State<'_, Arc<DesktopProjectOwnershipManager>>,
    runtime_bridge: tauri::State<'_, Arc<ProjectRuntimeBridgeManager>>,
    ownership_id: String,
) -> Result<(), DesktopProjectOwnershipError> {
    manager
        .make_connectable(&ownership_id, runtime_bridge.endpoint())
        .map_err(DesktopProjectOwnershipError::from)
}

#[tauri::command]
pub(crate) fn release_desktop_project_ownership(
    manager: tauri::State<'_, Arc<DesktopProjectOwnershipManager>>,
    ownership_id: String,
) -> Result<(), DesktopProjectOwnershipError> {
    manager
        .release(&ownership_id)
        .map_err(DesktopProjectOwnershipError::from)
}

impl ProjectOwnership {
    pub fn canonical_path(&self) -> &CanonicalProjectPath {
        &self.canonical_path
    }
}

impl Drop for ProjectOwnership {
    fn drop(&mut self) {
        if let Some(connectable_owner_lock) = &self.connectable_owner_lock {
            let _ = connectable_owner_lock.unlock();
        }
        let _ = self.ownership_lock.unlock();
    }
}

pub fn canonicalize_project_path(
    project_path: &Path,
) -> Result<CanonicalProjectPath, ProjectOwnershipError> {
    let canonical_path = fs::canonicalize(project_path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            ProjectOwnershipError::NotFound
        } else {
            ProjectOwnershipError::LoadFailed
        }
    })?;
    let is_project = canonical_path.is_file()
        && canonical_path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("prg"));
    if !is_project {
        return Err(ProjectOwnershipError::LoadFailed);
    }
    Ok(CanonicalProjectPath(canonical_path))
}

fn canonicalize_project_save_target(
    project_path: &Path,
) -> Result<CanonicalProjectPath, ProjectOwnershipError> {
    match fs::symlink_metadata(project_path) {
        Ok(_) => return canonicalize_project_path(project_path),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(_) => return Err(ProjectOwnershipError::LoadFailed),
    }
    let is_project = project_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("prg"));
    if !is_project {
        return Err(ProjectOwnershipError::LoadFailed);
    }
    let file_name = project_path
        .file_name()
        .ok_or(ProjectOwnershipError::LoadFailed)?;
    let parent = project_path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let canonical_parent =
        fs::canonicalize(parent).map_err(|_| ProjectOwnershipError::LoadFailed)?;
    if !canonical_parent.is_dir() {
        return Err(ProjectOwnershipError::LoadFailed);
    }
    Ok(CanonicalProjectPath(canonical_parent.join(file_name)))
}

pub fn acquire_project_ownership(
    project_path: &Path,
    owner: ProjectOwner,
) -> Result<ProjectOwnership, ProjectOwnershipError> {
    acquire_project_ownership_with_retry_delay(project_path, owner, OWNERSHIP_RETRY_DELAY)
}

pub fn try_acquire_project_ownership(
    project_path: &Path,
    owner: ProjectOwner,
) -> Result<ProjectOwnership, ProjectOwnershipError> {
    acquire_project_ownership_with_retry_delay(project_path, owner, Duration::ZERO)
}

fn acquire_project_ownership_with_retry_delay(
    project_path: &Path,
    owner: ProjectOwner,
    retry_delay: Duration,
) -> Result<ProjectOwnership, ProjectOwnershipError> {
    let canonical_path = canonicalize_project_path(project_path)?;
    acquire_canonical_project_ownership_with_retry_delay(canonical_path, owner, retry_delay)
}

fn acquire_canonical_project_ownership_with_retry_delay(
    canonical_path: CanonicalProjectPath,
    owner: ProjectOwner,
    retry_delay: Duration,
) -> Result<ProjectOwnership, ProjectOwnershipError> {
    let ownership_lock = open_lock_file(&canonical_path)?;
    let used_retry = match try_exclusive_lock(&ownership_lock, retry_delay, true)? {
        ExclusiveLockAttempt::Acquired { used_retry } => used_retry,
        ExclusiveLockAttempt::Contended => {
            return Err(ProjectOwnershipError::Busy {
                owner: read_current_owner(&canonical_path),
            });
        }
    };
    let connectable_owner_lock = match &owner {
        ProjectOwner::Connectable { .. } => Some(acquire_connectable_owner_lock(
            &canonical_path,
            &owner,
            retry_delay,
            !used_retry,
        )?),
        ProjectOwner::UnconnectableHolder => None,
    };
    Ok(ProjectOwnership {
        canonical_path,
        ownership_lock,
        connectable_owner_lock,
    })
}

fn try_exclusive_lock(
    lock_file: &File,
    retry_delay: Duration,
    retry_available: bool,
) -> Result<ExclusiveLockAttempt, ProjectOwnershipError> {
    match lock_file.try_lock() {
        Ok(()) => Ok(ExclusiveLockAttempt::Acquired { used_retry: false }),
        Err(TryLockError::WouldBlock) if retry_available => {
            thread::sleep(retry_delay);
            match lock_file.try_lock() {
                Ok(()) => Ok(ExclusiveLockAttempt::Acquired { used_retry: true }),
                Err(TryLockError::WouldBlock) => Ok(ExclusiveLockAttempt::Contended),
                Err(TryLockError::Error(_)) => Err(ProjectOwnershipError::LoadFailed),
            }
        }
        Err(TryLockError::WouldBlock) => Ok(ExclusiveLockAttempt::Contended),
        Err(TryLockError::Error(_)) => Err(ProjectOwnershipError::LoadFailed),
    }
}

fn open_lock_file(canonical_path: &CanonicalProjectPath) -> Result<File, ProjectOwnershipError> {
    open_ownership_file(canonical_path, OwnershipArtifact::OwnershipLock)
}

fn acquire_connectable_owner_lock(
    canonical_path: &CanonicalProjectPath,
    owner: &ProjectOwner,
    retry_delay: Duration,
    retry_available: bool,
) -> Result<File, ProjectOwnershipError> {
    let owner_lock = open_connectable_owner_lock(canonical_path)?;
    match try_exclusive_lock(&owner_lock, retry_delay, retry_available)? {
        ExclusiveLockAttempt::Acquired { .. } => {}
        ExclusiveLockAttempt::Contended => {
            return Err(ProjectOwnershipError::Busy {
                owner: ProjectOwner::UnconnectableHolder,
            });
        }
    }
    let owner_record = serde_json::to_vec(owner).map_err(|_| ProjectOwnershipError::LoadFailed)?;
    let mut owner_record_file = open_connectable_owner_record(canonical_path)?;
    record_owner(&mut owner_record_file, &owner_record)?;
    Ok(owner_lock)
}

fn open_connectable_owner_lock(
    canonical_path: &CanonicalProjectPath,
) -> Result<File, ProjectOwnershipError> {
    open_ownership_file(canonical_path, OwnershipArtifact::ConnectableOwnerLock)
}

fn open_connectable_owner_record(
    canonical_path: &CanonicalProjectPath,
) -> Result<File, ProjectOwnershipError> {
    open_ownership_file(canonical_path, OwnershipArtifact::ConnectableOwnerRecord)
}

fn ownership_directory() -> Result<PathBuf, ProjectOwnershipError> {
    if let Some(directory) = std::env::var_os(OWNERSHIP_DIRECTORY_ENVIRONMENT_VARIABLE) {
        if !directory.is_empty() {
            return Ok(PathBuf::from(directory));
        }
    }
    default_ownership_directory()
}

fn open_ownership_file(
    canonical_path: &CanonicalProjectPath,
    artifact: OwnershipArtifact,
) -> Result<File, ProjectOwnershipError> {
    let directory = ownership_directory()?;
    fs::create_dir_all(&directory).map_err(|_| ProjectOwnershipError::LoadFailed)?;
    let paths = ownership_artifact_paths(&directory, canonical_path);
    OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .open(match artifact {
            OwnershipArtifact::OwnershipLock => paths.ownership_lock,
            OwnershipArtifact::ConnectableOwnerLock => paths.connectable_owner_lock,
            OwnershipArtifact::ConnectableOwnerRecord => paths.connectable_owner_record,
        })
        .map_err(|_| ProjectOwnershipError::LoadFailed)
}

#[cfg(not(test))]
fn default_ownership_directory() -> Result<PathBuf, ProjectOwnershipError> {
    dirs::data_dir()
        .map(|directory| {
            directory
                .join(APP_IDENTIFIER)
                .join(OWNERSHIP_DIRECTORY_NAME)
        })
        .ok_or(ProjectOwnershipError::LoadFailed)
}

#[cfg(test)]
pub(crate) fn default_ownership_directory() -> Result<PathBuf, ProjectOwnershipError> {
    Ok(std::env::temp_dir().join(format!(
        "project-graph-ownership-tests-{}",
        std::process::id()
    )))
}

fn ownership_artifact_paths(
    ownership_directory: &Path,
    canonical_path: &CanonicalProjectPath,
) -> OwnershipArtifactPaths {
    let key = ownership_key(canonical_path);
    OwnershipArtifactPaths {
        ownership_lock: ownership_directory.join(format!("{key}.lock")),
        connectable_owner_lock: ownership_directory.join(format!("{key}.connectable.lock")),
        connectable_owner_record: ownership_directory.join(format!("{key}.connectable")),
    }
}

fn ownership_key(canonical_path: &CanonicalProjectPath) -> String {
    let mut hasher = Sha256::new();
    #[cfg(unix)]
    {
        use std::os::unix::ffi::OsStrExt;
        hasher.update(canonical_path.as_path().as_os_str().as_bytes());
    }
    #[cfg(windows)]
    for code_unit in canonical_path.to_protocol_string().encode_utf16() {
        hasher.update(code_unit.to_le_bytes());
    }
    #[cfg(not(any(unix, windows)))]
    hasher.update(canonical_path.to_protocol_string().as_bytes());

    const HEX_DIGITS: &[u8; 16] = b"0123456789abcdef";
    let digest = hasher.finalize();
    let mut key = String::with_capacity(digest.len() * 2);
    for byte in digest {
        key.push(HEX_DIGITS[(byte >> 4) as usize] as char);
        key.push(HEX_DIGITS[(byte & 0x0f) as usize] as char);
    }
    key
}

fn record_owner(lock_file: &mut File, owner_record: &[u8]) -> Result<(), ProjectOwnershipError> {
    lock_file
        .seek(SeekFrom::Start(0))
        .map_err(|_| ProjectOwnershipError::LoadFailed)?;
    lock_file
        .write_all(owner_record)
        .map_err(|_| ProjectOwnershipError::LoadFailed)?;
    lock_file
        .set_len(owner_record.len() as u64)
        .map_err(|_| ProjectOwnershipError::LoadFailed)?;
    lock_file
        .flush()
        .map_err(|_| ProjectOwnershipError::LoadFailed)
}

fn read_current_owner(canonical_path: &CanonicalProjectPath) -> ProjectOwner {
    let Ok(owner_lock) = open_connectable_owner_lock(canonical_path) else {
        return ProjectOwner::UnconnectableHolder;
    };
    match owner_lock.try_lock() {
        Ok(()) => {
            let _ = owner_lock.unlock();
            ProjectOwner::UnconnectableHolder
        }
        Err(TryLockError::WouldBlock) => read_connectable_owner(canonical_path),
        Err(TryLockError::Error(_)) => ProjectOwner::UnconnectableHolder,
    }
}

fn read_connectable_owner(canonical_path: &CanonicalProjectPath) -> ProjectOwner {
    let Ok(mut owner_record_file) = open_connectable_owner_record(canonical_path) else {
        return ProjectOwner::UnconnectableHolder;
    };
    let mut record = String::new();
    if owner_record_file.seek(SeekFrom::Start(0)).is_ok()
        && owner_record_file.read_to_string(&mut record).is_ok()
    {
        if let Ok(owner) = serde_json::from_str::<ProjectOwner>(&record) {
            if matches!(owner, ProjectOwner::Connectable { .. }) {
                return owner;
            }
        }
    }
    ProjectOwner::UnconnectableHolder
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::{BufRead, BufReader};
    use std::process::{Child, ChildStdout, Command, ExitStatus, Stdio};
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;
    use std::time::Instant;

    static NEXT_TEST_DIRECTORY: AtomicU64 = AtomicU64::new(0);
    const HOLDER_PROJECT_PATH: &str = "PROJECT_GRAPH_HOLDER_PROJECT_PATH";
    const HOLDER_EXIT_AFTER_MILLIS: &str = "PROJECT_GRAPH_HOLDER_EXIT_AFTER_MILLIS";
    const HOLDER_READY: &str = "PROJECT_GRAPH_HOLDER_READY";

    struct TestDirectory(PathBuf);

    struct HolderProcess {
        child: Child,
        _stdout: BufReader<ChildStdout>,
    }

    impl HolderProcess {
        fn kill(&mut self) {
            self.child.kill().unwrap();
            self.child.wait().unwrap();
        }

        fn wait(&mut self) -> ExitStatus {
            self.child.wait().unwrap()
        }
    }

    impl Drop for HolderProcess {
        fn drop(&mut self) {
            if self.child.try_wait().unwrap().is_none() {
                self.child.kill().unwrap();
                self.child.wait().unwrap();
            }
        }
    }

    impl TestDirectory {
        fn new() -> Self {
            let sequence = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "project-graph-ownership-{}-{sequence}",
                std::process::id()
            ));
            fs::create_dir(&path).unwrap();
            Self(path)
        }

        fn path(&self) -> &Path {
            &self.0
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.0).unwrap();
        }
    }

    #[test]
    fn canonical_project_path_unifies_equivalent_and_symlink_paths() {
        let directory = TestDirectory::new();
        let projects = directory.path().join("projects");
        fs::create_dir(&projects).unwrap();
        let project = projects.join("graph.prg");
        fs::write(&project, []).unwrap();
        let symlink = directory.path().join("graph-link.prg");
        create_file_symlink(&project, &symlink);

        let absolute = canonicalize_project_path(&project).unwrap();
        let equivalent =
            canonicalize_project_path(&projects.join("../projects/graph.prg")).unwrap();
        let linked = canonicalize_project_path(&symlink).unwrap();

        expect_paths_equal(&absolute, &equivalent);
        expect_paths_equal(&absolute, &linked);
    }

    #[test]
    fn canonical_project_path_returns_stable_errors_for_invalid_targets() {
        let directory = TestDirectory::new();
        let missing = directory.path().join("missing.prg");
        let wrong_extension = directory.path().join("notes.txt");
        fs::write(&wrong_extension, []).unwrap();
        let project_directory = directory.path().join("directory.prg");
        fs::create_dir(&project_directory).unwrap();

        assert_eq!(
            canonicalize_project_path(&missing).unwrap_err().code(),
            "PROJECT_NOT_FOUND"
        );
        assert_eq!(
            canonicalize_project_path(&wrong_extension)
                .unwrap_err()
                .code(),
            "PROJECT_LOAD_FAILED"
        );
        assert_eq!(
            canonicalize_project_path(&project_directory)
                .unwrap_err()
                .code(),
            "PROJECT_LOAD_FAILED"
        );
    }

    #[test]
    fn canonical_project_path_accepts_case_insensitive_project_extensions() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.PRG");
        fs::write(&project, []).unwrap();

        assert_eq!(
            canonicalize_project_path(&project).unwrap().as_path(),
            fs::canonicalize(&project).unwrap()
        );
    }

    #[test]
    fn ownership_artifacts_use_the_canonical_project_path_hash_as_their_key() {
        let canonical_path = CanonicalProjectPath(PathBuf::from("/projects/graph.prg"));
        let paths =
            ownership_artifact_paths(Path::new("/app-data/project-ownership"), &canonical_path);

        assert_eq!(
            paths.ownership_lock,
            Path::new("/app-data/project-ownership/624b76f040538e5c4bab3f62f4111c955343dec3ede76c976f50ca8ac300a62e.lock")
        );
        assert_eq!(
            paths.connectable_owner_lock,
            Path::new("/app-data/project-ownership/624b76f040538e5c4bab3f62f4111c955343dec3ede76c976f50ca8ac300a62e.connectable.lock")
        );
        assert_eq!(
            paths.connectable_owner_record,
            Path::new("/app-data/project-ownership/624b76f040538e5c4bab3f62f4111c955343dec3ede76c976f50ca8ac300a62e.connectable")
        );
    }

    #[test]
    fn ownership_hard_switch_ignores_legacy_project_sidecars() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let mut legacy_lock_name = project.as_os_str().to_owned();
        legacy_lock_name.push(".project-graph.lock");
        let legacy_lock_path = PathBuf::from(legacy_lock_name);
        let legacy_lock = OpenOptions::new()
            .create(true)
            .read(true)
            .write(true)
            .open(&legacy_lock_path)
            .unwrap();
        legacy_lock.try_lock().unwrap();

        let ownership = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            Duration::ZERO,
        )
        .unwrap();
        let paths = ownership_artifact_paths(
            &default_ownership_directory().unwrap(),
            ownership.canonical_path(),
        );

        assert!(paths.ownership_lock.is_file());
        assert_eq!(fs::metadata(&legacy_lock_path).unwrap().len(), 0);
        assert!(
            !PathBuf::from(format!("{}.project-graph.connectable", project.display())).exists()
        );
    }

    #[cfg(windows)]
    #[test]
    fn ownership_key_normalizes_windows_verbatim_paths_and_hashes_utf16() {
        let canonical_path = CanonicalProjectPath(PathBuf::from(r"\\?\C:\Projects\Graph.prg"));

        assert_eq!(
            ownership_key(&canonical_path),
            "3ba5afbf87609293ab5fdd2921a3bbc7663d526d3ec657bd394ddc097efc7d68"
        );
    }

    #[test]
    fn exclusive_ownership_reports_the_current_owner() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let owner = ProjectOwner::Connectable {
            endpoint: "ipc://runtime-host".to_owned(),
        };
        let ownership = acquire_project_ownership_with_retry_delay(
            &project,
            owner.clone(),
            std::time::Duration::from_millis(1),
        )
        .unwrap();

        let error = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            std::time::Duration::from_millis(1),
        )
        .unwrap_err();

        assert_eq!(error.code(), "PROJECT_BUSY");
        assert_eq!(error.owner(), Some(&owner));
        drop(ownership);
        acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            std::time::Duration::from_millis(1),
        )
        .unwrap();
    }

    #[test]
    fn owner_turnover_never_returns_the_previous_connectable_endpoint() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let previous_owner = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::Connectable {
                endpoint: "ipc://previous-runtime-host".to_owned(),
            },
            Duration::from_millis(1),
        )
        .unwrap();
        let canonical_path = canonicalize_project_path(&project).unwrap();
        drop(previous_owner);
        let current_owner_lock = open_lock_file(&canonical_path).unwrap();
        current_owner_lock.try_lock().unwrap();

        let error = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            Duration::from_millis(1),
        )
        .unwrap_err();

        assert_eq!(error.owner(), Some(&ProjectOwner::UnconnectableHolder));
    }

    #[test]
    fn connectable_owner_waits_for_in_flight_owner_inspection() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let canonical_path = canonicalize_project_path(&project).unwrap();
        let inspector_lock = open_connectable_owner_lock(&canonical_path).unwrap();
        inspector_lock.try_lock().unwrap();
        let inspector = thread::spawn(move || {
            thread::sleep(Duration::from_millis(10));
            drop(inspector_lock);
        });

        let ownership = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::Connectable {
                endpoint: "ipc://runtime-host".to_owned(),
            },
            Duration::from_millis(20),
        );

        inspector.join().unwrap();
        assert!(ownership.is_ok());
    }

    #[test]
    fn ownership_and_owner_record_share_one_retry_budget() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let canonical_path = canonicalize_project_path(&project).unwrap();
        let ownership_lock = open_lock_file(&canonical_path).unwrap();
        ownership_lock.try_lock().unwrap();
        let owner_record_lock = open_connectable_owner_lock(&canonical_path).unwrap();
        owner_record_lock.try_lock().unwrap();
        let ownership_holder = thread::spawn(move || {
            thread::sleep(Duration::from_millis(10));
            drop(ownership_lock);
        });
        let owner_record_inspector = thread::spawn(move || {
            thread::sleep(Duration::from_millis(100));
            drop(owner_record_lock);
        });

        let started = Instant::now();
        let error = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::Connectable {
                endpoint: "ipc://runtime-host".to_owned(),
            },
            Duration::from_millis(20),
        )
        .unwrap_err();

        assert_eq!(error.code(), "PROJECT_BUSY");
        assert!(started.elapsed() < Duration::from_millis(80));
        ownership_holder.join().unwrap();
        owner_record_inspector.join().unwrap();
    }

    #[test]
    fn same_project_through_symlink_is_busy_after_one_five_second_retry() {
        let directory = TestDirectory::new();
        let projects = directory.path().join("projects");
        fs::create_dir(&projects).unwrap();
        let project = projects.join("graph.prg");
        fs::write(&project, []).unwrap();
        let symlink = directory.path().join("graph-link.prg");
        create_file_symlink(&project, &symlink);
        let mut holder = spawn_holder(&symlink, None);

        let started = Instant::now();
        let error = acquire_project_ownership(
            &projects.join("../projects/graph.prg"),
            ProjectOwner::UnconnectableHolder,
        )
        .unwrap_err();

        assert_eq!(error.code(), "PROJECT_BUSY");
        assert_eq!(error.owner(), Some(&ProjectOwner::UnconnectableHolder));
        assert!(started.elapsed() >= Duration::from_secs(5));
        assert!(started.elapsed() < Duration::from_secs(9));
        holder.kill();
    }

    #[test]
    fn ownership_retries_once_after_the_holder_process_exits() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let mut holder = spawn_holder(&project, Some(100));

        let started = Instant::now();
        let ownership =
            acquire_project_ownership(&project, ProjectOwner::UnconnectableHolder).unwrap();

        assert!(started.elapsed() >= Duration::from_secs(5));
        assert_eq!(
            ownership.canonical_path().as_path(),
            fs::canonicalize(&project).unwrap()
        );
        assert!(holder.wait().success());
    }

    #[test]
    fn different_projects_do_not_compete_and_a_killed_holder_releases_ownership() {
        let directory = TestDirectory::new();
        let first_project = directory.path().join("first.prg");
        let second_project = directory.path().join("second.prg");
        fs::write(&first_project, []).unwrap();
        fs::write(&second_project, []).unwrap();
        let mut holder = spawn_holder(&first_project, None);

        let second_ownership =
            acquire_project_ownership(&second_project, ProjectOwner::UnconnectableHolder).unwrap();
        assert_eq!(
            second_ownership.canonical_path().as_path(),
            fs::canonicalize(&second_project).unwrap()
        );
        holder.kill();

        let first_ownership =
            acquire_project_ownership(&first_project, ProjectOwner::UnconnectableHolder).unwrap();
        assert_eq!(
            first_ownership.canonical_path().as_path(),
            fs::canonicalize(&first_project).unwrap()
        );
    }

    #[test]
    fn ownership_holder_process() {
        let Some(project_path) = std::env::var_os(HOLDER_PROJECT_PATH) else {
            return;
        };
        let _ownership =
            acquire_project_ownership(Path::new(&project_path), ProjectOwner::UnconnectableHolder)
                .unwrap();
        println!("{HOLDER_READY}");
        std::io::stdout().flush().unwrap();
        if let Ok(milliseconds) = std::env::var(HOLDER_EXIT_AFTER_MILLIS) {
            thread::sleep(Duration::from_millis(milliseconds.parse().unwrap()));
        } else {
            loop {
                thread::park();
            }
        }
    }

    #[test]
    fn desktop_manager_reuses_the_live_owner_for_canonical_path_and_releases_on_close() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let symlink = directory.path().join("graph-link.prg");
        create_file_symlink(&project, &symlink);
        let manager = DesktopProjectOwnershipManager::default();

        let DesktopOwnershipAcquisition::Acquired {
            ownership_id,
            canonical_path,
        } = manager.acquire(&project).unwrap()
        else {
            panic!("first open must acquire ownership");
        };
        let duplicate = manager.acquire(&symlink).unwrap();

        assert_eq!(
            duplicate,
            DesktopOwnershipAcquisition::AlreadyOwned {
                ownership_id: ownership_id.clone(),
                canonical_path: canonical_path.clone(),
            }
        );
        manager.release(&ownership_id).unwrap();
        acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            Duration::from_millis(1),
        )
        .unwrap();
    }

    #[test]
    fn desktop_manager_reserves_a_missing_save_target_before_it_is_written() {
        let directory = TestDirectory::new();
        let project = directory.path().join("saved-draft.prg");
        let manager = DesktopProjectOwnershipManager::default();

        let acquisition = manager.acquire_for_save(&project).unwrap();
        fs::write(&project, []).unwrap();
        let error = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            Duration::from_millis(1),
        )
        .unwrap_err();

        assert_eq!(error.code(), "PROJECT_BUSY");
        assert_eq!(error.owner(), Some(&ProjectOwner::UnconnectableHolder));
        let DesktopOwnershipAcquisition::Acquired {
            ownership_id,
            canonical_path,
        } = acquisition
        else {
            panic!("missing save target must be reserved");
        };
        assert_eq!(
            canonical_path,
            canonicalize_project_path(&project)
                .unwrap()
                .to_protocol_string()
        );
        manager.release(&ownership_id).unwrap();
    }

    #[test]
    fn desktop_manager_promotes_a_save_reservation_after_the_runtime_host_is_ready() {
        let directory = TestDirectory::new();
        let project = directory.path().join("saved-draft.prg");
        let manager = DesktopProjectOwnershipManager::default();
        let endpoint = "tcp://127.0.0.1:41234";
        let DesktopOwnershipAcquisition::Acquired { ownership_id, .. } =
            manager.acquire_for_save(&project).unwrap()
        else {
            panic!("missing save target must be reserved");
        };
        fs::write(&project, []).unwrap();

        manager.make_connectable(&ownership_id, endpoint).unwrap();
        let error = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            Duration::from_millis(1),
        )
        .unwrap_err();

        assert!(matches!(
            error,
            ProjectOwnershipError::Busy {
                owner: ProjectOwner::Connectable { endpoint: owner_endpoint }
            } if owner_endpoint == endpoint
        ));
        manager.release(&ownership_id).unwrap();
    }

    #[test]
    fn desktop_manager_advertises_the_live_runtime_host_to_cli_contenders() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let manager = DesktopProjectOwnershipManager::default();
        let endpoint = "tcp://127.0.0.1:41234";

        let acquisition = manager.acquire_connectable(&project, endpoint).unwrap();
        let error = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            Duration::from_millis(1),
        )
        .unwrap_err();

        assert!(matches!(
            error,
            ProjectOwnershipError::Busy {
                owner: ProjectOwner::Connectable { endpoint: owner_endpoint }
            } if owner_endpoint == endpoint
        ));
        let DesktopOwnershipAcquisition::Acquired { ownership_id, .. } = acquisition else {
            panic!("first desktop open must acquire ownership");
        };
        manager.release(&ownership_id).unwrap();
    }

    #[test]
    fn contended_acquisition_does_not_block_unrelated_desktop_release() {
        let directory = TestDirectory::new();
        let first_project = directory.path().join("first.prg");
        let contended_project = directory.path().join("contended.prg");
        fs::write(&first_project, []).unwrap();
        fs::write(&contended_project, []).unwrap();
        let manager = Arc::new(DesktopProjectOwnershipManager::default());
        let DesktopOwnershipAcquisition::Acquired { ownership_id, .. } =
            manager.acquire(&first_project).unwrap()
        else {
            panic!("first Project must be owned");
        };
        let _contended_ownership = acquire_project_ownership_with_retry_delay(
            &contended_project,
            ProjectOwner::UnconnectableHolder,
            Duration::from_millis(1),
        )
        .unwrap();
        let acquiring_manager = Arc::clone(&manager);
        let acquisition = thread::spawn(move || {
            acquiring_manager
                .acquire_with_retry_delay(&contended_project, Duration::from_millis(100))
        });
        thread::sleep(Duration::from_millis(10));

        let started = Instant::now();
        manager.release(&ownership_id).unwrap();

        assert!(started.elapsed() < Duration::from_millis(50));
        assert_eq!(
            acquisition.join().unwrap().unwrap_err().code(),
            "PROJECT_BUSY"
        );
    }

    #[test]
    fn concurrent_same_project_acquisition_reuses_the_first_desktop_owner() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let manager = Arc::new(DesktopProjectOwnershipManager::default());
        let external_owner = acquire_project_ownership_with_retry_delay(
            &project,
            ProjectOwner::UnconnectableHolder,
            Duration::from_millis(1),
        )
        .unwrap();
        let first_manager = Arc::clone(&manager);
        let first_project = project.clone();
        let first = thread::spawn(move || {
            first_manager.acquire_with_retry_delay(&first_project, Duration::from_millis(50))
        });
        thread::sleep(Duration::from_millis(10));
        let second_manager = Arc::clone(&manager);
        let second_project = project.clone();
        let second = thread::spawn(move || {
            second_manager.acquire_with_retry_delay(&second_project, Duration::from_millis(50))
        });
        thread::sleep(Duration::from_millis(10));
        drop(external_owner);

        let DesktopOwnershipAcquisition::Acquired { ownership_id, .. } =
            first.join().unwrap().unwrap()
        else {
            panic!("first open must acquire ownership");
        };
        assert!(matches!(
            second.join().unwrap().unwrap(),
            DesktopOwnershipAcquisition::AlreadyOwned {
                ownership_id: duplicate_id,
                ..
            } if duplicate_id == ownership_id
        ));
    }

    #[test]
    fn desktop_command_error_keeps_the_stable_code_and_current_owner() {
        let error = DesktopProjectOwnershipError::from(ProjectOwnershipError::Busy {
            owner: ProjectOwner::Connectable {
                endpoint: "ipc://runtime-host".to_owned(),
            },
        });

        assert_eq!(
            serde_json::to_value(error).unwrap(),
            serde_json::json!({
                "code": "PROJECT_BUSY",
                "owner": {
                    "kind": "connectable",
                    "endpoint": "ipc://runtime-host"
                }
            })
        );
    }

    #[test]
    fn desktop_acquisition_serializes_the_frontend_lifecycle_contract() {
        let acquisition = DesktopOwnershipAcquisition::Acquired {
            ownership_id: "desktop-123-1".to_owned(),
            canonical_path: "/projects/graph.prg".to_owned(),
        };

        assert_eq!(
            serde_json::to_value(acquisition).unwrap(),
            serde_json::json!({
                "status": "acquired",
                "ownershipId": "desktop-123-1",
                "canonicalPath": "/projects/graph.prg"
            })
        );
    }

    #[test]
    fn desktop_manager_acquires_after_the_owner_process_exits() {
        let directory = TestDirectory::new();
        let project = directory.path().join("graph.prg");
        fs::write(&project, []).unwrap();
        let mut holder = spawn_holder(&project, Some(100));
        let manager = DesktopProjectOwnershipManager::default();

        let acquisition = manager.acquire(&project).unwrap();

        assert!(matches!(
            acquisition,
            DesktopOwnershipAcquisition::Acquired { .. }
        ));
        assert!(holder.wait().success());
    }

    fn spawn_holder(project_path: &Path, exit_after_millis: Option<u64>) -> HolderProcess {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .arg("--exact")
            .arg("project_ownership::tests::ownership_holder_process")
            .arg("--nocapture")
            .env(HOLDER_PROJECT_PATH, project_path)
            .env(
                OWNERSHIP_DIRECTORY_ENVIRONMENT_VARIABLE,
                default_ownership_directory().unwrap(),
            )
            .stdout(Stdio::piped());
        if let Some(milliseconds) = exit_after_millis {
            command.env(HOLDER_EXIT_AFTER_MILLIS, milliseconds.to_string());
        }
        let mut child = command.spawn().unwrap();
        let mut stdout = BufReader::new(child.stdout.take().unwrap());
        loop {
            let mut line = String::new();
            assert_ne!(stdout.read_line(&mut line).unwrap(), 0);
            if line.contains(HOLDER_READY) {
                break;
            }
        }
        HolderProcess {
            child,
            _stdout: stdout,
        }
    }

    fn expect_paths_equal(left: &CanonicalProjectPath, right: &CanonicalProjectPath) {
        assert_eq!(left.as_path(), right.as_path());
    }

    fn create_file_symlink(source: &Path, target: &Path) {
        #[cfg(unix)]
        std::os::unix::fs::symlink(source, target).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(source, target).unwrap();
    }
}
