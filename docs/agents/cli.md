# Project Graph CLI

Project Graph 的自动化入口是 `project-graph` 纯 Go 可执行文件。CLI 不直接读写 `.prg` 文件，所有工程操作都通过本地 IPC 转发给 GUI，由 GUI 当前工程实例执行并保存。

## Commands

```sh
project-graph --help
project-graph --version
project-graph tool list
project-graph tool describe get_all_nodes
project-graph tool invoke get_all_nodes --project /absolute/path/to/project.prg --input '{}'
project-graph request status <request-id>
```

`tool list` 和 `tool describe` 不需要 GUI。`tool invoke` 会连接已经运行的 GUI；GUI 未运行时，CLI 会启动它并等待 automation bridge 就绪。目标工程没有打开时，GUI 会自动打开该工程并通过 toast 提示用户。

CLI 输出结构化 JSON。每个调用都包含请求 ID、工具结果、是否应用修改以及是否已持久化。连接中断或超时后不要重复执行修改请求，先用 `request status <request-id>` 查询结果。

同一工程的请求在 GUI 内按顺序执行。修改工具执行成功后由 GUI 保存；保存失败会返回 `PROJECT_SAVE_FAILED`，这表示画布内存可能已经改变但文件没有写入成功。读取工具不会强制保存。

旧工程格式升级需要显式授权：只有在调用中添加 `--allow-upgrade` 才允许升级。CLI 不会替用户确认升级或覆盖未保存的内存状态。

## Image files

`get_image_file` 接收 ImageNode 或包含图片的 Section 引用，把附件导出到应用缓存目录的 `ai-exports` 子目录，并返回本地 `path` 与 `mimeType`。外部 Agent 直接读取该路径；不再提供 `recognize_image` 或应用内图像识别窗口。

## Development

在仓库根目录执行：

```sh
go -C app test ./internal/automation ./cmd/project-graph ./internal/desktop
bun run --cwd app automation:catalog
```

工具目录由前端工具定义生成到 `app/internal/automation/tools.json`。CLI 不依赖 Bun、Node.js、MyGo 或 MCP 运行时。
