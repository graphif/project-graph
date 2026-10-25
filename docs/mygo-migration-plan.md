# Tauri → MyGo Web Frontend 迁移方案

日期：2026-10-25。工作分支：`mygo`，基于 `master` 创建。迁移已开始，以下为目标方案与当前实施记录；未完成项不能按目标描述视为已交付。

### 当前实施进度（2026-10-25）

- Bun 1.4.4 workspaces/catalog 与冻结锁文件已切换，Nx 已升级至 24.0.1；旧包管理器配置、锁文件与缓存索引已删除。
- 默认开发入口已切到 MyGo 0.6.4。旧桌面宿主源码、Rust/vendor、专用脚本、依赖与旧发布工作流已删除，不再保留双宿主对照入口；应用图标已迁入 `app/resources`。
- 已落地类型化 Go 服务与生成客户端：文件/原子写入、JSON store、路径、窗口/关闭确认、剪贴板、拖放、菜单、快捷键、fetch、设备身份、引用快照、所有权锁、CLI bridge 与 MCP stdio。旧身份只用于防双写协调，不读取其业务数据。
- 正式、开发数据分离；桌面验收使用临时数据/缓存/日志和独立所有权目录，不复用真实用户窗口状态。独立 CLI 继续用 Node，开发 helper 用 Go，真实应用版本由 `mygo.config.ts` 提供。
- 已通过冻结依赖安装、Nx 九项目识别、TypeScript 检查、定向 lint、Go 单测与真实 WebView 存储/二进制文件/错误传播冒烟。Windows 真实桌面矩阵覆盖 29 个工具（19 project / 6 selection / 4 viewport）、并发引用存储、草稿另存为、未保存对象和不改变标签/DOM 焦点/窗口焦点的调用。
- 本轮 Vitest 定向批次分别通过 76 项、51 项与版本/锁释放 5 项（覆盖存在交集，不相加为独立总数）。完整 CLI 批次曾有 3 项开发 helper 冷启动超时和 1 项本地模型 HTTP `bad port`；超时预算已调整，4 项定向重跑均通过，HTTP 用例单独重跑也通过，但不据此宣称完整批次一次性全绿。Windows 强制终止另测无保存/释放锁，不能冒充可捕获 POSIX 信号的协作取消。
- 尚未验收跨平台安装、签名和完整更新链路；未执行任何生产构建。
- **尚未完成**：显式 codec/旧文件适配与 JSON PRG writer、全局目录命名整理、首次 onboarding/主动旧数据迁移、算法端到端试验、tag 发布 gate/多平台打包签名及更新验收。当前不能标记 P0–P5 整体完成。

本轮不创建提交，不运行生产构建；只接入 updater 官方插件，不伪造更新公钥或发布密钥。

## 1. 已确定的产品与技术方向

- 只做 Windows/macOS/Linux 桌面应用，使用 MyGo **Web Frontend 模式**：Go 宿主 + 系统 WebView + React/TypeScript/Canvas。这里的 Web Frontend 是桌面 UI 技术，不是网页版产品。
- 删除独立网页版、嵌入式 iframe 模式及其专用入口、存储 fallback、部署配置与文档；不再为普通浏览器提供可运行的完整应用。开发时仍使用 Vite，测试仍可使用 DOM 环境，两者不等于保留网页版。
- 新 app ID 为 **`dev.graphif.prg`**；原 `liren.project-graph` 仅用于旧版检测、用户主动迁移和必要的跨版本进程协调，不作为新业务数据身份。
- 新版全新初始化，不自动读取、复用或搬迁 Tauri 的设置、账号、缓存、扩展和其他业务数据。检测到旧版后，在 onboarding 第二页提示用户主动迁移并卸载旧版。
- 新增带 Motion 动画的首次启动 onboarding：第一页欢迎，第二页旧版检测/迁移，后续设置主题、操作习惯，再进入编辑器。
- 前端目录、文件命名与职责分层统一纳入迁移范围，不只整理新增代码。消除 serializer 对反射、类名、模块加载副作用与构造参数顺序的依赖；兼容读取既有 `.prg`，新格式显式版本化，外部 API 变化有兼容边界。
- 包管理与项目开发工具切换到 **Bun**，保留 Nx 任务编排，除非实测存在阻断。不再维护 pnpm 工具链。
- **本期接入 MyGo updater**：使用官方 updater 插件、签名更新与 GitHub Release；提供检查、下载、安装和安全重启。官网保留首次安装与更新失败时的下载入口，不复用 Tauri 的更新协议/密钥。
- 不重写为 Go Native UI，不更换状态管理、不引入数据库，也不借机重写图算法。
- 对经 profiling 确认的 CPU 热点，允许将纯计算内核迁到 Go，复用显式 DTO/codec 传输最小数据快照；以端到端收益和 UI 流畅度验收，不以“复杂算法换语言必然更快”作为前提。算法行为变化与语言迁移分开评审。
- 新 `.prg` 使用 **ZIP + Deflate + UTF-8 JSON**，附件保留原始二进制文件；不再写 MessagePack。PRG 文件版本与保存它的软件完整版本号一致，不再维护独立的文档格式版本序列。
- 根目录与 `app/package.json` 的应用版本固定为 **`0.0.0`**，不参与发布版本推导；真实应用版本只在 **`app/mygo.config.ts`** 维护。运行时、PRG 和 CI 使用该配置解析出的同一有效版本，不能回读 npm 占位版本。

现有工作流还发布 Android。MyGo 官方桌面文档不意味着支持 Android/iOS；本期桌面迁移不得宣称覆盖移动端。移除新版移动端任务时应在发布说明明确旧版状态，既不把 Android 包混入 MyGo 发布，也不默认承诺继续维护它。

## 2. 现状与改动范围

| 范围              | 当前入口 / 实现                                                                    | 目标                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 启动、平台与身份  | `main.tsx`、`App.tsx`、`utils/platform.tsx`、Rust `lib.rs`                         | MyGo 启动协议，新 app ID，onboarding 状态门禁，删除浏览器分支                     |
| 首次引导          | `sub/OnboardingWindow.tsx` 目前为空组件；`WelcomeWindow` 与 Tutorials 另有启动行为 | 一个首次启动流程；既有欢迎/教程协调触发，不叠加弹窗                               |
| 工具链            | 根/app `package.json`、`pnpm-workspace.yaml`、lockfile、Nx、CI                     | Bun workspaces/catalog/锁文件、脚本、缓存与生命周期脚本策略                       |
| 前端结构          | 根级页面、`sub`、`components`、`core/service`、`utils` 混放                        | 按应用装配、功能、核心模型、平台、共享 UI 分层；路径统一 kebab-case               |
| 文件/路径/存储    | `FileSystemProviderFile.tsx`、Store/LazyStore、Rust `cmd/fs.rs`                    | Go 文件服务、新数据根目录、最小存储适配、显式导入流程                             |
| HTTP、认证、AI    | AuthClient、CollabApi、AIEngine 等                                                 | Go fetch 插件；验证 Cookie、SSE、取消与 OAuth 新身份                              |
| 桌面 API          | 窗口、剪贴板、对话框、shell、菜单、全局快捷键                                      | MyGo runtime + 少量绑定服务；保持用户可见行为                                     |
| 所有权与 CLI 桥接 | `project_ownership.rs`、`project_runtime_bridge.rs`、`OwnershipHelper.ts`          | Go 系统锁/helper/TCP 服务，保持协议和跨版本防双写                                 |
| 引用快照与 MCP    | `project_reference_store.rs`、`cmd/mcp.rs`                                         | Go 校验/持久化、子进程 session 与取消管理                                         |
| 扩展              | `core/extension`、`packages/extprg-types`                                          | 宿主中立公开类型；保留扩展 API、避免暴露所有 Go 绑定                              |
| 独立 CLI          | `app/src/cli`、`packages/project-graph-cli`、materialize 脚本                      | Bun 开发工具链与 Go helper；发布 CLI 的 Node/Bun 运行要求单独验证                 |
| 发布与更新        | updater UI、Tauri 安装脚本、release/publish/nightly 工作流                         | MyGo updater；push tag 触发，`go tool mygo build -upload` 创建/上传 draft Release |

实施前枚举全部静态/动态导入、字符串事件、测试 mock、资源、脚本、文档、public types。不能只做 Tauri 包名替换。例如 `BuiltInToolExecutors.tsx` 有动态 HTTP 导入，`ProjectGraphCliRuntimeCompatibility.ts` 匹配旧模块名，扩展类型包也依赖 Tauri。

## 3. 目标结构与命名规范

### 3.1 前端目录

统一按职责分层，不机械地把所有东西移到新目录：

```text
app/
  go.mod / go.sum
  main.go
  mygo.config.ts
  internal/desktop/                Go 服务，按真实职责拆文件
  cmd/project-graph-ownership-helper/
  src/
    main.tsx                      仅启动与挂载
    application/                  应用装配、启动流程、工作区、全局状态
    features/
      onboarding/                 欢迎、旧版迁移、主题/操作设置
      settings/                   设置页面与配置 schema
      ai/                         AI UI 与业务服务
      collaboration/              协作 UI 与业务服务
      ...                         按现有功能逐块归位，不创建空模块
    core/                         Project、舞台模型、算法、控制、渲染、领域接口
    platform/                     MyGo 桌面适配、文件系统、存储、HTTP
    components/
      ui/                         沿用 shadcn/项目 UI 约定
      ...                         真正跨功能的组件
    shared/                       跨功能纯工具、通用 hook、常量
    cli/                          独立 CLI 运行时与宿主接缝
    generated/mygo.ts              生成客户端，不手改
    locales/                      沿用现有 YAML 与自动繁体生成
    assets/
    css/
  dist/                           Vite 产物
  .mygo/                          开发产物，忽略提交
  build/                          将来的发布产物，忽略提交
```

- 文件名、目录名统一 **kebab-case**：`project.ts`、`file-system-provider.ts`、`theme-step.tsx`、`stage-object/`；入口名沿用工具要求，生成/外部资源文件不强行改名。
- TS 符号保留语义惯例：组件、类、类型、接口用 PascalCase，函数/变量/hook 用 camelCase，真正固定常量用 UPPER_SNAKE_CASE。不是把所有标识符强行改成一种大小写。
- 只有包含 JSX 的文件用 `.tsx`，其余用 `.ts`。不新增目录 `index.tsx`；不建立大规模 barrel 导出，显式引用实际文件。
- 测试与被测模块相邻，命名 `name.test.ts(x)`；仅功能私有的组件、hook、helper 留在对应功能目录，不能全部倒进 `shared`。
- 外部 snake_case/camelCase DTO 按协议保留，在边界映射；不以代码整理为由改 JSON 字段、设置键、子窗口 ID、快捷键 ID 或序列化标识。

### 3.2 依赖方向与重构方法

- `application` 装配功能、core 和平台实现；features 通过 core 接口调用能力，platform 实现这些接口；底层 core 模型/算法不再反向导入 feature UI。跨层耦合按模块逐步解开，不一次性重写整个服务系统。
- `components/ui`、通用 shared 不依赖具体 feature；generated 客户端集中在平台边界使用。对现有循环依赖先登记，再用已有接口/依赖注入拆除，不为每个函数造抽象。
- 先建立“旧路径 → 新路径”迁移表；按文件搬迁/导入更新、行为变化分别提交，避免混在一个无法审阅的巨型 diff 中。最终验收覆盖整个 `app/src`，不长期留下新旧两套命名。
- 同步改静态/动态 import、测试 mock、Vite/Nx alias、CLI stub 的路径正则、脚本与文档。Windows 上大小写重命名使用经过核验的临时路径中转，检查 Linux 大小写敏感导入和路径冲突。
- **路径整理不顺带改协议**：`packages/serializer/src/index.ts` 当前以类标识写入 `.prg` 的 `_` 字段，代码中还有 `constructor.name` 判断。旧格式兼容由显式适配器承担，`static className` 最多作为短期过渡，不是新架构的注册机制；目标方案见第 7 节。
- 扩展可能依赖公开符号、子窗口 ID 或深层路径。先区分公开 API 与内部路径；公开契约保留，确需破坏时明确 API 版本和迁移说明，不为了旧内部目录长期保留一堆转发文件。
- 完成后更新 AGENTS/贡献指南并加轻量命名与跨层导入检查；避免“规范写了，但新代码继续混用”。

## 4. MyGo 接入与 Bun 切换

MyGo 工程根放在 `app/`，与 Vite 工程同级。不要运行初始化模板覆盖现有项目。配置草案如下，仅用于说明目标，不是本轮新增的运行配置：

```ts
import { defineConfig } from "mygo-cli";

export const appVersion = "4.2.6-alpha1"; // 唯一维护真实应用版本的位置

export default defineConfig({
  name: "Project Graph",
  identifier: "dev.graphif.prg",
  version: appVersion,
  devUrl: "http://localhost:1420",
  devCommand: "bun run dev:webview",
  frontendDist: "dist",
  bindings: "src/generated/mygo.ts",
  out: "build",
  updates: {
    github: "graphif/project-graph",
    publicKey: "<实施时替换为真实 MyGo 更新公钥>",
    tagPrefix: "v",
    deltas: 0,
  },
  urlSchemes: ["prg"],
  fileAssociations: [
    {
      ext: ["prg"],
      name: "Project Graph Document",
      mimeType: "application/vnd.project-graph",
      role: "Editor",
    },
  ],
});
```

`dev:webview` 只是 Vite 开发服务，不是浏览器版产品入口。根 `bun run dev` 已启动 MyGo；按后续明确要求，旧宿主已直接删除，不再提供对照入口。官网是下载渠道，不在本仓库继续部署图编辑器网页版。

此处公钥为占位，不能用于发布。版本由配置显式维护，CI 不从 tag/run number 覆盖或派生另一份版本。根/app 的 package 版本固定 `0.0.0`；可独立发布的 `packages/*` 库仍维护自己的包版本，不将库版本批量清零。`go.mod` 通过 tool 指令固定 MyGo CLI，Web Frontend 也统一由 `go tool mygo` 调用；Bun 仍负责配置求值、依赖与前端工具。

### Bun 落地范围

1. 固定 Bun 版本，更新 `packageManager`、README、开发环境和 CI。根 workspaces 覆盖 `app` 与 `packages/*`；将 pnpm catalog 移到 Bun 支持的配置位置，保留 workspace/catalog 依赖语义，依据所锁定 Bun 版本官方文档核对。
2. 生成并提交 `bun.lock`，切换成功后删除 `pnpm-lock.yaml` 与 `pnpm-workspace.yaml`；不双锁并行维护。CI 使用 frozen lockfile，缓存键带 Bun 版本、平台和 lockfile。
3. 全面替换 pnpm/filter/exec/dlx、`pnpm:` 等工具链引用，逐项核验 Bun 的参数传递和工作目录语义，不做盲目文本替换。root dev → app MyGo → Vite 不得递归启动。
4. 审查 pnpm 的 `allowBuilds`、catalog 和安装安全策略如何迁移；显式批准必要生命周期脚本，不因“依赖能装上”就信任所有 postinstall。检查 bcrypt、sharp、esbuild 等原生/平台依赖及三平台离线重装。
5. 保留 Nx 依赖任务顺序，更新缓存、inputs/outputs、Tauri targets 和 helper 物料任务。独立 CLI 的路径 stub 与 materialize 工具一起调整。
6. 先沿用 Vitest，不无需求替换为 `bun test`。Bun 负责安装和脚本入口；逐项验证 Vite、TypeScript、Vitest、Nx、tsx/脚本是否需要 `--bun` 或仍会启动 Node，不混淆包管理器切换与 Node 兼容性承诺。

新 CLI 若仍作为 Node 包发布，保留对应 Node 运行时契约并做回归；若改为要求 Bun，必须显式更新 shebang、engines、安装说明和版本策略。本期默认不对用户额外强加 Bun 运行依赖，仅开发工具链切换；是否能移除开发 Node 前置条件在 P0 实测后确定。

### 绑定与运行边界

- 使用 `mygo.Bind` + 生成的类型化客户端，不重新造字符串 invoke 总线或完整 Tauri 模拟层。生成文件可提交，前端类型检查不依赖临时启动 Go 宿主。
- 少量高扇出适配限于文件/路径、store、窗口与 HTTP；业务继续复用已有接口。事件用于通知，Channel 仅用于真正流式的单次操作。
- Go 绑定方法并发执行，保护共享 store/锁/MCP/pending 状态；耗时工作传递 context 并在窗口关闭后回收。错误返回前端 ErrorHandler/Dialog/toast，不静默吞错。
- Go `[]byte` 在绑定中是 base64 字符串，不是 TS `Uint8Array`；显式编解码，大文件/预览使用受限资源 URL，避免重复内存复制。
- 删除 `isWeb/isFrame/isMobile` 及浏览器专用业务分支和 `WebStore`。先逐一审计用途，不能误删桌面 MyGo WebView 需要的 DOM、HTTP、Worker 等代码。若无 runtime，给出明确宿主缺失错误，不自动降级成网页版。
- `runtime().platform` 为 `darwin/win32/linux`；统一映射旧业务判断。Node CLI、测试无 runtime，不可导入时无条件访问 `window`；由宿主注入必要信息。
- 审计 `proxy.html` 及代理页面用途：纯网页版/iframe 专用则删除；若桌面认证或资源代理依赖它，先迁移对应能力再删除，不能按名字删掉。

## 5. 首次启动 Onboarding

这是应用启动页，不是一个可被其他窗口盖住的普通子窗口。现有空的 `OnboardingWindow` 与新流程合并，删除重复入口；引导完成前不自动弹欢迎窗/教程、不初始化非必要的 AI、MCP 和扩展后台任务。

### 页面流程

| 页面                  | 内容                                                                          | 交互与退出条件                                                                 |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1：欢迎               | 简洁品牌介绍、节点图动效、语言入口、开始按钮                                  | 键盘可操作；点击开始后进入旧版检查                                             |
| 2：旧版检测与数据迁移 | 已安装旧版、仅发现旧数据、未发现、检测失败四类状态；明确说明新旧身份/数据隔离 | 显式迁移、手动选择旧目录、稍后处理；提示并提供系统卸载入口，绝不静默迁移或卸载 |
| 3：外观               | 明/暗主题及现有配色、界面缩放，实时预览                                       | 复用实际主题能力；返回/取消可恢复预览，完成后持久化                            |
| 4：操作习惯           | 鼠标/触控板习惯、滚轮缩放或平移、右键拖动、空格拖动画布；小型试用画布         | 预设映射到现有设置键，不重写输入控制器；支持恢复默认                           |
| 5：准备就绪           | 设置摘要、手动下载新版的官网入口、进入工作区                                  | 设置与完成标记成功落盘后才进入编辑器                                           |

第二页固定存在：无旧版时显示“未检测到旧版，可直接继续”，并保留手动选择。检测失败不能伪装成未安装；显示原因和重试。跳过者可以完成引导，之后从设置重新打开迁移页。

### 设置、动画与生命周期

- 使用已有 `motion`，从 `motion/react` 接入页面切换、步骤进度和预览过渡；少量有意义动画，不为每个控件添加弹簧。遵循 reduced-motion，关闭位移和循环动画，信息不依赖动效表达。
- 复用现有主题控件、shadcn 和项目 Dialog/toast；支持焦点管理、屏幕阅读器、键盘前进/返回、小窗口与高 DPI，不新增一套设计系统。
- 复用 `theme/themeMode/lightTheme/darkTheme/uiScalePercent`、`mouseWheelMode`、`mouseWheelWithCtrlMode`、`mouseRightDragBackground`、`enableSpaceKeyMouseLeftDrag` 等 schema。系统跟随主题目前不是 `themeMode` 的已有值，若纳入产品需按 create-setting-item skill 扩展，不能只做一个无效 UI 选项。
- 不把临时左键绘图/连线模式当成长期“操作习惯”预设：当前 `Settings` 每次启动会将 `mouseLeftMode` 重置为 `selectAndMove`；引导选项必须与真实重启行为一致。
- 先存 onboarding 草稿和步骤；最终设置及 `onboardingVersion/completedAt` 在新数据目录提交。中途退出可恢复，写失败不标完成；普通更新不重复引导。必要新增设置遵循 create-setting-item skill。
- 外部双击文件、deep link、CLI 请求在引导期间进入有界待处理队列；完成后按序去重处理。独立 CLI 不被交互式引导卡住，使用明确默认值/可见错误；没有 UI ready 时不能把桌面项目误标为 connectable。
- 引导文案维护 `en.yml/zh_CN.yml`，其他手写语言按需补齐，不手改自动生成的 `zh_TW.yml`。

## 6. 新身份、旧版检测与显式迁移

### 6.1 新版数据完全隔离

- 新业务数据放入按 `dev.graphif.prg` 明确区分的目录，Go 宿主和 CLI 使用同一解析规则。MyGo 默认目录按应用名称，不是 identifier：仅修改配置 ID 不足以隔离，必须显式设置并测试 user-data/cache/log/resource 等适当路径。
- 开发实例和测试另用隔离目录，不能因 `App.SetPath` 覆盖 MyGo Dev 的隔离而污染正式数据。
- 新版启动只载入自己的数据；旧目录只在检测或用户同意迁移后读取。不共享旧 Store、不自动复用 Cookie/token、不自动安装旧扩展、不以旧设置作为默认值。
- 保持 `.prg` 文件格式可打开，但“用户选择旧项目文件”与“自动继承旧应用数据”是两回事。原项目、备份和附件不因卸载建议而删除。

### 6.2 旧版检测

- Go 服务返回结构化检测结果：安装实例、版本/路径、数据候选目录、是否仍运行、检测失败原因与证据强度；页面不接收可任意执行的卸载命令。
- Windows 检查原安装标识/卸载注册及常见用户安装位置；macOS 检查 bundle identity；Linux 检查 desktop entry/包管理器/已知位置。结合旧版目录清单辅助检测，覆盖便携版的手动选择路径，不全盘扫描。
- 只发现数据目录不等于仍安装了旧版，不能把任何同名文件误判为程序；无法穷尽所有便携安装，UI 明确“未检测到”而非保证“电脑上没有”。
- 检测本身只读取必要元数据，不扫描项目内容、不索取管理员权限；迁移目录由用户显式确认，并拒绝选中新版数据目录、重叠目录或危险根路径。

### 6.3 主动迁移流程

1. 第二页展示旧版路径、数据类别、容量、风险与“迁移后再卸载”的顺序；用户可以迁移、手动选目录或跳过，绝不后台继承。
2. 提示关闭旧版并保存项目；迁移前验证源已稳定，若仍运行则暂停/重试，不能直接复制一个正在更新的 store 或强制结束进程。
3. 用户选择类别：设置、最近文件、AI 会话/引用、用户资源/扩展配置等。缓存和窗口临时状态默认不迁移；登录 token、API 密钥和可执行扩展不直接复制/加载，明确说明需重新登录、重新配置或逐项确认。
4. 首版只支持确认过的旧版本 schema。复制到新版 staging，校验版本、JSON、附件关联与空间，保留源目录；未知格式报告并跳过/中止，不能静默丢字段伪装成功。
5. 同卷原子提交迁移结果，保存最小迁移报告/恢复点，不记录敏感内容；失败可重试、不覆盖已有新版数据、不删除源。重入迁移遇到冲突必须明确选择，不自动合并会话或覆盖新设置。
6. 用户在后续主题/习惯页所选设置优先于导入值。自定义主题/声音先校验资源路径；无效值回退时明确告知，而不是引导完成后悄悄还原。
7. 迁移完成后提示验证数据并卸载旧版，提供系统卸载/打开应用位置的安全入口；跳过迁移时提醒先备份再卸载。清楚显示“打开卸载入口”不等于“卸载完成”。

卸载保持用户控制：不自动执行注册表中的任意命令、不提权、不删除旧数据、不自动确认系统对话框。Linux 按包来源给出可核验的卸载指引，macOS 提供应用位置/说明。迁移完成后再检测可以更新提示，但不为探测卸载状态永久轮询或阻塞入门。

## 7. 去除隐式机制：数据契约与显式装配

### 7.1 当前 serializer 的具体脆弱点

已阅读 `packages/serializer/src/index.ts`、基础图形、TextNode/LineEdge，以及保存、撤销、协作、剪贴板和扩展调用点。当前不是一个单独的 Vite 配置问题：

| 当前机制                                                    | 风险                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 属性装饰器执行时向模块级 `classes` 写入构造函数             | 类型是否可读取决于相关模块有没有被求值；类型重名会覆盖；测试与 HMR 共享可变注册状态 |
| 默认使用 `constructor.name`，部分构建链借插件保留类名       | 压缩/重命名/插件差异会影响类型标识；类名本来就不应是文件协议                        |
| `configureSerializer` 后改全局解析器                        | 已注册项不会随之重新注册，注册键与之后的写入键存在不一致风险                        |
| `for ... in json` 的值直接组成 `new Class(...args)`         | 属性枚举顺序成为隐藏的构造函数协议；调整 JSON 键顺序即可影响位置参数类型            |
| `passExtraAtArg1/passExtraAtLastArg/passObject`             | 恢复对象依赖反射元数据与上下文位置约定，缺少可检查的工厂签名                        |
| `replaceRef` 和 decode 原地改写输入，部分普通对象不递归转换 | 快照复用、嵌套对象和图引用语义难以推断，不能将现有实现视为可靠的通用循环图恢复器    |
| 所有浮点数统一保留两位小数                                  | 持久化层偷偷改变业务精度；不能把历史精度策略带入新的通用机制                        |

结论：不继续用“多 import 一些类”“补 static className”“升级装饰器”修补。也不引入新的 AST 扫描、自动发现、Reflect metadata 或代码生成来掩盖加载顺序问题。

### 7.2 选择：Schema-first DTO + 显式 codec/factory + 应用装配

保留现有运行时类及方法，但不再把任意实例图直接当文件格式。持久化使用普通数据，类型标识是稳定协议值，schema 是单一的数据契约来源。

```text
ZIP 内 JSON / 网络 / 剪贴板输入（unknown）
  → 版本判定与纯数据迁移
  → schema 与引用完整性校验
  → 类型化 DTO
  → 显式工厂创建模型、连接 ID 引用
  → 依赖装配与运行时启动

运行时模型
  → 显式字段投影 / codec
  → 类型化 DTO
  → 对应边界的 envelope 与版本
  → JSON / ZIP（Deflate）
```

- 复用项目已安装的 Zod，不再添加另一套 schema 库。持久化类型从 schema 推导，不同时手写 DTO interface、schema、装饰器字段表三份定义。
- `ProjectDocument` 描述舞台对象、排序、引用、标签和附件索引等持久化数据，绝不包含 Project、Renderer、服务实例、DOM、选中态和缓存。
- 节点用稳定的 `kind` 与 `id`，关系用 `sourceId/targetId/memberIds` 等明确引用；集合顺序单独保存。不是把当前数组换成 map 后丢掉渲染层级。
- Vector/Color/Rectangle 等值对象使用明确的字段 schema 与显式转换；无需为每个嵌套值都写类名标签。仅真正的多态边界需要 discriminant。
- 不写一个能自动保存任意类/任意循环图的“serializer v2”。可用的 API 限于 `encodeProject/decodeProject`、值对象 codec 和必要的边界数据类型，范围由产品格式决定。

### 7.3 DX：少量显式声明，剩余交给类型系统

以下是拟议 API 示意，`defineCodec/createProjectCodec` 尚未实现；示例展示值对象，不能据此认为复杂图引用已经解决：

```ts
const vectorDataSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const vectorCodec = defineCodec({
  schema: vectorDataSchema,
  encode: (value: Vector) => ({ x: value.x, y: value.y }),
  decode: (data) => new Vector(data.x, data.y),
});
```

复杂对象也使用具名数据，不再根据 JSON 顺序猜构造参数：`createTextNode(context, data)`，而不是 `new classes[data._](...Object.values(data))`。

DX 验收要求：

1. **改字段可定位。** schema 与对应类型的 codec 放在同一功能/领域目录，DTO 类型由 schema 推导；运行时模型只导入所需类型，不反向导入应用级注册表。不要为一个节点拆五个零碎文件。
2. **补全与错误到字段。** `defineCodec` 的泛型在实现时验证 encode 输出符合 DTO、decode 输入自动推导、上下文具名且类型化；不用 `any` 或 `as unknown as` 消除不匹配。对于默认值区分 schema 输入/输出类型，缺省只在一个地方定义。
3. **不承诺类型系统能猜开发意图。** 新增持久化字段时仍需明确字段投影；设置默认值可能使遗漏合法，不能宣称“加字段必然编译失败”。用代表性 round-trip fixture 检测遗漏，不靠魔法自动遍历全部实例字段。
4. **新增类型只有局部定义 + 一处接线。** 新增节点时添加 schema/codec/factory，在应用级 `createProjectCodec({...})` 的显式对象表接入一项，并补一个样本；不需要改启动 import 顺序、Vite 插件或反射配置。由同一对象表推导支持类型集合，避免另写一份 union 和一份 tag 清单。
5. **已声明类型不能漏实现。** 支持类型表的每项必须具有 schema/encode/factory，键与 discriminant 由 helper 约束；duplicate tag/legacy alias 启动失败而非覆盖。尚未声明进项目的文件不依靠扫描器自动发现，显式接线是有意的唯一人工步骤。
6. **无需构建即可测试。** codec、schema 和纯数据迁移能在 Vitest 中直接 import；不启动 React、Tauri/MyGo、Vite server 或字体/音效服务。若模型导入仍拉起 UI，先拆依赖，不继续加十几个测试 stub。
7. **错误能修。** 报告对象 ID、kind、数据路径和可读原因，例如 `nodes[n-42].position.x: expected finite number`；不打印整份私有项目数据。未知类型、损坏引用不是一个笼统“反序列化失败”。

schema 的默认值只负责允许缺省的数据；改变旧字段含义、拆字段等仍需显式版本迁移，不能靠 default 把所有历史数据“修成”当前格式。

### 7.4 不再依赖模块加载顺序

- codec 导出只是普通值，导入时不写全局注册表、不发网络请求、不创建舞台对象。应用装配层在依赖加载完成后显式创建 codec/工厂集合并传给 Project/CLI/协作边界。
- `createProjectCodec` 返回独立、不可变的实例；测试各建各的，不存在 `configureSerializer` 全局开关。生产 built-ins 显式导入，无 `import.meta.glob` 顺序约定、没有强制预热 import 文件。
- schema 层只依赖 schema/纯值类型；模型不依赖应用组合入口；codec 可依赖模型；应用入口依赖 codec。通过单向依赖去掉 ESM 循环求值风险，而非认为“换显式注册”就自然消灭所有循环。
- 懒加载的类型只有在其 codec 显式 await 完成后才宣告支持。扩展类型带命名空间和版本，经宿主验证后创建新的 registry 快照，不允许异步悄悄改写已打开项目的解码器。
- HMR 不追加/覆盖旧全局表；修改 schema/工厂时重建解码上下文，必要时受控 reload。若需重建活动模型，先保留可恢复 DTO；不要把丢弃未保存状态当成 HMR 的合理代价。

### 7.5 图引用、生命周期与事务

读取分成校验数据、创建对象、连接引用、初始化运行时四步，这些是显式生命周期，不是隐式模块求值顺序：

1. 验证版本、kind、字段、ID 唯一性、引用目标/目标类型、允许的环与附件关系。位置和颜色等必须是有限合法值；限制文件条目、解压量、对象数及嵌套深度。
2. 在临时 project/model context 中创建对象，建立 `Map<ObjectId, StageObject>`。构造函数只初始化自身数据，不启动订阅/计时器，不假设其他对象/服务已存在，不在此阶段测量依赖 renderer 的几何。
3. 所有 ID 存在后显式连接边、Section 成员、同步关系等；允许的环通过 ID 解析，不递归构造整个图，不使用 `Object.create/Reflect.set` 绕过构造不变量。
4. 引用完整后统一计算几何/派生缓存并启动服务，成功后一次性替换活动舞台；失败清理临时资源，原项目与撤销历史保持不变。

当前 TextNode/LineEdge 构造中有字体/几何调整，应将依赖外部环境的部分移到具名初始化阶段。DTO decode 必须能脱离 renderer；不让 deserialize 承担服务启动器的职责。

相同 ID 必须解析为同一运行时对象，不同 ID 不能因字段相同被合并。值对象是否共享不影响语义时直接按值重建；如果某类值确有可观察的共享身份，应显式建模为引用，不能默默丢掉。复制粘贴需显式重映射本次复制对象的 ID 和内部引用，外部引用按业务规则处理。

### 7.6 文件与其他边界的兼容策略

- **先替换机制，后切写入。** 第一阶段用显式 legacy reader 读取既有 ZIP/MessagePack 与 `_/$` 表示并转换为 DTO；不为 MyGo 新版保留 MessagePack writer。新 JSON writer 在全部类型和边界样本覆盖后启用；不同时混进目录改名和无关业务行为。旧 adapter 也不能调用旧全局注册 serializer。
- Legacy reader 用固定 type tag 表按字段名读取，纯数据解析 `$` 路径；支持前向/重复引用并验证目标，不依赖动态构造函数查找。输入冻结也能读取，不修改原始 JSON/快照。
- 旧 float 两位小数等行为只在 legacy fixture 中明确记录；新 DTO/新格式不做统一精度裁剪，精度由具体业务决定。旧类型/字段 alias 保持协议值，不跟随重命名改变。
- 所有新写入统一为 ZIP/Deflate 内 JSON、ID 引用 DTO，PRG `version` 等于保存时的软件完整版本号。首次转换旧文件先备份或另存并明确告知：新版可读旧文件，不意味着 Tauri 旧版可读新版保存的 JSON 文件。
- 统一 `Project.latestVersion`、`LATEST_PROJECT_VERSION`、metadata 与 ProjectUpgrader 的职责：不再维护 `18`、`2.7.0` 等平行文档版本序列。新文件版本唯一来自应用版本源；旧版本常量/规则只留在 legacy reader。协作/扩展协议仍有独立边界，不能不经协商就拿软件版本字符串替代原有协议。
- 撤销/重做、协作、剪贴板、CLI、扩展 Comlink 不能各自继续调用旧通用 serializer。共用数据契约/转换，但各自保留 envelope、输入验证和 ID 策略；不能机械地把所有消息换成完整项目文档。
- 协作需要协议版本协商，旧/新端不兼容时明确拒绝加入，不发送让对端误读的新结构；扩展 RPC 用独立版本适配旧 API，不能借改文件格式静默破坏扩展。
- 已缓存的撤销快照与协作 ack 不原地迁移；会话切换版本时有明确重建点。内部已校验快照无需每帧重复完整 schema parse，外部输入仍必须校验。
- 未知 future kind/扩展类型不得静默跳过后保存覆盖；首版明确报错并保留原文件，若以后支持只读保留原始记录，再单独实现无损占位策略。
- `@graphif/serializer` 是独立可发布包：应用与基础库逐步脱钩，清点其他调用者后再弃用旧 API；不直接在同一包版本中把旧导出改成不兼容行为。

#### 新 PRG 容器与软件版本规则

```text
example.prg                      ZIP，JSON 条目使用 Deflate
  project.json                   format、version 与完整 ProjectDocument DTO
  attachments/<id>.<ext>          原始二进制附件，不做 Base64
  README.md                      可选说明
```

- `project.json` 使用 UTF-8，包含固定格式标识 `format: "dev.graphif.prg"` 与 `version: "4.2.6-alpha1"` 等完整软件版本，其余部分是显式文档 DTO。format 仅区分新版协议与旧容器，不再叠加 `schemaVersion/formatVersion` 计数器。
- 逻辑数据集中在一个 `project.json`，不继续保留 stage/tags/reference/metadata 的多套 MessagePack 条目；已有业务元数据收拢至 DTO，版本不在多个条目重复存储。图片/声音等已压缩附件可按测量选 Store 或 Deflate，但不引入其他压缩算法。
- 序列化写标准 JSON，schema 拒绝 NaN/Infinity、非法引用等不可表达值；不依赖 JS 的 undefined、Map、Set、BigInt 或类原型自动转义。JSON 的对象键顺序不影响含义，有业务顺序的内容使用显式数组。
- ZIP 层校验条目名称、重复项、单条目与总解压大小、JSON 深度、附件 ID/路径、压缩炸弹与损坏内容。新旧关键条目同时出现时明确报冲突，不靠优先级悄悄选择。缺版本/非法版本不猜默认值，不将错误文件当新建空项目打开。
- 写入临时完整 ZIP、完成关闭/校验后再原子替换目标；失败保留原文件。打开和导出都有取消/错误反馈，不以 JSON 更简单为由放弃数据安全。
- **唯一真实应用版本源为 `app/mygo.config.ts`**，根/app 的 `package.json.version` 始终为 `0.0.0`。MyGo 宿主、前端显示、PRG writer、CLI companion 与发布产物共用配置解析后的有效版本，禁止各自硬编码；独立库版本不充当应用版本源。
- 生产前端从类型化宿主接口获得实际版本；PRG writer 使用同一来源，不从 package.json、浏览器全局变量或远端版本接口猜测。独立 CLI 无 WebView 时读取同一安装物的版本信息/Go companion；开发和测试显式注入配置版本或测试版本，不为取版本引入 UI 依赖。生成产物元信息可以记录版本，但不能成为另一个人工维护源。
- 软件每次发布后保存 PRG 都写该软件版本，即使 schema 未变化；因此“文件版本不同”不等于“必须执行迁移”。迁移表按软件版本/版本范围声明实际变化，无结构变化时复用同一 schema，不为每个 patch 复制一份 DTO。
- 使用完整 SemVer 比较，支持 `4.2.6-alpha1` 等预发布版本；禁止继续按点拆分后 `Number()` 比较。构建 metadata 原样记录但不影响 SemVer 优先级；非法版本拒绝处理，不默默按 0 排序。实现时复用可确认的现有能力或标准 SemVer 实现，不自造解析规则。
- 对来自更新软件的文件，本期保守地拒绝可写打开并提示官网下载新版；不能只因字段恰好能 parse 就承诺可无损保存。旧软件文件经支持的版本迁移链读取，原文件版本保留到成功保存前，不在读取时自动覆盖磁盘。
- legacy reader 通过条目结构与 format 标识识别旧 `stage.msgpack/metadata.msgpack`，按旧文档版本解释；不能把旧 `2.7.0` 或整数版本直接当新软件版本进行比较。旧目录数据的主动迁移流程与用户打开旧 `.prg` 文件仍是两个入口。
- 去除新 writer/新计算协议对 `@msgpack/msgpack` 的依赖；如旧文件读取仍需它，将其限制在 legacy reader，确有其他用途时单独清点，不删除兼容旧文件所需的读取能力。

### 7.7 同时清理其他构建/初始化 tricks

| 机制                                               | 替代方案                                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| original-class-name 插件及虚拟模块                 | 持久化用稳定 kind；服务/特效/UI 用明确 id/label；日志中的类名只用于调试，不影响行为；最后删除 Vite/tsdown/Vitest/CLI 的相关插件与 stub |
| 运算符重载源码变换                                 | 改用已有 `Vector.add/subtract/multiply` 等标准 TS 方法；读代码即实际语义，不要求 bundler 改写表达式                                    |
| 服务装饰器、动态给 Project 挂属性、随机 service ID | 应用装配函数返回类型化 services；工厂参数明确依赖，业务继续 `project.services.history` 等直接补全；不换成字符串查找式通用 DI 容器      |
| 构造函数访问未装配服务、before/after 隐式约定      | 明确 create → hydrate/link → start → dispose；同一构建入口供桌面/CLI 使用，平台差异通过已声明依赖传入                                  |
| 普通模块导入时启动单例副作用                       | 模块导出定义，应用入口负责启动与清理；业务规则仍可有显式依赖次序，但不取决于文件 import 排列                                           |

这些不要求全部移除类或完全禁止装饰器，而是**禁止正确性依赖非标准源码变换、运行时类名和导入副作用**。不替换 React/Tailwind 等正常工具，只取消承担业务语义的自定义变换。每移除一项，同时删除测试/CLI 为模拟它而写的 hack。

### 7.8 最小验证切片与验收

先用 Vector/Rectangle + TextNode + LineEdge 做一个闭环，不先开发大型 codec 框架：旧 `.prg` fixture → DTO → 对象连接 → 导出 → 重开，连同撤销/粘贴的小样本验证。若新增字段/类型仍要求修改多处启动逻辑，先调整 API 的 DX，再铺开所有类型。

测试至少包含：

- 打乱 JSON 属性、对象列表及显式 registry 条目顺序，结果保持等价；同一进程两个 codec 实例隔离，无首次调用前必须执行的隐含注册函数。
- frozen 输入、重复读取、前向/共享/允许的循环引用、重复 ID、缺失目标、未知 tag、恶意路径/超限输入；错误不会污染原数据/活动项目。
- 继承字段、默认值、边/Section/同步关系与附件；保留层级/顺序、UUID、引用身份与业务精度，encode/decode 不改变有效字段。
- 在 CLI/纯测试环境直接导入，HMR/重新装配无重名覆盖和未保存数据丢失；代码不读取 `constructor.name` 来决定类型/行为。
- 给 codec 的负向类型测试覆盖错误 encode 字段类型、缺 factory、错误 context，DX 示例无需手写 generic/断言才能工作。
- 目录/类符号重命名、压缩命名不影响协议。真正生产压缩和 Vite 升级烟测由授权 CI 验证；不以 Vitest 的插件模拟替代生产验证。

### 7.9 高复杂度算法的 Go 迁移与性能边界

这是允许并鼓励的优化方向，但不将全部算法、几何操作或模型状态搬到后端。Go 主要负责低频/批量的 CPU 计算，前端保留交互、绘制与唯一活动模型；先解决重复扫描等算法问题，再判断语言迁移收益。

#### 候选任务与优先级

| 优先级              | 当前实现                                                         | 迁移范围与注意事项                                                                                                   |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 首个验证切片        | `autoLayoutEngine/mainTick.tsx` 的 DAG 布局                      | 已有 nodes/edges 输入与位置结果边界，先抽成纯函数，再用同语义 Go 实现；环、锚点、稳定排序和布局选项必须明确          |
| 高优先级候选        | `autoLayoutFastTreeMode.tsx` 的树布局/子树包围盒                 | 缓存子树尺寸、避免反复遍历；Go 接收前端测量的矩形/Section padding，不搬字体测量与节点移动副作用                      |
| 高优先级候选        | `algorithm/graphStructureAnalysis.tsx` 的连通分量、树/DAG/环分类 | 保持多目标边、自环、重复边和筛选语义，标题提取/国际化留在前端；先消除按分量反复扫描边等可避免开销                    |
| 后续 profiling 决定 | 大规模 Section 碰撞求解、批量几何                                | 必须先从同步移动/父框更新中拆出纯求解器；适合一次性整理的批量任务，不按指针移动事件逐次跨桥                          |
| 暂不迁移            | 渲染、文字/字体测量、实时命中测试、单次 Vector 运算              | 高频小操作通常不值得 IPC；必要时优先减少重复计算/建立空间索引                                                        |
| 暂不整体迁移        | `autoComputeEngine`                                              | 混有变量、字符串、表达式与 Project 副作用；先定位纯热点并明确 JS/Go 数值、字符串和执行顺序语义，不直接重写整个解释器 |

不能把同样的高复杂度重复扫描原样翻译成 Go 后宣称问题解决；必要的邻接表、子树缓存、队列游标等优化单独验证。性能候选不等于已经证明存在瓶颈。

#### 数据传输：复用数据契约，不传实例图

```text
前端活动模型
  → codec 按任务投影最小 DTO 快照
  → MyGo 生成的类型化方法（JSON 桥）
  → Go 入参校验 + 纯算法
  → 结果 DTO（位置补丁 / 分类结果）
  → 前端检查请求有效性、校验结果
  → 一个业务事务应用补丁
```

- “利用 serializer”指复用第 7 节显式序列化边界，而不是调用旧全局 `serialize(Project)`，也不是在 Go 复刻 TS 构造函数、装饰器、`_/$` 引用解析与 renderer。
- 算法 DTO 从领域数据投影，例如布局只需要节点 ID、坐标/宽高、边 ID/端点、锁定/锚点、Section 约束、选项与顺序；不包含附件、富文本、图片、token、服务、整个 `.prg` 或 Base64 实例快照。
- Go 只返回改变的 `id/x/y` 等补丁，或者结构分析的 ID 集合/分类；不返回需要前端整体反序列化并替换的整份项目。
- 第一版直接使用 MyGo 自带 JSON 传输，不做 JSON → MessagePack → Base64 → JSON 双重编码。大载荷确实成为瓶颈后才评估分块/二进制方案，先限制任务规模和减少投影字段。
- **协议只维护一个权威来源。** 跨桥请求/响应以 Go 带 JSON tag 的具名 DTO 为准，由已有 `mygo generate` 生成 TS 类型；TS 投影函数按生成类型检查，复用领域 schema 的字段语义。不要再手写独立 TS interface、Go struct 和一套字段映射生成器。
- 领域文件 schema 与计算协议不是同一层：前者负责持久化，后者只负责一次计算。Go 在信任边界验证 ID、有限数值、尺寸、端点、选项和限额；前端验证结果与请求匹配，不把生成的静态类型当运行时校验。
- Go 内部可将字符串 ID 映射为数组索引并复用邻接表，保持协议可读；首版按请求计算，无隐藏后台副本和全量文档同步协议。只有实测传输成为瓶颈时才考虑增量缓存。

#### 异步计算不能覆盖用户的新编辑

- 请求带 `projectId`、`requestId`、`inputRevision`，revision 覆盖拓扑/坐标/尺寸/约束/选项等实际输入，不只看 saved/dirty 状态。响应原样关联这些标识。
- 前端只接受当前项目、当前任务、输入未失效的最新结果；用户编辑、撤销/重做、关闭项目或新请求替代旧请求后，旧结果丢弃或提示重算，不能覆盖新坐标。
- 使用 context + 显式任务取消。MyGo 页面关闭可取消调用，但切 Tab/编辑项目不一定关闭页面，必须由业务主动取消；取消后计算循环及时检查，Go 退出不能只是不再发结果。
- 对同项目合并/替代重复请求，设置应用级并发上限和有界队列；CPU 密集计算不在主线程事件回调执行，也不为每个节点开 goroutine。
- 校验输出 ID 为输入允许集合、无重复、坐标有限、锁定对象未被擅改；完全验证成功后通过已有移动/历史/引用更新入口批量应用。保留 Section、同步关系和协作通知语义，不能简单赋值坐标绕过约束。
- 一次布局对应一次 undo/redo 和一个协作事务；取消、失败、过期、无变化结果不新增历史、不标脏。几何计算与渲染缓存统一更新，提交失败可回滚。
- 超时或算法错误明确反馈，不静默切到另一种布局。TS 旧实现只在迁移验证期作为测试 oracle，不长期维护两份生产算法和自动 fallback。

#### DX、CLI 与验证要求

- Go 算法放在独立纯包（例如 `app/internal/algorithm/`），不依赖 MyGo 窗口/项目服务；绑定服务只处理 DTO、校验、取消和调用。Go 单元测试与 benchmark 不启动 WebView。
- 前端业务只使用一个类型化门面，例如 `await project.algorithms.layoutDag(options)`，由门面提取数据、调用生成方法并安全提交；不让每个按钮自己拼桥消息、处理 revision 或重建 Vector。
- 新增算法默认只需 Go 的具名入参/结果 + 纯函数 + 一个绑定方法，前端加一次任务接线与样本；不设计通用远程表达式执行器或大而全任务框架。
- 独立 CLI 无 MyGo runtime。若 CLI 需要同一算法，可通过现有 Go companion/helper 的明确算法子命令批量调用同一纯包；协议输出与日志分流，不为每个节点启动进程。不为这个需求再维护一个常驻服务或偷偷恢复 JS 生产分叉；不需要该算法的 CLI 路径不启动 helper。
- TS/Go 共用语言中立 JSON fixture 与预期/不变量。确定排序、相同输入的稳定结果、随机 seed；Go map 遍历顺序不得决定布局。浮点用约定容差而不是逐字节相等，ID 保持字符串，NaN/Infinity 与整数范围显式处理。
- 正确性覆盖空图、孤立/断连、环、深链、稠密图、多目标/重复边、锁定节点、Section 与极端坐标。参考旧实现不等于保留旧 bug；变化单独记录。

#### 性能验收

先记录优化后 TS 的 baseline，再比较 Go。按小/中/大及深链/宽树/稠密图等形状测试，建议从 100/1k/10k 节点开始，并记录实际边数、输入/响应字节数、OS/WebView/CPU 和冷/热状态；不承诺这些规模均已支持。

拆分计时：快照提取、schema/序列化、桥接/排队、Go 校验/计算、返回解码、补丁应用与派生更新。记录端到端 p50/p95、前端 long task/输入延迟、内存/GC、取消延迟；Node/Go 微基准不能替代实际 WebView 中的结果。

只在目标大图上总耗时或交互响应有明确收益，且小图开销可接受时切生产。小任务保留 TS 的值运算/简单图工具并非双实现 fallback；被迁移的复杂内核只有一个生产实现。不先设拍脑袋的切换阈值、不宣称 Go 改变了算法复杂度、不预设“零拷贝”。完整生产包性能回归由授权 CI/实机完成，Agent 不为此绕过禁止 build 的约束。

## 8. 其他迁移兼容性

### 文件锁与 CLI

- 新 app ID、新业务目录会造成旧版与新版同时打开一个 `.prg` 的风险；onboarding 建议卸载不构成互斥保证。
- 将原系统锁协议保留为**跨版本协调命名空间**，与新版业务数据目录解耦；允许读写必要锁/owner 记录，不自动继承旧业务数据。Go helper、新版宿主和旧 helper 必须实际争用同一系统锁。若做不到，不允许声称同机双写安全。
- 保持 `PROJECT_GRAPH_OWNERSHIP_DIRECTORY`、helper stdio、owner/endpoint、TCP 逐行 JSON、错误码、取消协议。Windows 规范路径 UTF-16LE、其他平台 UTF-8 的 SHA-256 键及 UNC/符号链接行为用 golden fixture 校验。
- Go 原生锁需三平台与 Rust 互操作实测，不以创建文件或内存标记替代。单实例应用锁也不能替代项目锁。是否启用单实例应结合既有多进程行为决定。
- runtime bridge 按拥有项目的窗口定向发送、校验响应身份；处理超时/断连/重复 ID/关闭清理；Node/Bun closed-project 路径不强制启动 WebView。
- 新旧 CLI 的发现优先级、helper 定位、PATH 命令冲突需要显式规则。保留旧协议但不默认允许旧 CLI 修改任意新版内部数据。

### WebView 与桌面能力

- 生产 origin 在 macOS/Linux 为 `mygo://localhost`，Windows 为 `http://mygo.localhost`；审计 OAuth、资源、Worker/WASM、字体、Cookie 与 CORS。删除网页版不等于删除这些 WebView 风险。
- 自定义资源协议只服务白名单目录/资源 ID，限制路径穿越/符号链接。Linux WebKitGTK 不能直接播放自定义 scheme 音视频，必要时用带随机令牌的受限 loopback 服务，不暴露用户磁盘。
- `currentWindow` 只覆盖部分 API，额外操作绑定 Go。回归穿透、透明、置顶、焦点、隐藏、状态恢复、DPI/多屏及 Linux Wayland 限制。
- 标题栏改 `--app-region: drag/no-drag`；验证按钮、双击最大化和边缘缩放。先测 MyGo 标准拖入/缩放能力，再决定保留哪些 Windows/macOS 平台补丁。
- 关闭时先拦截，由前端完成未保存确认，再明确允许关闭；避免主线程等待 UI 死锁或反复触发关闭事件。
- 业务子窗口继续留在 React，不替换成一文件一原生窗口。菜单点击与快捷键复用业务入口；同步菜单状态与现有测试。

### 网络、MCP 与扩展

- 用 `mygo.Use(fetch.Plugin)` 和 `@mygo-plugins/fetch`，显式注入 AI/HTTP 客户端，不覆盖 global fetch。验证 SSE、AbortSignal、FormData、重定向和二进制；请求体会完整缓冲，不能宣称流式上传等价。
- Go HTTP CookieJar 与 WebView Cookie 独立，`credentials` 等选项被忽略；代理默认读环境变量而非系统设置。新版登录不继承旧 session，OAuth 回跳需校验来源与 state。
- 保持 MCP start/list/call/stop 契约，优先评估官方 Go SDK；保留 cwd/env/args、取消和退出清理。Windows 隐藏非交互子进程，不能拼 shell 命令代替参数数组。
- 设备 ID 保持现有算法，避免同设备被误判；新 app ID 引发服务端 OAuth/权限变化需独立验证。
- rich text/Markdown、扩展与文件内容仍是信任边界。收紧页面导航、TrustedOrigins 与绑定暴露面，不用 `*` 信任远端页面；防止页面注入变成文件/进程访问。

## 9. 自动更新与 Tag 发布策略

- 删除 Tauri updater 依赖与旧更新配置，接入 `github.com/egoist/mygo/plugins/updater`；复用官方更新窗口，不额外造一套下载器。前端“检查更新”经类型化 Go 绑定调用 `updater.CheckForUpdates()`，原生菜单复用对应入口。
- 配置 `updates.github: "graphif/project-graph"`、更新公钥和 tagPrefix，CI 提供 `MYGO_UPDATER_PRIVATE_KEY`。新密钥与 Tauri updater key、OS 代码签名证书分开管理；私钥不进仓库/前端/日志，须有安全备份和泄露/丢失处置方案。
- 官方插件默认启动约 10 秒后检查、之后每日检查；首次引导期间通过官方关闭自动检查选项暂缓，完成后按用户偏好开启。复用官方 automatic-check/download 偏好，不复制两份设置；默认不静默下载/安装，用户可主动选择。自动检查失败不阻断编辑，手动检查必须反馈错误。
- 安装后重启走应用关闭/退出协调，处理全部未保存项目与进行中的迁移/计算/MCP 请求；取消保存就取消重启，不能调用强制 Exit。官方插件的立即重启与下次启动生效路径都要实测，不假设它已了解本项目的关闭协议。
- 首版 `updates.deltas: 0`，先验证完整更新闭环，再按需要启用官方 delta。签名无效、下载中断、网络不可达、磁盘不足、权限不足、重复点击不得损坏当前安装；开发构建和包管理器安装无法自更新时说明原因并给出官网下载/包管理器指引。
- “关于”与 onboarding 完成页保留官网 HTTPS 下载入口；Tauri 到 MyGo 的首次安装仍需手动下载。官方插件语言与现有应用语言设置映射，旧 updater UI 不与新插件同时工作。
- 不改造旧 Tauri 更新服务；官网发布说明引导用户手动安装 MyGo 版，再通过 onboarding 迁移/卸载旧版。
- 新身份意味着可能是并行安装而非覆盖升级：安装器、卸载器、快捷方式、应用名称和路径必须可区分，不能让旧卸载器删掉新版文件。新版手动覆盖安装应保留新版数据且不重跑 onboarding。
- OS 代码签名/公证仍要做，**更新签名不能替代安装包代码签名**；验证 helper 执行权限、签名、WebView2 依赖和 macOS 权限。
- `.prg` 文件关联与 `prg://` scheme 会被新旧版争抢；安装/卸载顺序可能使关联指向失效路径。测试安装新版→卸载旧版→修复/确认关联；不静默改用户默认程序。OAuth 也可能回到旧版，需在过渡期检测提示。
- MyGo 文档默认 Linux 包为 executable/archive/deb，原 rpm/AppImage/AUR 支持需明确适配，不做未经验证的承诺。其默认最低 macOS 12，而旧配置为 11，需验证并公告系统要求。
- 官网需明确区分 Tauri 旧版/MyGo 新版、OS/架构、最低系统要求、安装/迁移步骤、校验信息与已知问题；保留历史安装包不代表新版数据能向旧版自动回迁。

### 9.1 版本管理与发布渠道

| 项目                          | 规则                                                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 根/app `package.json.version` | 固定 `0.0.0`；发布 CI 不 bump、不临时改写                                                                                                                  |
| 配置中的基础应用版本          | 在 `app/mygo.config.ts` 显式维护完整 SemVer；正式发布前由开发者修改、审阅并提交                                                                            |
| 稳定版                        | 有效版本等于配置版本，tag 为 `v<version>`；不接受带预发布后缀的配置冒充稳定版                                                                              |
| Alpha/Beta/RC                 | 配置保留完整预发布版本，tag 同样精确匹配；GitHub Release 标记 prerelease                                                                                   |
| Nightly                       | 如需发布，在配置中显式提交唯一预发布版本，例如 `4.2.7-nightly.20261025.1`，再 push 对应 `v4.2.7-nightly.20261025.1` tag；不由 schedule/run number 隐式发布 |
| 本地开发                      | 默认使用配置版本；开发状态/commit 信息单独展示，不擅自在保存文件时使用 `0.0.0` 或一个无法排序的版本                                                        |
| PRG `version`                 | 始终等于当前运行软件的有效版本，包括 Nightly 后缀；格式无需变化也写入实际保存者版本                                                                        |

- 发布仅由 `push.tags: ["v*"]` 触发；本地创建 tag 后 push 到 GitHub 才会触发。版本精确来自该 tag 指向 commit 的配置，不提供 `APP_VERSION`/run number 覆盖入口；重跑失败 job 保持版本和 SHA，不生成新版本。
- 开始下一轮开发时及时把配置基础版本设为下一目标版本，避免 Nightly 与已发布稳定版共用过期基线。Nightly 并非总比稳定版新；按完整 SemVer 比较，不能用时间或分支名称覆盖兼容性规则。
- 移除发布入口的 workflow_dispatch/version 输入，tag 是配置版本的断言，不是覆盖来源。`tag !== "v" + resolvedConfig.version` 立即失败；原 `app_version/app_version_android/aur_version` 等平行版本注入全部移除。
- 分发格式若仅支持数字安装版本，使用明确、可重复的格式映射，并保留完整应用 SemVer 在运行时、PRG、文件名和发布清单中。映射只是平台封装字段，不是新版本源；不同预发布/Nightly 的覆盖安装和排序必须实测。
- GitHub Nightly 默认使用唯一 tag/版本对应唯一产物，不沿用删除 release + cleanup-tag 的覆盖流程。若保留固定 `nightly` 页面作为入口，只在全部矩阵成功后更新入口，不改写已有正式 tag，也不让失败构建替换最近可用下载。
- 配置求值必须无发布/迁移副作用；CI 使用 Bun 正常导入/解析配置，不用 grep/正则抽字符串，也不为版本读取再造 AST 插件。版本解析规则可单测，不需要启动 WebView 或构建。
- 默认 updater 仅跟随已发布稳定 Release；draft/预发布不投喂稳定用户。MyGo 官方自定义 tagPrefix 查询也会排除 prerelease，不能只加一个 `nightly` 前缀就宣称支持预发布自动更新；首版 alpha/nightly 手动下载，预发布更新通道另行验证，不伪装稳定版或设置为 latest。

### 9.2 CI 改造范围与顺序

已检查现有 `release.yml/publish.yml/nightly.yml`：它们存在 workflow 输入注入多套版本、pnpm 非冻结安装、Rust/Tauri 路径、提前创建/可删除 release、Android/AUR 参数耦合。不能只把最后一行命令换成 MyGo。

| 工作流 / 范围  | 修改方案                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR / push 检查 | 固定 Bun/Go 版本，frozen lockfile 安装；类型检查、lint、Vitest、Go 单测、codec/旧文件 fixture/版本规则检查；不依赖签名密钥和发布权限                                                              |
| `release.yml`  | push `v*` tag 触发，校验 tag/config/SHA/channel/应用 ID/公钥/changelog/必要环境与 secrets；调用固定 CLI；不写 package 或临时改配置                                                                |
| `publish.yml`  | 可保留为被 release 调用的内部复用工作流；安装 Bun/Go，按依赖准备 helper/CLI，工作目录 `app`，执行 `go tool mygo build -platform <目标> -upload`；前端由 config.buildCommand 调用，不重复构建/递归 |
| `nightly.yml`  | 移除原定时/手动发布与版本派生，Nightly 预发布统一走对应 tag 的 release 工作流；如保留定时质量检查，不授予发布权限、不创建 tag/Release                                                             |
| 平台矩阵       | Windows/macOS/Linux 独立构建与测试；架构逐一列明，macOS universal/helper 双架构实际验证，不机械沿用 Rust lipo 脚本；不把旧 Android/AUR 发布接口强塞进新流程                                       |
| 产物与官网     | 由 MyGo `-upload` 创建 draft 并上传安装包、完整更新归档/manifest；官网只引用完整发布的产物。附校验和/SHA 可作为补充，不能用手工 gh upload 替代 MyGo 主流程                                        |
| 签名与权限     | 提供 MyGo 更新签名私钥、OS 签名/公证 secrets 与 GH_TOKEN；发布 job 最小 contents:write，移除 Tauri key；fork PR 不接触 secrets，签名不执行不可信产物                                              |
| 缓存与资源     | Bun 缓存以版本/OS/锁文件区分，Go 以 toolchain/go.sum 区分；Nx inputs 包含 Go 源码、config、codec、版本/渠道与资源，防止命中旧版本安装物；带密钥的签名阶段不共享不可信缓存                         |
| 文档相关工作流 | 单独审计 `render-docs-svg.yml` 等工具链，依赖应用的任务改 Bun；保留无关文档任务，不因迁移桌面 CI 误删                                                                                             |

发布的顺序固定为：

```text
push v<配置版本> tag → 解析并验证配置/tag/commit/必要环境
  → 检查与单测
  → 首个平台执行 go tool mygo build -platform <目标> -upload
      由 MyGo 创建 draft Release 并上传该平台产物
  → 其余平台并行执行同一命令，上传到已存在的同一 draft
  → 验证全部安装包、签名更新 manifest、版本与产物清单
  → 确认全部目标成功后公开 release / 更新官网下载入口
```

- `go.mod` tool 指令固定 `github.com/egoist/mygo/cmd/mygo` 的版本；在 `app` 目录运行 `go tool mygo build -upload`，不是临时下载 latest，也不是只把它写成包脚本名。Web Frontend 仍需要 Bun、冻结安装及正确 buildCommand。
- MyGo `-upload` 要求 `updates.github`、有效公钥与 `MYGO_UPDATER_PRIVATE_KEY`，并依赖 gh 身份认证；缺少配置/密钥在 build gate 阶段失败。`-upload` 按配置版本/tagPrefix 决定 Release，而非触发 tag，必须先做精确相等校验。
- 不使用 `gh release create`：官方多平台示例通过预建 draft 避免并发创建竞态，但此项目要求 MyGo 创建，因此首个平台（优先 Linux）作为创建者，其余 job `needs` 它，再上传同一 draft。同 tag concurrency 串行；首个平台失败时其余发布不启动，修复后重跑。
- MyGo 官方行为是重跑可替换 draft 中的同名文件。仅允许相同 tag/SHA/config/toolchain 的失败 draft 重试；已公开版本不覆盖、不删 tag、不使用 `--clobber` 偷换安装物。某平台失败保持 draft，用户/官网/updater 均不可见，最后汇总 job 才用 GitHub API/`gh release edit` 公开，设置正确 prerelease/latest。
- `CHANGELOG.md` 必须含配置完整版本的对应条目，保证更新 manifest 中有正确说明；tag 配置不一致、缺少条目或更新签名不可用均不允许发布。发布说明不得只依赖事后网页上编辑的文本。
- 发布前做一致性检查：配置有效版本 = 打包主程序报告版本 = companion 报告版本 = 版本接口结果 = 样本 PRG 的 version；PRG 样本用 JSON/ZIP 检查，不读取 npm 占位版本。不启动 GUI 即可核验的版本输出由宿主/companion 提供明确非交互入口。
- 稳定版 tag 必须匹配被构建的同一 commit；发布任务按 commit/SHA checkout，不能 prepare 读取一个分支版本、矩阵又读取移动后的分支。对同 tag/渠道的发布设置 concurrency，避免并发 job 混合上传。
- 必需的 `LR_API_BASE_URL` 等变量保持显式校验，正式和 Nightly 一致，不把空值注入前端。审计当前 `LR_GITHUB_CLIENT_SECRET`：前端构建变量会进入安装包，不能把真正的 OAuth client secret 视为可保密；按服务端交换或适用的 PKCE 方案处理，不原样复制现有 secrets 到新配置。
- workflow 输入经类型/格式校验并通过环境/参数安全传递，不把版本/tag/说明直接拼进 shell 可执行字符串；changelog 生成失败要明确报错或使用已批准的静态说明，不静默发布错误版本。
- 工作流改造随宿主落地分批进行，MyGo 入口和资源尚未实现时不提前让默认 release/nightly 调用不存在的命令。先验证检查与版本 gate，再切打包与发布；完整 CI 构建由维护者在授权环境执行，Agent 本地仍不运行 build。

## 10. 分阶段实施

| 阶段                        | 工作                                                                                                                         | 退出条件                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| P0：验证与基线              | 固定 MyGo/Bun 版本，验证工具链/锁/三平台能力；盘点隐式机制；完成 codec/DX 切片与 DAG 布局 Go 端到端试验                      | 明确阻断和公开契约；旧 `.prg`/边界协议基线；字段/类型扩展不依赖 import 顺序；记录算法收益而非预设更快                   |
| P1：Bun、数据边界与结构整理 | 切 Bun 工具链；规范路径/依赖；显式 codec/legacy reader；去除构建 tricks；ZIP/JSON writer；配置唯一版本源及 CI 版本/检查 gate | 类型/测试与大小写敏感导入通过；旧文件兼容；新文件只有 JSON/附件；package 保持 0.0.0、PRG 使用配置版本；无导入副作用注册 |
| P2：宿主与新身份            | MyGo 骨架、新 ID/数据路径、runtime/绑定、文件/存储；删除浏览器/iframe 专用能力                                               | 桌面正确启动、HMR/错误可见、新旧业务数据完全隔离；CLI/测试不依赖注入 runtime                                            |
| P3：Onboarding 与主动迁移   | 欢迎→旧版检测→主题→习惯→完成，Motion、检测/导入/卸载入口与恢复                                                               | 新用户/旧用户/检测失败/跳过/迁移失败/中断流程可用；数据源不受破坏                                                       |
| P4：桌面及业务能力          | 桌面交互、AI/认证/MCP/扩展、Go helper/bridge/CLI；按实测结果迁移纯计算热点                                                   | 未保存关闭安全、AI/MCP 可取消、跨版本锁实测；算法结果有版本校验/取消/单事务，端到端性能达标                             |
| P5：发布与收尾              | tag 触发、go tool MyGo -upload 创建/上传 draft；updater 完整链路、手动安装/卸载/签名/关联验证，清理旧工具链                  | 配置/运行时/安装物/PRG 版本一致；三平台签名更新和新旧并存通过；失败矩阵不公开；无网页版/Tauri updater 残留              |

P1 可按模块分批完成，后续功能只能落在新规范路径；最终 P5 前必须完成全局整理，不能以“渐进式”为由无限期保留旧结构。移动、宿主适配、行为变化分开提交，Conventional Commits；除非用户要求，本轮不创建提交。

## 11. 验证与完成标准

Agent 不运行 build/build:ci/build:no-tauri/tauri build/mygo build 等构建命令，也不间接包装执行。改代码后使用 type-check skill；切 Bun 时同步更新该 skill 的命令约定（原等价命令为 `pnpm --filter @graphif/project-graph type-check`），在工具链切换前后保持类型检查可用。`mygo generate/dev` 会编译开发宿主，实施时明确其副作用，不拿它们伪装无编译的静态检查。

只改本文不需要类型检查。后续用针对性的 Vitest、lint、Go 单测及隔离临时目录验证；安装包、生产 origin、系统权限和签名由维护者在明确授权的发布环境/CI 验收，不能用 tsc 代替。

| 类别           | 最低覆盖                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 命名与结构     | 大小写敏感导入、动态 import、CLI stub/mock、循环依赖、序列化类名、公开类型与扩展 API                                                                                           |
| 数据契约与 DX  | JSON/对象/registry 顺序无关、纯模块导入、frozen 输入、图身份/错误路径/限额、负向类型测试、新增字段/类型流程、旧文件与协作/撤销/粘贴/RPC 兼容                                   |
| PRG 容器与版本 | ZIP/Deflate + UTF-8 JSON 重开、无新 MessagePack 写入；config/宿主/PRG 一致且应用 package 仍为 0.0.0；SemVer/旧格式/未来版本/无 schema 变化 patch、解压限额/重复条目/原子写失败 |
| CI 与发布版本  | push tag 触发/配置不匹配失败、预发布不进稳定更新、固定 SHA、MyGo 创建 draft 与后续并行上传、失败 draft 重跑/已发布不可覆盖、缓存隔离、签名与 secrets 最小权限                  |
| Updater        | 检查/跳过/提醒/偏好、签名验证/损坏归档/断网/空间不足、包管理器/开发禁用、未保存取消重启、安装后再启动、helper 一致更新、跨版本 PRG/数据兼容                                    |
| Go 算法        | TS/Go 共用 fixture、稳定排序/浮点容差、过期响应/取消/限额、单次撤销与协作事务、独立 CLI；实测完整传输链路/前端阻塞/内存，不只测 Go 函数                                        |
| Bun            | 全新 frozen 安装、catalog/workspace 解析、生命周期脚本、原生依赖、Nx/Vitest/CLI 三平台运行                                                                                     |
| 身份与隔离     | 新 ID、正式/开发/测试独立路径；旧数据存在时不自动加载；无 runtime 时不降级网页版                                                                                               |
| Onboarding     | 页序、第二页全部检测状态、键盘/焦点/reduced-motion、预览还原、草稿恢复、完成标记写失败                                                                                         |
| 主动迁移       | 明确授权、运行中旧版、未知 schema/损坏文件/空间不足、冲突重入、敏感数据、源不被删除、卸载非自动                                                                                |
| 文件与锁       | 打开/保存/另存为/取消、备份恢复、原子写失败、跨版本争锁、崩溃释放、UNC/符号链接/哈希 fixture                                                                                   |
| CLI 与业务     | closed/open project、请求超时/取消/断连、引导未完成时 CLI、不丢启动文件、扩展与 AI/MCP 生命周期                                                                                |
| 平台与发布     | 三平台桌面能力、WebView 资源/媒体/Worker、OAuth 与文件关联、手动重装、旧版卸载不影响新版                                                                                       |

清理范围覆盖源码、动态导入、测试、公开类型、环境变量、脚本、依赖/锁文件、CI、文档及实际入口。更新 README/CONTRIBUTING/AGENTS 技术栈和工具链说明；没有三平台实测、显式迁移与数据隔离记录，不标记整体完成。

## 12. 潜在问题与决策门槛

| 优先级 | 问题                                                             | 对策 / 需要确认的边界                                                                           |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P0     | 新 ID 使新旧宿主/CLI 各用各的锁，可能同时保存同一文件            | 业务数据隔离，协调锁跨版本共享；卸载提醒不能代替锁互操作测试                                    |
| P0     | 目录改名触及类名序列化、插件路径和跨层循环                       | 路径与行为分开提交、旧文件 fixture、公开 API 清单；不批量改协议字段                             |
| P0     | 换 serializer 却遗漏撤销/协作/扩展边界，或只是换一种全局注册魔法 | 以 DTO 为中心显式装配；消费者清单与多边界 fixture；先 legacy codec 后新格式，DX 切片先行        |
| P0     | Go 异步结果覆盖布局过程中产生的新编辑                            | 请求与输入 revision 校验、主动取消、结果完整校验后事务应用；过期结果不进历史                    |
| P1     | Go 计算更快但全量快照/跨桥/应用结果更慢                          | 最小任务 DTO、批量补丁、端到端 profiling；不迁移高频微操作，不先引入二进制或后台双模型          |
| P0     | 用户按提示卸载后才发现备份/资源未迁移                            | 引导明确先保存/迁移/验证再卸载；源目录不删、跳过有警示；不擅自调用卸载器                        |
| P0     | 旧新应用名称相同，MyGo 默认路径仍可能撞旧数据                    | 显式按新 ID 解析目录，而非只改 config.identifier；Dev/测试分开                                  |
| P1     | `prg://` 被旧版抢占，OAuth 回到错误进程                          | 配对 state、检测旧版、安装/卸载关联回归；如改 scheme，需同步官网/服务端，不能仅改本地           |
| P1     | Onboarding 阻塞打开文件和 CLI，或迁移的主题覆盖用户刚选的主题    | 有界启动队列、非交互 CLI 策略、最后用户选择优先、完成标记原子保存                               |
| P1     | Bun 与 Nx/tsx/原生模块不完全兼容，尤其 Windows                   | 固定版本、干净安装、三平台测试；区分 Bun 工具链与已发布 CLI 运行要求                            |
| P1     | 更新密钥泄露/丢失、错误版本进稳定通道、更新重启丢编辑            | 密钥独立备份、tag/config/manifest 校验、稳定/预发布隔离；关闭协议拦截重启，提供手动恢复安装入口 |
| P1     | Linux Wayland、macOS 11、rpm/AppImage、Android 无等价支持        | P0 建能力矩阵；无法覆盖的明确公告，不用通用“跨平台”描述掩盖                                     |
| P1     | 新身份导致 OAuth/系统密钥/权限不继承，签名信任重新建立           | 重新登录、验证服务端注册/新回调，明确权限提示；安装包保持签名                                   |
| P1     | 项目/扩展输入可调用 Go 文件和进程能力                            | 白名单资源、导航/绑定信任边界、子进程参数校验；迁移不自动启用旧扩展                             |
| P2     | 迁移规模大、分支长期偏离主干，结构调整难审阅                     | 基线测试、模块化迁移、小提交、独立记录未验证项；不同时重写核心编辑行为                          |

安装器检测覆盖度、是否额外支持系统跟随主题、移动端旧版本维护、Linux 非默认包格式，是实施前要明确的产品边界；其余按本文保守默认值推进，不阻塞先做 P0 验证。

## 参考文档

MyGo API 来源为 2026-10-25 阅读的官方文档；它们随版本变化，实施前固定依赖并再次核验。Bun 的 catalog/workspaces/安装脚本行为需按选定版本查官方文档，不凭 pnpm 经验照搬。

- [MyGo 文档索引](https://mygo.egoist.dev/llms.txt)
- [环境与平台](https://mygo.egoist.dev/docs/getting-started.md)
- [Web frontend / runtime / origin / 资源协议](https://mygo.egoist.dev/docs/frontend.md)
- [配置与 app identifier](https://mygo.egoist.dev/docs/configuration.md)
- [绑定 / 生成客户端 / 事件 / 安全](https://mygo.egoist.dev/docs/bindings.md)
- [生命周期 / 目录 / 单实例 / deep link](https://mygo.egoist.dev/docs/app.md)
- [系统能力](https://mygo.egoist.dev/docs/native.md)
- [Go fetch 插件](https://mygo.egoist.dev/docs/plugins/fetch.md)
- [窗口（实施时进一步核对）](https://mygo.egoist.dev/docs/windows.md)
- [分发与签名（实施时进一步核对）](https://mygo.egoist.dev/docs/distribution.md)
- [MyGo GitHub Actions / tag 与上传流程](https://mygo.egoist.dev/docs/github-actions.md)
- [签名更新 / -upload 前置条件](https://mygo.egoist.dev/docs/updates.md)
- [Updater 插件 / UI / 检查与下载偏好](https://mygo.egoist.dev/docs/plugins/updater.md)
- [Bun 官方文档（工具链实施时核对）](https://bun.sh/docs)
