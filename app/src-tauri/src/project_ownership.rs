use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions, TryLockError};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Duration;

const OWNERSHIP_RETRY_DELAY: Duration = Duration::from_secs(5);

enum ExclusiveLockAttempt {
    Acquired { used_retry: bool },
    Contended,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct CanonicalProjectPath(PathBuf);

impl CanonicalProjectPath {
    pub(crate) fn as_path(&self) -> &Path {
        &self.0
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub(crate) enum ProjectOwner {
    Connectable { endpoint: String },
    UnconnectableHolder,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum ProjectOwnershipError {
    NotFound,
    LoadFailed,
    Busy { owner: ProjectOwner },
}

impl ProjectOwnershipError {
    pub(crate) fn code(&self) -> &'static str {
        match self {
            Self::NotFound => "PROJECT_NOT_FOUND",
            Self::LoadFailed => "PROJECT_LOAD_FAILED",
            Self::Busy { .. } => "PROJECT_BUSY",
        }
    }

    pub(crate) fn owner(&self) -> Option<&ProjectOwner> {
        match self {
            Self::Busy { owner } => Some(owner),
            Self::NotFound | Self::LoadFailed => None,
        }
    }
}

#[derive(Debug)]
pub(crate) struct ProjectOwnership {
    canonical_path: CanonicalProjectPath,
    ownership_lock: File,
    connectable_owner_lock: Option<File>,
}

impl ProjectOwnership {
    pub(crate) fn canonical_path(&self) -> &CanonicalProjectPath {
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

pub(crate) fn canonicalize_project_path(
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
            .is_some_and(|extension| extension == "prg");
    if !is_project {
        return Err(ProjectOwnershipError::LoadFailed);
    }
    Ok(CanonicalProjectPath(canonical_path))
}

pub(crate) fn acquire_project_ownership(
    project_path: &Path,
    owner: ProjectOwner,
) -> Result<ProjectOwnership, ProjectOwnershipError> {
    acquire_project_ownership_with_retry_delay(project_path, owner, OWNERSHIP_RETRY_DELAY)
}

fn acquire_project_ownership_with_retry_delay(
    project_path: &Path,
    owner: ProjectOwner,
    retry_delay: Duration,
) -> Result<ProjectOwnership, ProjectOwnershipError> {
    let canonical_path = canonicalize_project_path(project_path)?;
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
    open_sidecar_file(canonical_path, ".project-graph.lock")
}

fn acquire_connectable_owner_lock(
    canonical_path: &CanonicalProjectPath,
    owner: &ProjectOwner,
    retry_delay: Duration,
    retry_available: bool,
) -> Result<File, ProjectOwnershipError> {
    let mut owner_lock = open_connectable_owner_lock(canonical_path)?;
    owner_lock
        .set_len(0)
        .map_err(|_| ProjectOwnershipError::LoadFailed)?;
    match try_exclusive_lock(&owner_lock, retry_delay, retry_available)? {
        ExclusiveLockAttempt::Acquired { .. } => {}
        ExclusiveLockAttempt::Contended => {
            return Err(ProjectOwnershipError::Busy {
                owner: ProjectOwner::UnconnectableHolder,
            });
        }
    }
    let owner_record = serde_json::to_vec(owner).map_err(|_| ProjectOwnershipError::LoadFailed)?;
    record_owner(&mut owner_lock, &owner_record)?;
    Ok(owner_lock)
}

fn open_connectable_owner_lock(
    canonical_path: &CanonicalProjectPath,
) -> Result<File, ProjectOwnershipError> {
    open_sidecar_file(canonical_path, ".project-graph.connectable")
}

fn open_sidecar_file(
    canonical_path: &CanonicalProjectPath,
    suffix: &str,
) -> Result<File, ProjectOwnershipError> {
    OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .open(sidecar_path(canonical_path, suffix))
        .map_err(|_| ProjectOwnershipError::LoadFailed)
}

fn sidecar_path(canonical_path: &CanonicalProjectPath, suffix: &str) -> PathBuf {
    let mut lock_file_name = canonical_path.as_path().as_os_str().to_owned();
    lock_file_name.push(suffix);
    PathBuf::from(lock_file_name)
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
    let Ok(mut owner_lock) = open_connectable_owner_lock(canonical_path) else {
        return ProjectOwner::UnconnectableHolder;
    };
    match owner_lock.try_lock() {
        Ok(()) => {
            let _ = owner_lock.unlock();
            ProjectOwner::UnconnectableHolder
        }
        Err(TryLockError::WouldBlock) => read_connectable_owner(&mut owner_lock),
        Err(TryLockError::Error(_)) => ProjectOwner::UnconnectableHolder,
    }
}

fn read_connectable_owner(owner_lock: &mut File) -> ProjectOwner {
    let mut record = String::new();
    if owner_lock.seek(SeekFrom::Start(0)).is_ok() && owner_lock.read_to_string(&mut record).is_ok()
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

    fn spawn_holder(project_path: &Path, exit_after_millis: Option<u64>) -> HolderProcess {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .arg("--exact")
            .arg("project_ownership::tests::ownership_holder_process")
            .arg("--nocapture")
            .env(HOLDER_PROJECT_PATH, project_path)
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
