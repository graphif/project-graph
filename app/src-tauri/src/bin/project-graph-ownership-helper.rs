use project_graph_lib::ownership_helper::{
    acquire_project_ownership, try_acquire_project_ownership, ProjectOwner, ProjectOwnershipError,
};
use project_graph_lib::project_reference_store::ProjectReferenceStore;
use serde::Serialize;
use serde_json::Value;
use std::ffi::OsStr;
use std::io::{self, Read, Write};
use std::path::Path;
use std::process::ExitCode;

#[derive(Serialize)]
#[serde(
    tag = "status",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
enum HelperResponse<'a> {
    Acquired {
        #[serde(skip_serializing_if = "Option::is_none")]
        canonical_path: Option<&'a Path>,
    },
    Busy {
        owner: &'a ProjectOwner,
    },
    Loaded {
        snapshot: Option<&'a Value>,
    },
    Saved,
    Error {
        code: &'static str,
    },
}

fn write_response(response: &HelperResponse<'_>) -> io::Result<()> {
    let mut stdout = io::stdout().lock();
    serde_json::to_writer(&mut stdout, response)?;
    stdout.write_all(b"\n")?;
    stdout.flush()
}

fn hold_project(project_path: &Path, retry: bool) -> ExitCode {
    let acquisition = if retry {
        acquire_project_ownership(project_path, ProjectOwner::UnconnectableHolder)
    } else {
        try_acquire_project_ownership(project_path, ProjectOwner::UnconnectableHolder)
    };
    match acquisition {
        Ok(ownership) => {
            if write_response(&HelperResponse::Acquired {
                canonical_path: Some(ownership.canonical_path().as_path()),
            })
            .is_err()
            {
                return ExitCode::FAILURE;
            }
            let _ = io::stdin().lock().read_to_end(&mut Vec::new());
            drop(ownership);
            ExitCode::SUCCESS
        }
        Err(ProjectOwnershipError::Busy { owner }) => {
            let _ = write_response(&HelperResponse::Busy { owner: &owner });
            ExitCode::from(75)
        }
        Err(error) => {
            let _ = write_response(&HelperResponse::Error { code: error.code() });
            ExitCode::FAILURE
        }
    }
}

fn load_project_references(project_uri: &OsStr, legacy_project_uri: Option<&OsStr>) -> ExitCode {
    let Some(project_uri) = project_uri.to_str() else {
        return usage_error();
    };
    let legacy_project_uri = match legacy_project_uri {
        Some(legacy_project_uri) => match legacy_project_uri.to_str() {
            Some(legacy_project_uri) => Some(legacy_project_uri),
            None => return usage_error(),
        },
        None => None,
    };
    let result = ProjectReferenceStore::open_default()
        .and_then(|store| store.load(project_uri, legacy_project_uri));
    match result {
        Ok(snapshot) => {
            if write_response(&HelperResponse::Loaded {
                snapshot: snapshot.as_ref(),
            })
            .is_err()
            {
                return ExitCode::FAILURE;
            }
            ExitCode::SUCCESS
        }
        Err(_) => operation_error("REFERENCE_STORE_LOAD_FAILED"),
    }
}

fn save_project_references(project_uri: &OsStr) -> ExitCode {
    let Some(project_uri) = project_uri.to_str() else {
        return usage_error();
    };
    let references = match serde_json::from_reader(io::stdin().lock()) {
        Ok(references) => references,
        Err(_) => return operation_error("REFERENCE_STORE_SAVE_FAILED"),
    };
    let result =
        ProjectReferenceStore::open_default().and_then(|store| store.save(project_uri, references));
    match result {
        Ok(()) => {
            if write_response(&HelperResponse::Saved).is_err() {
                return ExitCode::FAILURE;
            }
            ExitCode::SUCCESS
        }
        Err(_) => operation_error("REFERENCE_STORE_SAVE_FAILED"),
    }
}

fn operation_error(code: &'static str) -> ExitCode {
    let _ = write_response(&HelperResponse::Error { code });
    ExitCode::FAILURE
}

fn usage_error() -> ExitCode {
    operation_error("HELPER_USAGE_ERROR");
    ExitCode::from(2)
}

fn main() -> ExitCode {
    let arguments: Vec<_> = std::env::args_os().skip(1).collect();
    match arguments.as_slice() {
        [command, path] if command == "hold-project" => hold_project(Path::new(path), true),
        [command, path] if command == "try-hold-project" => hold_project(Path::new(path), false),
        [command, project_uri] if command == "load-project-references" => {
            load_project_references(project_uri, None)
        }
        [command, project_uri, legacy_project_uri] if command == "load-project-references" => {
            load_project_references(project_uri, Some(legacy_project_uri))
        }
        [command, project_uri] if command == "save-project-references" => {
            save_project_references(project_uri)
        }
        _ => usage_error(),
    }
}
