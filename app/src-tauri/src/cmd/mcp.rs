use rmcp::{
    model::CallToolRequestParams,
    service::RunningService,
    transport::{which_command, TokioChildProcess},
    RoleClient, ServiceExt,
};
use serde::Deserialize;
use serde_json::{Map, Value};
use std::{collections::HashMap, sync::Arc};
use tauri::State;
use tokio::sync::{Mutex, RwLock};

type RunningClient = RunningService<RoleClient, ()>;
type SharedClient = Arc<RwLock<RunningClient>>;

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct McpStdioConfig {
    pub server_name: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Default)]
pub struct McpStdioManager {
    clients: Mutex<HashMap<String, SharedClient>>,
}

fn validate_config(config: McpStdioConfig) -> Result<McpStdioConfig, String> {
    let server_name = config.server_name;
    if server_name.trim().is_empty() {
        return Err("MCP stdio server name must not be empty".to_string());
    }

    let command = config.command.trim().to_string();
    if command.is_empty() {
        return Err(format!(
            "MCP stdio server {server_name} command must not be empty"
        ));
    }

    let cwd = config
        .cwd
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    if config.env.keys().any(|key| key.is_empty()) {
        return Err(format!(
            "MCP stdio server {server_name} environment variable names must not be empty"
        ));
    }

    let contains_nul = command.contains('\0')
        || cwd.as_ref().is_some_and(|value| value.contains('\0'))
        || config.args.iter().any(|value| value.contains('\0'))
        || config
            .env
            .iter()
            .any(|(key, value)| key.contains('\0') || value.contains('\0'));
    if contains_nul {
        return Err(format!(
            "MCP stdio server {server_name} process configuration contains an invalid null character"
        ));
    }

    Ok(McpStdioConfig {
        server_name,
        command,
        args: config.args,
        cwd,
        env: config.env,
    })
}

fn create_process(config: &McpStdioConfig) -> Result<TokioChildProcess, String> {
    let mut command = which_command(&config.command).map_err(|error| {
        format!(
            "Unable to resolve MCP stdio command {:?} for server {}: {error}",
            config.command, config.server_name
        )
    })?;
    command.args(&config.args);
    if let Some(cwd) = &config.cwd {
        command.current_dir(cwd);
    }
    command.envs(&config.env);
    TokioChildProcess::new(command).map_err(|error| {
        format!(
            "Unable to start MCP stdio server {} with command {:?}: {error}",
            config.server_name, config.command
        )
    })
}

async fn close_client(server_name: &str, client: SharedClient) -> Result<(), String> {
    client
        .write()
        .await
        .close()
        .await
        .map(|_| ())
        .map_err(|error| format!("Unable to stop MCP stdio server {server_name}: {error}"))
}

impl McpStdioManager {
    async fn get_client(&self, server_name: &str) -> Result<SharedClient, String> {
        self.clients
            .lock()
            .await
            .get(server_name)
            .cloned()
            .ok_or_else(|| format!("MCP stdio server {server_name} is not running"))
    }

    async fn start(&self, config: McpStdioConfig) -> Result<Value, String> {
        let config = validate_config(config)?;
        let transport = create_process(&config)?;
        let client = ().serve(transport).await.map_err(|error| {
            format!(
                "Unable to initialize MCP stdio server {}: {error}",
                config.server_name
            )
        })?;
        let tools = client.list_all_tools().await.map_err(|error| {
            format!(
                "Unable to list tools from MCP stdio server {}: {error}",
                config.server_name
            )
        })?;
        let tools = serde_json::to_value(tools).map_err(|error| {
            format!(
                "Unable to serialize tools from MCP stdio server {}: {error}",
                config.server_name
            )
        })?;

        let client = Arc::new(RwLock::new(client));
        let previous = self
            .clients
            .lock()
            .await
            .insert(config.server_name.clone(), client.clone());
        if let Some(previous) = previous {
            if let Err(error) = close_client(&config.server_name, previous).await {
                let removed = {
                    let mut clients = self.clients.lock().await;
                    let is_current = clients
                        .get(&config.server_name)
                        .is_some_and(|current| Arc::ptr_eq(current, &client));
                    if is_current {
                        clients.remove(&config.server_name)
                    } else {
                        None
                    }
                };
                if let Some(removed) = removed {
                    close_client(&config.server_name, removed).await.map_err(|close_error| {
                        format!("{error}; the replacement process also could not be stopped: {close_error}")
                    })?;
                }
                return Err(error);
            }
        }
        Ok(tools)
    }

    async fn list_tools(&self, server_name: &str) -> Result<Value, String> {
        let client = self.get_client(server_name).await?;
        let tools = client
            .read()
            .await
            .list_all_tools()
            .await
            .map_err(|error| {
                format!("Unable to list tools from MCP stdio server {server_name}: {error}")
            })?;
        serde_json::to_value(tools).map_err(|error| {
            format!("Unable to serialize tools from MCP stdio server {server_name}: {error}")
        })
    }

    async fn call_tool(
        &self,
        server_name: &str,
        tool_name: String,
        arguments: Option<Map<String, Value>>,
    ) -> Result<Value, String> {
        let client = self.get_client(server_name).await?;
        let mut request = CallToolRequestParams::new(tool_name.clone());
        if let Some(arguments) = arguments {
            request = request.with_arguments(arguments);
        }
        let result = client
            .read()
            .await
            .call_tool(request)
            .await
            .map_err(|error| {
                format!("MCP stdio tool {tool_name} on server {server_name} failed: {error}")
            })?;
        serde_json::to_value(result).map_err(|error| {
            format!("Unable to serialize result from MCP stdio tool {tool_name} on server {server_name}: {error}")
        })
    }

    async fn stop(&self, server_name: &str) -> Result<(), String> {
        let client = self.clients.lock().await.remove(server_name);
        if let Some(client) = client {
            close_client(server_name, client).await?;
        }
        Ok(())
    }
}

#[tauri::command]
pub async fn mcp_stdio_start(
    manager: State<'_, McpStdioManager>,
    config: McpStdioConfig,
) -> Result<Value, String> {
    manager.start(config).await
}

#[tauri::command]
pub async fn mcp_stdio_list_tools(
    manager: State<'_, McpStdioManager>,
    server_name: String,
) -> Result<Value, String> {
    manager.list_tools(&server_name).await
}

#[tauri::command]
pub async fn mcp_stdio_call_tool(
    manager: State<'_, McpStdioManager>,
    server_name: String,
    tool_name: String,
    arguments: Option<Map<String, Value>>,
) -> Result<Value, String> {
    manager.call_tool(&server_name, tool_name, arguments).await
}

#[tauri::command]
pub async fn mcp_stdio_stop(
    manager: State<'_, McpStdioManager>,
    server_name: String,
) -> Result<(), String> {
    manager.stop(&server_name).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(command: &str) -> McpStdioConfig {
        McpStdioConfig {
            server_name: "files".to_string(),
            command: command.to_string(),
            args: vec!["--root".to_string(), "workspace".to_string()],
            cwd: Some(" ".to_string()),
            env: HashMap::from([("MODE".to_string(), "read-only".to_string())]),
        }
    }

    #[test]
    fn validates_and_normalizes_process_configuration() {
        let normalized = validate_config(config("  npx  ")).expect("configuration should be valid");
        assert_eq!(normalized.server_name, "files");
        assert_eq!(normalized.command, "npx");
        assert_eq!(normalized.cwd, None);
        assert_eq!(normalized.args, vec!["--root", "workspace"]);
    }

    #[test]
    fn rejects_empty_commands_and_environment_names() {
        assert!(validate_config(config(" ")).is_err());

        let mut invalid = config("npx");
        invalid.env.insert(String::new(), "value".to_string());
        assert!(validate_config(invalid).is_err());
    }

    #[tokio::test]
    async fn reports_missing_clients_and_stops_idempotently() {
        let manager = McpStdioManager::default();
        let error = manager
            .list_tools("missing")
            .await
            .expect_err("missing client should be visible");
        assert!(error.contains("is not running"));
        manager
            .stop("missing")
            .await
            .expect("stop should be idempotent");
    }
}
