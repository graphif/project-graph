use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime, State};

pub(crate) const PROJECT_RUNTIME_INVOCATION_EVENT: &str = "project-runtime-invocation";
const RUNTIME_RESPONSE_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRuntimeRequest {
    project_path: String,
    tool_name: String,
    input: Value,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectRuntimeInvocation {
    pub(crate) request_id: String,
    pub(crate) project_path: String,
    pub(crate) tool_name: String,
    pub(crate) input: Value,
}

type InvocationEmitter = dyn Fn(ProjectRuntimeInvocation) -> Result<(), ()> + Send + Sync;

pub(crate) struct ProjectRuntimeBridgeManager {
    endpoint: String,
    pending: Arc<Mutex<HashMap<String, Sender<Value>>>>,
}

impl ProjectRuntimeBridgeManager {
    pub(crate) fn start<R: Runtime>(app: AppHandle<R>) -> std::io::Result<Arc<Self>> {
        Self::start_with_emitter(move |invocation| {
            app.emit(PROJECT_RUNTIME_INVOCATION_EVENT, invocation)
                .map_err(|_| ())
        })
    }

    fn start_with_emitter(
        emit: impl Fn(ProjectRuntimeInvocation) -> Result<(), ()> + Send + Sync + 'static,
    ) -> std::io::Result<Arc<Self>> {
        let listener = TcpListener::bind(("127.0.0.1", 0))?;
        let endpoint = format!("tcp://{}", listener.local_addr()?);
        let pending = Arc::new(Mutex::new(HashMap::new()));
        let manager = Arc::new(Self {
            endpoint,
            pending: Arc::clone(&pending),
        });
        let next_request_id = Arc::new(AtomicU64::new(1));
        let emit: Arc<InvocationEmitter> = Arc::new(emit);
        thread::spawn(move || {
            for stream in listener.incoming() {
                let Ok(stream) = stream else {
                    break;
                };
                let pending = Arc::clone(&pending);
                let next_request_id = Arc::clone(&next_request_id);
                let emit = Arc::clone(&emit);
                thread::spawn(move || handle_connection(stream, pending, next_request_id, emit));
            }
        });
        Ok(manager)
    }

    pub(crate) fn endpoint(&self) -> &str {
        &self.endpoint
    }

    pub(crate) fn respond(&self, request_id: &str, response: Value) -> bool {
        let sender = self
            .pending
            .lock()
            .ok()
            .and_then(|mut pending| pending.remove(request_id));
        sender.is_some_and(|sender| sender.send(response).is_ok())
    }
}

fn handle_connection(
    mut stream: TcpStream,
    pending: Arc<Mutex<HashMap<String, Sender<Value>>>>,
    next_request_id: Arc<AtomicU64>,
    emit: Arc<InvocationEmitter>,
) {
    let response = read_request(&mut stream).and_then(|request| {
        let request_id = format!(
            "runtime-{}-{}",
            std::process::id(),
            next_request_id.fetch_add(1, Ordering::Relaxed)
        );
        let (response_sender, response_receiver) = mpsc::channel();
        pending
            .lock()
            .map_err(|_| ())?
            .insert(request_id.clone(), response_sender);
        let invocation = ProjectRuntimeInvocation {
            request_id: request_id.clone(),
            project_path: request.project_path,
            tool_name: request.tool_name,
            input: request.input,
        };
        if emit(invocation).is_err() {
            if let Ok(mut pending) = pending.lock() {
                pending.remove(&request_id);
            }
            return Err(());
        }
        let response = response_receiver
            .recv_timeout(RUNTIME_RESPONSE_TIMEOUT)
            .map_err(|_| ());
        if let Ok(mut pending) = pending.lock() {
            pending.remove(&request_id);
        }
        response
    });
    let response = response.unwrap_or_else(|_| runtime_host_unavailable());
    if let Ok(serialized) = serde_json::to_string(&response) {
        let _ = writeln!(stream, "{serialized}");
    }
}

fn read_request(stream: &mut TcpStream) -> Result<ProjectRuntimeRequest, ()> {
    let mut request = String::new();
    BufReader::new(stream)
        .read_line(&mut request)
        .map_err(|_| ())?;
    serde_json::from_str(&request).map_err(|_| ())
}

fn runtime_host_unavailable() -> Value {
    json!({
        "ok": false,
        "error": {
            "code": "RUNTIME_HOST_UNAVAILABLE",
            "message": "Open Project Runtime Host is unavailable."
        }
    })
}

#[tauri::command]
pub(crate) fn respond_project_runtime_bridge(
    manager: State<'_, Arc<ProjectRuntimeBridgeManager>>,
    request_id: String,
    response: Value,
) -> bool {
    manager.respond(&request_id, response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project_ownership::{DesktopOwnershipAcquisition, DesktopProjectOwnershipManager};
    use serde_json::json;
    use std::fs;
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpStream;
    use std::path::PathBuf;
    use std::process::Command;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::mpsc;
    use std::thread;

    static NEXT_TEST_DIRECTORY: AtomicU64 = AtomicU64::new(1);

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let sequence = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "project-graph-runtime-host-{}-{sequence}",
                std::process::id()
            ));
            fs::create_dir(&path).unwrap();
            Self(path)
        }

        fn path(&self) -> &std::path::Path {
            &self.0
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.0).unwrap();
        }
    }

    #[test]
    fn loopback_bridge_forwards_one_runtime_invocation_and_response() {
        let (event_sender, event_receiver) = mpsc::channel();
        let bridge = ProjectRuntimeBridgeManager::start_with_emitter(move |invocation| {
            event_sender.send(invocation).map_err(|_| ())
        })
        .unwrap();
        let endpoint = bridge.endpoint().to_owned();
        let client = thread::spawn(move || {
            let address = endpoint.strip_prefix("tcp://").unwrap();
            let mut stream = TcpStream::connect(address).unwrap();
            writeln!(
                stream,
                "{}",
                json!({
                    "projectPath": "/projects/graph.prg",
                    "toolName": "get_all_nodes",
                    "input": {}
                })
            )
            .unwrap();
            let mut response = String::new();
            BufReader::new(stream).read_line(&mut response).unwrap();
            serde_json::from_str::<serde_json::Value>(&response).unwrap()
        });

        let invocation = event_receiver.recv().unwrap();
        assert_eq!(invocation.project_path, "/projects/graph.prg");
        assert_eq!(invocation.tool_name, "get_all_nodes");
        assert!(bridge.respond(
            &invocation.request_id,
            json!({ "ok": true, "value": { "objects": [{ "ref": "n1" }] } }),
        ));

        assert_eq!(
            client.join().unwrap(),
            json!({ "ok": true, "value": { "objects": [{ "ref": "n1" }] } })
        );
    }

    #[test]
    fn loopback_bridge_returns_a_structured_error_when_the_frontend_does_not_respond() {
        let bridge = ProjectRuntimeBridgeManager::start_with_emitter(|_| Ok(())).unwrap();
        let address = bridge.endpoint().strip_prefix("tcp://").unwrap();
        let mut stream = TcpStream::connect(address).unwrap();
        writeln!(
            stream,
            "{}",
            json!({
                "projectPath": "/projects/graph.prg",
                "toolName": "get_all_nodes",
                "input": {}
            })
        )
        .unwrap();
        let mut response = String::new();
        BufReader::new(stream).read_line(&mut response).unwrap();

        assert_eq!(
            serde_json::from_str::<Value>(&response).unwrap(),
            runtime_host_unavailable()
        );
    }

    #[test]
    fn real_cli_process_attaches_to_the_desktop_runtime_host() {
        let directory = TestDirectory::new();
        let project_path = directory.path().join("graph.prg");
        fs::write(&project_path, b"persisted fallback sentinel").unwrap();
        let before = fs::read(&project_path).unwrap();

        let (event_sender, event_receiver) = mpsc::channel();
        let bridge = ProjectRuntimeBridgeManager::start_with_emitter(move |invocation| {
            event_sender.send(invocation).map_err(|_| ())
        })
        .unwrap();
        let ownership = DesktopProjectOwnershipManager::default();
        let DesktopOwnershipAcquisition::Acquired { ownership_id, .. } = ownership
            .acquire_connectable(&project_path, bridge.endpoint())
            .unwrap()
        else {
            panic!("desktop Runtime Host must acquire the Project");
        };
        let repository_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
        let cli_project_path = project_path.clone();
        let cli = thread::spawn(move || {
            Command::new("pnpm")
                .current_dir(repository_root)
                .env("NO_COLOR", "1")
                .args(["cli", "--", "tool", "invoke", "get_all_nodes", "--project"])
                .arg(cli_project_path)
                .args(["--input", "{}"])
                .output()
                .unwrap()
        });

        let invocation = event_receiver.recv().unwrap();
        assert_eq!(
            invocation.project_path,
            fs::canonicalize(&project_path).unwrap().to_string_lossy()
        );
        assert!(bridge.respond(
            &invocation.request_id,
            json!({
                "ok": true,
                "value": {
                    "objects": [{
                        "ref": "n1",
                        "type": "TextNode",
                        "text": "Unsaved live node"
                    }]
                }
            }),
        ));
        let output = cli.join().unwrap();

        assert!(output.status.success());
        assert_eq!(output.stderr, b"");
        assert_eq!(
            String::from_utf8(output.stdout).unwrap(),
            "{\"objects\":[{\"ref\":\"n1\",\"text\":\"Unsaved live node\",\"type\":\"TextNode\"}]}\n"
        );
        assert_eq!(fs::read(&project_path).unwrap(), before);
        assert_eq!(
            ownership
                .acquire_connectable(&project_path, bridge.endpoint())
                .unwrap(),
            DesktopOwnershipAcquisition::AlreadyOwned {
                ownership_id: ownership_id.clone(),
                canonical_path: fs::canonicalize(&project_path)
                    .unwrap()
                    .to_string_lossy()
                    .into_owned(),
            }
        );
        ownership.release(&ownership_id).unwrap();
    }
}
