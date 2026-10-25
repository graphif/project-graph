<div align="center">

<img src="https://assets.graphif.dev/icon.png" width="96" height="96" alt="Project Graph 标志">

# Project Graph

**让想法连成图，让复杂关系变清晰。**

用于头脑风暴、知识整理与项目规划的桌面节点图工具。<br>
自由布局、连接思路，在无限画布上从细节走向全局。

[下载应用](https://github.com/graphif/project-graph/releases/latest) · [使用文档](https://graphif.dev/docs/prg) · [官方网站](https://graphif.dev/) · [社区交流](https://graphif.dev/docs/prg/misc/community)

<p>
  <a href="https://github.com/graphif/project-graph/releases"><img src="https://img.shields.io/github/v/release/graphif/project-graph?style=flat-square&color=89b4fa" alt="最新正式版本"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-94e2d5?style=flat-square" alt="Windows、macOS 与 Linux">
  <a href="https://github.com/graphif/project-graph/blob/next/app/LICENSE"><img src="https://img.shields.io/badge/app-GPL--3.0-a6e3a1?style=flat-square" alt="应用许可证 GPL-3.0"></a>
</p>

</div>

<p align="center">
  <img src="/docs/assets/readme/canvas.gif" width="960" alt="Project Graph 实际操作：缩放画布，在局部节点与全局结构之间切换">
</p>
<p align="center"><sub>从局部细节到整体结构。演示素材来自 <a href="https://graphif.dev/">官方网站</a>，<a href="https://assets.graphif.dev/videos/scale.webm">查看完整视频</a>。</sub></p>

## 一张画布，多种表达

Project Graph 不要求你的想法只有一个中心、一个方向或一种层级。你可以先放下零散的想法，再通过连接、分组与布局逐步梳理关系。

| 你想做的事             | 可以使用的能力                           |
| ---------------------- | ---------------------------------------- |
| 整理阅读笔记与知识体系 | 文本、图片、LaTeX 公式、引用块和嵌套分组 |
| 分析系统、流程与依赖   | 树形结构、网络关系、多种连线与自动布局   |
| 快速记录与展开思路     | 键盘生长节点树、自定义快捷键、涂鸦       |
| 汇集不同形式的材料     | 拖入文字、图片、音频和视频               |
| 按自己的习惯工作       | 深浅主题、可配置菜单与 JavaScript 扩展   |

### 思路跟得上输入速度

通过键盘向不同方向展开节点树，再用画布调整布局。适合边阅读边整理、快速拆解问题，以及记录不断分叉的想法。

<p align="center">
  <img src="/docs/assets/readme/tree.gif" width="640" alt="使用键盘向不同方向生长节点树">
</p>
<p align="center"><sub><a href="https://assets.graphif.dev/videos/tree.webm">完整演示</a> · <a href="https://graphif.dev/docs/prg/features/feature/tree">节点树使用说明</a></sub></p>

### 从画图到自己的工作流

- **组织与连接**：分组框、双向引用和孪生关联，帮助内容跨越单一层级。
- **保存与恢复**：撤销、重做、自动保存和备份，支持持续整理工程。
- **导入与导出**：在画布与文本等格式之间转换，配合已有工具使用。
- **扩展能力**：通过 JavaScript 添加快捷键、节点类型、对话框和主题。

[浏览全部功能](https://graphif.dev/docs/prg) · [了解扩展开发](https://graphif.dev/docs/extension)

## 开始使用

1. 前往 [最新正式版](https://github.com/graphif/project-graph/releases/latest) 或 [官网下载页](https://graphif.dev/release/latest)，选择适合系统的安装包。
2. 新建工程，创建节点、连接内容，或拖入已有材料。
3. 阅读 [使用文档](https://graphif.dev/docs/prg)，了解移动缩放、节点树与快捷键。

**版本说明**：当前正在开发 **v4.2.6**。正式版以 Releases 为准；开发中改动与待验收问题记录在 [更新日志](/CHANGELOG.md)，不代表已经发布。

## 参与开发

应用使用 **React + TypeScript + Tauri**，画布基于 **Canvas 2D**。工作区由 **pnpm + Nx** 管理。

准备 Node.js 26+、项目指定版本的 pnpm、Rust，以及 [Tauri 对应平台的系统依赖](https://v2.tauri.app/start/prerequisites/)。

```bash
git clone https://github.com/graphif/project-graph.git
cd project-graph
pnpm install
pnpm dev
```

`pnpm dev` 启动桌面开发环境，由 Tauri 自动启动 Vite 并等待 `http://localhost:1420` 就绪。无需在另一个终端重复启动前端。

| 命令                                              | 用途                |
| ------------------------------------------------- | ------------------- |
| `pnpm dev`                                        | 启动桌面开发环境    |
| `pnpm --filter @graphif/project-graph dev`        | 仅启动前端开发服务  |
| `pnpm --filter @graphif/project-graph type-check` | TypeScript 类型检查 |
| `pnpm test`                                       | 运行测试            |
| `pnpm lint`                                       | 检查代码规范        |

首次运行测试或修改 Rust 所有权辅助程序后，先运行 `cargo test --manifest-path app/src-tauri/Cargo.toml --test project_ownership_helper`，准备并验证 CLI 测试所需的本地辅助程序，再运行 `pnpm test`。文件锁测试使用项目自带的 Rust 实现，无需安装 `lockf`。

<details>
<summary><strong>修改后界面没有更新？</strong></summary>

先确认终端显示 Vite 就绪，且 `http://localhost:1420` 可以访问。前端服务断开后，已经打开的桌面窗口可能继续显示旧页面。

如果先启动了独立前端服务，请停止它，再运行完整桌面开发入口。1420 是固定端口，冲突时会直接报错，不会自动切换。

</details>

<details>
<summary><strong>代码从哪里看起？</strong></summary>

| 目录                 | 内容                               |
| -------------------- | ---------------------------------- |
| `app/src/core`       | 工程生命周期、画布、渲染与业务服务 |
| `app/src/components` | 界面组件                           |
| `app/src-tauri`      | 桌面窗口与本地系统能力             |
| `app/src/locales`    | 多语言文案                         |
| `packages`           | 图形、数据结构、序列化与扩展工具链 |

</details>

[开发指南](https://graphif.dev/docs/contribute) · [贡献说明](/CONTRIBUTING.md) · [行为准则](/CODE_OF_CONDUCT.md)

## 反馈与贡献

欢迎提交问题、改进文档、补充翻译，或参与代码开发。

- **报告问题**：[提交 Issue](https://github.com/graphif/project-graph/issues)，附上版本、操作系统、复现步骤；界面问题可附截图或短录屏。
- **交流用法**：[加入社区](https://graphif.dev/docs/prg/misc/community)，分享图谱与使用经验。
- **参与实现**：参考贡献说明，再提交 Pull Request。

感谢 Littlefean（阿岳）、zty012、Rutubet（小劫）、Waya，以及所有 [贡献者](https://github.com/graphif/project-graph/graphs/contributors)。

## 支持项目

感谢以下服务商对项目的支持。

[慕乐云](https://muleyun.com/aff/HLONILNH) · [YXVM](https://yxvm.com/) · [ZMTO](https://console.zmto.com/?affid=1574) · [DartNode](https://dartnode.com)

<a href="https://console.zmto.com/?affid=1574"><img src="https://console.zmto.com/templates/2019/dist/images/logo_white.svg" height="36" alt="ZMTO"></a>
&nbsp;&nbsp;
<a href="https://dartnode.com"><img src="https://dartnode.com/branding/DN-Open-Source-sm.png" height="36" alt="Powered by DartNode"></a>

## 许可证

桌面应用使用 [GPL-3.0](/app/LICENSE)。工作区内各复用包的许可证请查看对应目录中的 `LICENSE`。
