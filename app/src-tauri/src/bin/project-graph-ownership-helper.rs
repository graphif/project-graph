use project_graph_lib::ownership_helper::acquire_reference_store_lock;
use project_graph_lib::ownership_helper::{
    acquire_project_ownership, try_acquire_project_ownership, ProjectOwner, ProjectOwnershipError,
};
use serde::Serialize;
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

fn hold_reference_store(store_path: &Path) -> ExitCode {
    match acquire_reference_store_lock(store_path) {
        Ok(lock) => {
            if write_response(&HelperResponse::Acquired {
                canonical_path: None,
            })
            .is_err()
            {
                return ExitCode::FAILURE;
            }
            let _ = io::stdin().lock().read_to_end(&mut Vec::new());
            drop(lock);
            ExitCode::SUCCESS
        }
        Err(_) => {
            let _ = write_response(&HelperResponse::Error {
                code: "REFERENCE_STORE_LOCK_FAILED",
            });
            ExitCode::FAILURE
        }
    }
}

fn main() -> ExitCode {
    let mut arguments = std::env::args_os().skip(1);
    let Some(command) = arguments.next() else {
        let _ = write_response(&HelperResponse::Error {
            code: "HELPER_USAGE_ERROR",
        });
        return ExitCode::from(2);
    };
    let Some(path) = arguments.next() else {
        let _ = write_response(&HelperResponse::Error {
            code: "HELPER_USAGE_ERROR",
        });
        return ExitCode::from(2);
    };
    if arguments.next().is_some() {
        let _ = write_response(&HelperResponse::Error {
            code: "HELPER_USAGE_ERROR",
        });
        return ExitCode::from(2);
    }
    if command == "hold-project" {
        hold_project(Path::new(&path), true)
    } else if command == "try-hold-project" {
        hold_project(Path::new(&path), false)
    } else if command == "hold-reference-store" {
        hold_reference_store(Path::new(&path))
    } else {
        let _ = write_response(&HelperResponse::Error {
            code: "HELPER_USAGE_ERROR",
        });
        ExitCode::from(2)
    }
}
