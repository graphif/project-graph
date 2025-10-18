# 关于 Project Graph

这是一个使用 Tauri 构建的开源桌面应用程序，旨在提供一个用于可视化思维的下一代网状节点图工具。项目数据当前以 JSON 格式存储。

## 技术栈

- **核心框架**: [Tauri](https://tauri.app/)。Rust 部分仅用于处理基础的本地文件系统交互，绝大部分核心逻辑在前端实现。
- **前端**:
  - **UI**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - **构建工具**: [Vite](https://vitejs.dev/) (通过 `rolldown-vite` 覆盖)
  - **渲染引擎**: [Pixi.js v8](https://pixijs.com/)
  - **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **代码库**:
  - **Monorepo 管理**: [pnpm workspaces](https://pnpm.io/workspaces) 和 [Nx](https://nx.dev/)
  - **包管理器**: pnpm

## 项目结构

本项目是一个 Monorepo，主要包含以下部分：

- `app/`: 主桌面应用程序的源代码。
  - `app/src/core/`: 包含应用的核心逻辑，是当前重构的重点区域。
- `packages/`: 存放各个独立的、可共享的模块。
  - `@graphif/data-structures`: 可序列化的数据结构。
  - `@graphif/serializer`: 用于将类实例序列化为纯对象的工具。
  - `@graphif/shapes`: 定义了项目中使用的可序列化图形。
  - `project-graph-api`: 为插件开发者提供 API 和类型定义。

## 代码要求

1.  **代码风格**: 严格遵守项目根目录下的 `.eslintrc.js` 和 `.prettierrc` 配置。
2.  **Rust 健壮性**: 所有暴露给前端调用的 Rust 函数（Tauri commands）必须在内部捕获并处理所有潜在错误。绝对不能出现 `panic`，否则将导致整个应用程序崩溃。
3.  **TypeScript 规范**:
    - 允许使用 `namespace` 组织代码 (`@typescript-eslint/no-namespace`: "off")。
    - 允许使用 `any` 类型，但在有明确类型可用时不应滥用 (`@typescript-eslint/no-explicit-any`: "off")。

## 项目目前状态：重构中

项目正在进行一项重大的渲染引擎重构。

- **重构目标**: **从旧的 Canvas2D API 迁移到现代化的 Pixi.js v8 渲染引擎**，以提升性能、可扩展性和功能。
- **重构进度**:
  - 目前的开发工作集中在完各种 `StageObject`。
  - **只有以下路径的代码是已经重构过的、代表未来方向的新代码**:
    - `app/src/core/Project.tsx`
    - `app/src/core/loadAllServices.tsx`
    - `app/src/core/sprites/` 目录下的所有文件
- **给 Copilot 的指示**:
  - 在进行任何与渲染、画布或图形对象相关的开发时，**请务必参考上述已重构目录中的代码风格和架构模式**。
  - **避免学习或使用**项目其他部分中存在的旧的 Canvas2D 实现方式。
  - 所有新的渲染相关功能都应基于 Pixi.js v8 实现。
  - **重要**: 作为重构的一部分, `@graphif/shapes` 和 `@graphif/data-structures` 包中的数据结构正在被废弃。对于新代码，请**优先使用 Pixi.js 内置的数据类型** (例如 `PIXI.Point`, `PIXI.Rectangle`) 来替代。
