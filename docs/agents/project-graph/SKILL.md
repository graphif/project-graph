---
name: project-graph
description: Use Project Graph through its CLI to inspect and edit a .prg graph from an external AI agent.
---

# Project Graph CLI

Use the installed Project Graph application executable as the only interface for changing a Project Graph file. The same executable provides CLI commands and the GUI; there is no separate CLI binary. The CLI connects to the GUI; it does not edit `.prg` files directly. The GUI can be started and the requested project can be opened automatically. In the examples, `project-graph` means the resolved application path; quote paths containing spaces (on PowerShell, use `& $path tool list`).

## Locate the CLI

On Windows, run `scripts/find-project-graph.ps1`. On macOS use `/Applications/Project Graph.app/Contents/project-graph`; on Linux use `/usr/bin/project-graph`. Set `PROJECT_GRAPH_CLI` to override any default. The locator prints only the executable path.

## Workflow

1. Run `project-graph tool list` when the available operations are unknown.
2. Run `project-graph tool describe <tool>` before using a tool whose input is not already known.
3. Use `tool invoke <tool> --project <absolute-path> --input '<JSON>'`.
4. Read the result before issuing another mutation. Use object references such as `n1` and `e1` from the returned data; do not guess them.
5. After creating a graph, run the layout tool when the tool description recommends it, then read the result to verify the graph.

The GUI uses the current in-memory project, so a command may include edits the user has made but not saved yet. Mutation results report whether changes were applied and persisted.

## Failure handling

Do not retry a mutation after a timeout or connection loss. Query its request status first and inspect the graph if the result remains unknown. A save failure can mean that the change was applied in the GUI but not written to disk. An invalid or stale object reference requires reading the graph again.

The CLI reports errors as JSON for invocation commands. Keep the request ID when reporting a failure. `PROJECT_UPGRADE_REQUIRED` requires an explicit `--allow-upgrade`; never add that flag silently.
