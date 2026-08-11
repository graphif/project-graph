use project_graph_lib::ownership_helper::{
    acquire_project_ownership, acquire_reference_store_lock, ProjectOwner,
};
use serde_json::Value;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::time::Duration;
use std::time::Instant;

static NEXT_TEST_DIRECTORY: AtomicU64 = AtomicU64::new(1);

struct TestDirectory(PathBuf);

impl TestDirectory {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "project-graph-ownership-helper-{}-{}",
            std::process::id(),
            NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed)
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

struct HelperProcess {
    child: Child,
    stdin: Option<ChildStdin>,
    stdout: BufReader<ChildStdout>,
}

impl HelperProcess {
    fn hold_project(project_path: &Path) -> Self {
        Self::hold("hold-project", project_path)
    }

    fn try_hold_project(project_path: &Path) -> Self {
        Self::hold("try-hold-project", project_path)
    }

    fn hold_reference_store(store_path: &Path) -> Self {
        Self::hold("hold-reference-store", store_path)
    }

    fn hold(command: &str, path: &Path) -> Self {
        let mut child = Command::new(env!("CARGO_BIN_EXE_project-graph-ownership-helper"))
            .arg(command)
            .arg(path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap();
        let stdin = child.stdin.take().unwrap();
        let stdout = BufReader::new(child.stdout.take().unwrap());
        Self {
            child,
            stdin: Some(stdin),
            stdout,
        }
    }

    fn read_response(&mut self) -> Value {
        let mut line = String::new();
        self.stdout.read_line(&mut line).unwrap();
        serde_json::from_str(&line).unwrap()
    }

    fn release(mut self) {
        drop(self.stdin.take());
        assert!(self.child.wait().unwrap().success());
    }

    fn wait(mut self) -> std::process::ExitStatus {
        drop(self.stdin.take());
        self.child.wait().unwrap()
    }

    fn kill(mut self) {
        self.child.kill().unwrap();
        self.child.wait().unwrap();
    }
}

#[test]
fn helper_and_desktop_serialize_the_reference_store_with_the_same_lock() {
    let directory = TestDirectory::new();
    let store_path = directory.path().join("ai-project-references.json");
    let mut helper = HelperProcess::hold_reference_store(&store_path);
    assert_eq!(
        helper.read_response(),
        serde_json::json!({ "status": "acquired" })
    );

    let (acquired_sender, acquired_receiver) = mpsc::channel();
    let contender_path = store_path.clone();
    let contender = std::thread::spawn(move || {
        let lock = acquire_reference_store_lock(&contender_path).unwrap();
        acquired_sender.send(()).unwrap();
        lock
    });
    assert!(acquired_receiver
        .recv_timeout(Duration::from_millis(100))
        .is_err());

    helper.release();
    acquired_receiver
        .recv_timeout(Duration::from_secs(2))
        .unwrap();
    drop(contender.join().unwrap());
}

impl Drop for HelperProcess {
    fn drop(&mut self) {
        if self.child.try_wait().unwrap().is_none() {
            self.child.kill().unwrap();
            self.child.wait().unwrap();
        }
    }
}

#[test]
fn helper_and_desktop_share_project_ownership_and_normal_release() {
    let directory = TestDirectory::new();
    let project_path = directory.path().join("graph.prg");
    fs::write(&project_path, []).unwrap();
    let mut helper = HelperProcess::hold_project(&project_path);

    assert_eq!(
        helper.read_response(),
        serde_json::json!({
            "status": "acquired",
            "canonicalPath": fs::canonicalize(&project_path).unwrap()
        })
    );
    let error =
        acquire_project_ownership(&project_path, ProjectOwner::UnconnectableHolder).unwrap_err();
    assert_eq!(error.code(), "PROJECT_BUSY");
    assert_eq!(error.owner(), Some(&ProjectOwner::UnconnectableHolder));

    helper.release();
    assert!(acquire_project_ownership(&project_path, ProjectOwner::UnconnectableHolder).is_ok());
}

#[test]
fn helper_reports_the_desktop_connectable_owner_after_one_retry() {
    let directory = TestDirectory::new();
    let project_path = directory.path().join("graph.prg");
    fs::write(&project_path, []).unwrap();
    let _desktop = acquire_project_ownership(
        &project_path,
        ProjectOwner::Connectable {
            endpoint: "tcp://127.0.0.1:43123".to_owned(),
        },
    )
    .unwrap();
    let started = Instant::now();
    let mut helper = HelperProcess::hold_project(&project_path);

    assert_eq!(
        helper.read_response(),
        serde_json::json!({
            "status": "busy",
            "owner": {
                "kind": "connectable",
                "endpoint": "tcp://127.0.0.1:43123"
            }
        })
    );
    assert!(started.elapsed() >= Duration::from_secs(5));
    assert_eq!(helper.wait().code(), Some(75));
}

#[test]
fn helper_probe_reports_a_connectable_owner_without_waiting_for_retry() {
    let directory = TestDirectory::new();
    let project_path = directory.path().join("graph.prg");
    fs::write(&project_path, []).unwrap();
    let _desktop = acquire_project_ownership(
        &project_path,
        ProjectOwner::Connectable {
            endpoint: "tcp://127.0.0.1:43123".to_owned(),
        },
    )
    .unwrap();
    let started = Instant::now();
    let mut helper = HelperProcess::try_hold_project(&project_path);

    assert_eq!(helper.read_response()["status"], "busy");
    assert!(started.elapsed() < Duration::from_secs(2));
    assert_eq!(helper.wait().code(), Some(75));
}

#[test]
fn helper_acquires_on_its_single_retry_after_desktop_release() {
    let directory = TestDirectory::new();
    let project_path = directory.path().join("graph.prg");
    fs::write(&project_path, []).unwrap();
    let desktop =
        acquire_project_ownership(&project_path, ProjectOwner::UnconnectableHolder).unwrap();
    let started = Instant::now();
    let mut helper = HelperProcess::hold_project(&project_path);
    let desktop_release = std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(500));
        drop(desktop);
    });

    assert_eq!(
        helper.read_response(),
        serde_json::json!({
            "status": "acquired",
            "canonicalPath": fs::canonicalize(&project_path).unwrap()
        })
    );
    assert!(started.elapsed() >= Duration::from_secs(5));
    desktop_release.join().unwrap();
    helper.release();
}

#[test]
fn helper_crash_releases_project_ownership() {
    let directory = TestDirectory::new();
    let project_path = directory.path().join("graph.prg");
    fs::write(&project_path, []).unwrap();
    let mut helper = HelperProcess::hold_project(&project_path);
    assert_eq!(helper.read_response()["status"], "acquired");

    helper.kill();

    assert!(acquire_project_ownership(&project_path, ProjectOwner::UnconnectableHolder).is_ok());
}
