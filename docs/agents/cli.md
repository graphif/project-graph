# Project Graph CLI development

The repository-local Project Graph CLI requires Node.js 26 or newer, Bun 1.4.4, and workspace dependencies installed with `bun install --frozen-lockfile`. The distributed CLI remains a Node program; Bun is a development tool, not an end-user runtime requirement.

Run commands from the repository root:

```sh
bun run --silent cli --help
bun run --silent cli --version
bun run --silent cli tool list
bun run --silent cli tool describe get_all_nodes
bun run --silent cli tool invoke get_all_nodes --project /absolute/path/to/project.prg --input '{}'
```

Operational success writes exactly one JSON value to stdout and nothing to stderr. Failure writes no stdout and one JSON error object to stderr. Bun's `--silent` suppresses its own script echo; automation can also invoke `node packages/project-graph-cli/src/cli.mjs` directly. Discovery is Project-independent and does not start the desktop application.

`tool invoke` canonicalizes the explicit `.prg` Project Path. When the desktop application owns that path, the invocation uses the matching Open Project, including its live unsaved graph, selection, and viewport. Otherwise, the 19 closed-capable tools run against a one-shot Project loaded from disk; the 6 selection tools and 4 viewport tools return `PROJECT_MUST_BE_OPEN`. Closed Project mutations are saved only after successful execution, while Open Project mutations remain unsaved live state.

SIGINT and SIGTERM request cooperative cancellation. A handled cancellation writes no stdout, writes one `CANCELLED` JSON error to stderr, and exits with code 130. Closed Project cancellation before persistence does not save a partial result. Effects already performed against an Open Project, the network, or a model are not rolled back.

This signal contract requires catchable signals. Windows `child.kill("SIGINT"/"SIGTERM")` force-terminates the process instead; it does not guarantee a `CANCELLED` response. Helper stdin closure still releases the native ownership lock, and the host bridge cancels work when the client disconnects.

Cancellation has no invocation timeout and does not hard-kill a handler. A handler that consumes its `AbortSignal` can stop promptly; existing handlers that do not consume it may finish their current work before the CLI reports cancellation. There is no cancel subcommand, stdin cancellation message, or crash/power-loss rollback guarantee.

## Production runtime materialization

`bun install --frozen-lockfile` prepares a self-contained `packages/project-graph-cli-runtime/node_modules` tree via its workspace hoisting barrier. Materialization copies that tree without development dependencies or repository symlinks; run it on the target OS/architecture so Sharp and the native ownership helper match the payload. It invokes a Vite build and is not a static validation command.

Build the native ownership helper for the current target, then materialize the precompiled Node runtime into an empty output directory:

```sh
go -C app test ./...
# Release packaging only; do not run during agent validation:
# go -C app build -o build/project-graph-ownership-helper ./cmd/project-graph-ownership-helper
PROJECT_GRAPH_OWNERSHIP_HELPER_PATH="$PWD/app/build/project-graph-ownership-helper" \
bun run --cwd app materialize:cli --outDir /absolute/path/to/empty-output
node /absolute/path/to/empty-output/project-graph.mjs --version
```

The CLI version and materialized package version both come from `app/mygo.config.ts`; there is no environment override. The materialized directory contains the precompiled CLI entry and chunks, production Node dependencies, and the target-native ownership helper. It does not interpret TypeScript, start Vite at runtime, download dependencies, fall back to `PATH`, or bundle a Node executable. A later integration package must add a fixed Node runtime and invoke this exact package-local entry.

Development process tests launch `app/cmd/project-graph-ownership-helper/main.go` through `go run`; packaged runtimes require a target-native executable and do not require Go. Windows uses native file locks and Unix uses flock. Packaged desktop applications, signing, installation and target-native payloads still require separate release acceptance.
