use project_graph_lib::ownership_helper::{acquire_project_ownership, ProjectOwner};
use serde_json::Value;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
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
fn helper_loads_and_saves_through_the_shared_reference_store() {
    let directory = TestDirectory::new();
    let store_path = directory.path().join("ai-project-references.json");
    let project_uri = "file:///graph.prg";
    let snapshot = serde_json::json!({
        "entries": [{ "ref": "n1", "uuid": "node-1" }],
        "nextNodeRef": 2,
        "nextEdgeRef": 1
    });

    let saved = run_reference_store_helper(
        "save-project-references",
        project_uri,
        &store_path,
        Some(&snapshot),
    );
    assert_eq!(saved, (true, serde_json::json!({ "status": "saved" })));

    let loaded =
        run_reference_store_helper("load-project-references", project_uri, &store_path, None);
    assert_eq!(
        loaded,
        (
            true,
            serde_json::json!({ "status": "loaded", "snapshot": snapshot })
        )
    );
}

#[test]
fn helper_fails_closed_for_a_corrupt_reference_store() {
    let directory = TestDirectory::new();
    let store_path = directory.path().join("ai-project-references.json");
    fs::write(&store_path, "not json").unwrap();

    assert_eq!(
        run_reference_store_helper(
            "load-project-references",
            "file:///graph.prg",
            &store_path,
            None,
        ),
        (
            false,
            serde_json::json!({
                "status": "error",
                "code": "REFERENCE_STORE_LOAD_FAILED"
            })
        )
    );
    assert_eq!(fs::read_to_string(store_path).unwrap(), "not json");
}

fn run_reference_store_helper(
    command: &str,
    project_uri: &str,
    store_path: &Path,
    input: Option<&Value>,
) -> (bool, Value) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_project-graph-ownership-helper"))
        .arg(command)
        .arg(project_uri)
        .env("PROJECT_GRAPH_REFERENCE_STORE_PATH", store_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .unwrap();
    if let Some(input) = input {
        serde_json::to_writer(child.stdin.as_mut().unwrap(), input).unwrap();
    }
    drop(child.stdin.take());
    let output = child.wait_with_output().unwrap();
    (
        output.status.success(),
        serde_json::from_slice(&output.stdout).unwrap(),
    )
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
