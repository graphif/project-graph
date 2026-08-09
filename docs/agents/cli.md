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

Operational success writes exactly one JSON value to stdout and nothing to stderr. Failure writes no stdout and one JSON error object to stderr. Discovery is Project-independent and does not start the desktop application. This initial CLI milestone validates invocation arguments and tool input; a validated invocation returns `TOOL_EXECUTION_FAILED` until a Project Runtime Host is connected by the Path-Routed Invocation work.
