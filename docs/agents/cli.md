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

The repository process suites currently validate this development workflow on macOS, including `/usr/bin/lockf` ownership and the loopback Open Project Runtime bridge. Windows, Linux, packaged applications, signing, installation, PATH setup, and release workflows are outside this boundary.
