# Project Graph CLI development

The repository-local Project Graph CLI requires Node.js 26 or newer, Corepack, pnpm 11.3, and installed workspace dependencies.

Run commands from the repository root:

```sh
pnpm cli -- --help
pnpm cli -- --version
pnpm cli -- tool list
pnpm cli -- tool describe get_all_nodes
pnpm cli -- tool invoke get_all_nodes --project /absolute/path/to/project.prg --input '{}'
```

Operational success writes exactly one JSON value to stdout and nothing to stderr. Failure writes no stdout and one JSON error object to stderr. Discovery is Project-independent and does not start the desktop application.

`tool invoke` canonicalizes the explicit `.prg` Project Path. When the desktop application owns that path, the invocation uses the matching Open Project, including its live unsaved graph, selection, and viewport. Otherwise, the 19 closed-capable tools run against a one-shot Project loaded from disk; the 6 selection tools and 4 viewport tools return `PROJECT_MUST_BE_OPEN`. Closed Project mutations are saved only after successful execution, while Open Project mutations remain unsaved live state.

SIGINT and SIGTERM request cooperative cancellation. A handled cancellation writes no stdout, writes one `CANCELLED` JSON error to stderr, and exits with code 130. Closed Project cancellation before persistence does not save a partial result. Effects already performed against an Open Project, the network, or a model are not rolled back.

Cancellation has no invocation timeout and does not hard-kill a handler. A handler that consumes its `AbortSignal` can stop promptly; existing handlers that do not consume it may finish their current work before the CLI reports cancellation. There is no cancel subcommand, stdin cancellation message, or crash/power-loss rollback guarantee.

## Production runtime materialization

Build the native ownership helper for the current target, then materialize the precompiled Node runtime into an empty output directory:

```sh
cargo test --manifest-path app/src-tauri/Cargo.toml --test project_ownership_helper
PROJECT_GRAPH_CLI_VERSION=1.2.3 \
PROJECT_GRAPH_OWNERSHIP_HELPER_PATH="$PWD/app/src-tauri/target/debug/project-graph-ownership-helper" \
pnpm --filter @graphif/project-graph materialize:cli --outDir /absolute/path/to/empty-output
node /absolute/path/to/empty-output/project-graph.mjs --version
```

The materialized directory contains the precompiled CLI entry and chunks, production Node dependencies, and the target-native ownership helper. It does not interpret TypeScript, start Vite at runtime, download dependencies, fall back to `PATH`, or bundle a Node executable. A later integration package must add a fixed Node runtime and invoke this exact package-local entry.

The repository process suites validate the native helper, materialized runtime, Closed Project execution, and loopback Open Project Runtime bridge on macOS arm64. The ownership primitive is implemented for macOS and Windows, but this core candidate does not claim a validated Windows payload or Host installation; those require target-native materialization and acceptance on the designated Windows machine. Linux payloads, packaged desktop applications, signing, installation, and Host Plugin or Marketplace lifecycles remain outside this boundary.
