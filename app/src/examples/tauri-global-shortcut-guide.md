# Tauri 全局快捷键使用指南

## 什么是全局快捷键？

全局快捷键允许用户在应用程序最小化或在后台运行时，通过键盘快捷键来触发应用程序的特定功能。这在提高用户体验和工作效率方面非常有用。

## 在项目中添加全局快捷键支持

要在Tauri应用程序中使用全局快捷键功能，需要执行以下几个步骤：

### 步骤 1: 添加依赖

首先，需要在项目中添加全局快捷键插件的依赖。

#### 在 `Cargo.toml` 中添加 Rust 依赖

```toml
# 在 [dependencies] 部分添加
[dependencies]
# ... 其他依赖 ...
tauri-plugin-global-shortcut = "2.3.0"
```

#### 在 `package.json` 中添加 JavaScript/TypeScript 依赖

```json
{
  "dependencies": {
    "@tauri-apps/plugin-global-shortcut": "^2.3.0"
  }
}
```

### 步骤 2: 初始化插件

在 Rust 代码中初始化全局快捷键插件。

```rust
// src-tauri/src/lib.rs

// 1. 导入必要的模块
use tauri_plugin_global_shortcut::GlobalShortcutExt;

// 2. 在应用程序构建器中初始化插件
fn run() {
    tauri::Builder::default()
        // ... 其他插件 ...
        .plugin(tauri_plugin_global_shortcut::init())
        .setup(|app| {
            // ... 其他设置 ...

            // 3. 可选：在 setup 函数中注册应用级别的全局快捷键
            let app_handle = app.handle();
            app_handle.global_shortcut().register("CommandOrControl+Shift+G", move || {
                println!("全局快捷键 CommandOrControl+Shift+G 被触发!");

                // 这里可以执行任何需要的操作
                // 例如显示应用窗口、执行某个命令等
            })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 步骤 3: 在前端代码中使用全局快捷键

现在，您可以在前端JavaScript/TypeScript代码中使用全局快捷键了。

```typescript
import { register, unregister, isRegistered } from "@tauri-apps/plugin-global-shortcut";

// 注册快捷键
async function registerMyShortcut() {
  try {
    await register("CommandOrControl+Shift+G", (event) => {
      if (event.state === "Pressed") {
        console.log("快捷键被触发!");
        // 执行您的操作
      }
    });
    console.log("快捷键注册成功");
  } catch (error) {
    console.error("注册快捷键失败:", error);
  }
}

// 检查快捷键是否已注册
async function checkShortcut() {
  const registered = await isRegistered("CommandOrControl+Shift+G");
  console.log(`快捷键已注册: ${registered}`);
}

// 注销快捷键
async function unregisterMyShortcut() {
  try {
    await unregister("CommandOrControl+Shift+G");
    console.log("快捷键注销成功");
  } catch (error) {
    console.error("注销快捷键失败:", error);
  }
}
```

## 支持的修饰键

Tauri 全局快捷键插件支持以下修饰键：

- `Command` (macOS)
- `Control` (Windows/Linux)
- `CommandOrControl` (自动根据平台选择 Command 或 Control)
- `Alt`
- `Option` (macOS)
- `AltGr`
- `Shift`
- `Super`

## 组合键示例

- `CommandOrControl+C`: 复制
- `CommandOrControl+Shift+S`: 另存为
- `Alt+F4`: 关闭窗口
- `CommandOrControl+Shift+G`: 自定义操作

## 注意事项

1. **权限问题**: 某些系统可能需要额外的权限才能使用全局快捷键。

2. **快捷键冲突**: 如果注册的快捷键已被其他应用程序占用，Tauri应用程序将无法接收到该快捷键事件。确保选择独特的快捷键组合。

3. **资源清理**: 记得在应用程序关闭或不再需要快捷键时注销它们，以避免资源泄漏。

4. **平台差异**: 不同操作系统可能有不同的快捷键行为和限制。

5. **安全考虑**: 谨慎使用全局快捷键，避免实现可能被滥用的功能。

## 示例组件

在项目中，我们提供了一个完整的示例组件 `GlobalShortcutExample.tsx`，展示了如何在React应用中实现全局快捷键功能，包括注册、检查、注销等操作。

## 进一步阅读

- [Tauri 官方文档](https://tauri.app/)
- [Tauri 插件文档](https://tauri.app/v1/guides/plugins/)
- [Tauri 全局快捷键插件文档](https://github.com/tauri-apps/tauri-plugin-global-shortcut)
