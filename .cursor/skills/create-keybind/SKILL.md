---
name: create-keybind
description: 指导如何在 Project Graph 项目中创建新的快捷键。当用户需要添加新的快捷键、修改快捷键绑定或需要了解快捷键系统的实现方式时使用此技能。
---

# 创建新的快捷键功能

本技能指导如何在 Project Graph 项目中创建新的快捷键。

## 创建快捷键的步骤

创建新快捷键需要完成以下 4 个步骤：

### 1. 在 shortcutKeysRegister.tsx 中注册快捷键

在 `app/src/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister.tsx` 文件的 `allKeyBinds` 数组中添加新的快捷键定义。

**快捷键定义结构：**

```typescript
{
  id: "uniqueKeybindId",           // 唯一标识符，使用驼峰命名
  defaultKey: "A-S-m",              // 默认快捷键组合
  onPress: (project?: Project) => void,  // 按下时的回调函数
  onRelease?: (project?: Project) => void, // 松开时的回调函数（可选）
  isGlobal?: boolean,               // 是否为全局快捷键（可选，默认 false）
  isUI?: boolean,                   // 是否为 UI 级别快捷键（可选，默认 false）
  defaultEnabled?: boolean,         // 默认是否启用（可选，默认 true）
}
```

**快捷键键位格式：**

- `C-` = Ctrl (Windows/Linux) 或 Command (macOS)
- `A-` = Alt (Windows/Linux) 或 Option (macOS)
- `S-` = Shift
- `M-` = Meta (macOS 上等同于 Command)
- `F11`, `F12` 等 = 功能键
- `arrowup`, `arrowdown`, `arrowleft`, `arrowright` = 方向键
- `home`, `end`, `pageup`, `pagedown` = 导航键
- `space`, `enter`, `escape` = 特殊键
- 普通字母直接写，如 `m`, `t`, `k` 等
- 多个按键用空格分隔，如 `"t t t"` 表示连续按三次 t

**注意：** Mac 系统会自动将 `C-` 和 `M-` 互换，所以不需要手动处理平台差异。

**示例：**

```typescript
{
  id: "setWindowToMiniSize",
  defaultKey: "A-S-m",  // Alt+Shift+M
  onPress: async () => {
    const window = getCurrentWindow();
    // 执行操作
    await window.setSize(new LogicalSize(width, height));
  },
  isUI: true,  // UI 级别快捷键，不需要项目上下文
},
```

**快捷键类型说明：**

- **项目级快捷键（默认）**：需要项目上下文，`onPress` 会接收 `project` 参数
- **UI 级别快捷键（`isUI: true`）**：不需要项目上下文，可以在没有打开项目时使用
- **全局快捷键（`isGlobal: true`）**：使用 Tauri 全局快捷键系统，即使应用不在焦点也能触发

**使用 Tauri API 时的类型处理：**

如果快捷键需要使用 Tauri 窗口 API（如 `setSize`），需要导入正确的类型：

```typescript
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi"; // 或 PhysicalSize

// 使用 LogicalSize（推荐，会自动处理 DPI 缩放）
await window.setSize(new LogicalSize(width, height));

// 或使用 PhysicalSize（物理像素）
await window.setSize(new PhysicalSize(width, height));
```

### 2. 将快捷键添加到分组中

在 `app/src/sub/SettingsWindow/keybinds.tsx` 文件的 `shortcutKeysGroups` 数组中，将新快捷键的 `id` 添加到相应的分组数组中。

**分组结构：**

```typescript
export const shortcutKeysGroups: ShortcutKeysGroup[] = [
  {
    title: "basic",              // 分组标识符（对应翻译文件中的 key）
    icon: <Keyboard />,          // 分组图标
    keys: [                      // 该分组包含的快捷键 ID 列表
      "saveFile",
      "openFile",
      "undo",
      "redo",
      // ...
    ],
  },
  {
    title: "ui",                 // UI 控制分组
    icon: <AppWindow />,
    keys: [
      "closeAllSubWindows",
      "toggleFullscreen",
      "setWindowToMiniSize",     // 添加新快捷键
      // ...
    ],
  },
  // ... 其他分组
];
```

**可用分组：**

- `basic` - 基础快捷键（撤销、重做、保存、打开等）
- `camera` - 摄像机控制（移动、缩放、重置视野等）
- `app` - 应用控制（切换项目、切换模式等）
- `ui` - UI 控制（关闭窗口、全屏、窗口大小等）
- `draw` - 涂鸦相关
- `select` - 切换选择
- `moveEntity` - 移动实体
- `generateTextNodeInTree` - 生长节点
- `generateTextNodeRoundedSelectedNode` - 在选中节点周围生成节点
- `aboutTextNode` - 关于文本节点（分割、合并、创建等）
- `section` - Section 框相关
- `edge` - 连线相关
- `color` - 颜色相关
- `node` - 节点相关

**分组选择指南：**

- **UI 控制（`ui`）**：窗口管理、界面切换、全屏、窗口大小等
- **基础快捷键（`basic`）**：文件操作、编辑操作（撤销、重做、复制、粘贴等）
- **摄像机控制（`camera`）**：视野移动、缩放、重置等
- **应用控制（`app`）**：项目切换、模式切换等
- **文本节点相关（`aboutTextNode`）**：节点创建、分割、合并、编辑等
- **其他**：根据功能特性选择最合适的分组

**注意：** 如果快捷键不属于任何现有分组，可以：

1. 添加到最接近的现有分组
2. 创建新的分组（需要同时更新翻译文件）

### 3. 添加翻译文本

在所有语言文件中添加翻译：

- `app/src/locales/zh_CN.yml` - 简体中文
- `app/src/locales/zh_TW.yml` - 繁体中文
- `app/src/locales/en.yml` - 英文
- `app/src/locales/zh_TWC.yml` - 繁体中文（台湾）

**翻译结构：**

在 `keyBinds` 部分添加：

```yaml
keyBinds:
  keybindId:
    title: "快捷键标题"
    description: |
      快捷键的详细描述
      可以多行
      说明快捷键的功能和使用场景
```

**示例：**

```yaml
keyBinds:
  setWindowToMiniSize:
    title: 设置窗口为迷你大小
    description: |
      将窗口大小设置为设置中配置的迷你窗口宽度和高度。
```

**翻译文件位置：**

- 简体中文：`app/src/locales/zh_CN.yml`
- 繁体中文：`app/src/locales/zh_TW.yml`
- 繁体中文（台湾）：`app/src/locales/zh_TWC.yml`
- 英文：`app/src/locales/en.yml`

**注意：**

- 翻译键名（`keybindId`）必须与快捷键定义中的 `id` 完全一致
- 所有语言文件都需要添加翻译，否则会显示默认值或键名

### 4. 更新分组翻译（如果需要创建新分组）

如果创建了新的快捷键分组，需要在所有语言文件的 `keyBindsGroup` 部分添加分组翻译：

```yaml
keyBindsGroup:
  newGroupName:
    title: "新分组标题"
    description: |
      分组的详细描述
      说明该分组包含哪些类型的快捷键
```

**示例：**

```yaml
keyBindsGroup:
  ui:
    title: UI控制
    description: |
      用于控制UI的一些功能
```

## 快捷键类型详解

### 项目级快捷键（默认）

项目级快捷键需要项目上下文，`onPress` 函数会接收 `project` 参数：

```typescript
{
  id: "myKeybind",
  defaultKey: "C-k",
  onPress: (project) => {
    if (!project) {
      toast.warning("请先打开工程文件");
      return;
    }
    // 使用 project 进行操作
    project.stageManager.doSomething();
  },
}
```

### UI 级别快捷键

UI 级别快捷键不需要项目上下文，可以在没有打开项目时使用：

```typescript
{
  id: "myUIKeybind",
  defaultKey: "A-S-m",
  onPress: async () => {
    // 不需要 project 参数
    const window = getCurrentWindow();
    await window.setSize(new LogicalSize(300, 300));
  },
  isUI: true,  // 标记为 UI 级别
}
```

### 全局快捷键

全局快捷键使用 Tauri 全局快捷键系统，即使应用不在焦点也能触发：

```typescript
{
  id: "myGlobalKeybind",
  defaultKey: "CommandOrControl+Shift+G",
  onPress: () => {
    // 全局快捷键逻辑
  },
  isGlobal: true,  // 标记为全局快捷键
}
```

**注意：** 全局快捷键的键位格式与普通快捷键不同，使用 `CommandOrControl+Shift+G` 格式。

## 访问快捷键配置

在代码中访问快捷键配置：

```typescript
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";

// 获取快捷键配置
const config = await KeyBindsUI.get("keybindId");

// 修改快捷键
await KeyBindsUI.changeOneUIKeyBind("keybindId", "new-key-combination");

// 重置所有快捷键
await KeyBindsUI.resetAllKeyBinds();
```

## 注意事项

1. **快捷键 ID 命名规范：** 使用驼峰命名法（camelCase），如 `setWindowToMiniSize`
2. **唯一性：** 快捷键 ID 必须唯一，不能与现有快捷键重复
3. **默认键位：** 选择不冲突的默认键位组合
4. **类型安全：** TypeScript 会自动推断类型，确保类型一致性
5. **翻译键名：** 翻译文件中的键名必须与快捷键的 `id` 完全一致
6. **分组必须：** 所有快捷键都必须添加到 `shortcutKeysGroups` 中的相应分组，否则不会在设置页面中显示
7. **分组选择：** 根据快捷键的功能特性选择合适的分组，保持设置页面的逻辑清晰
8. **Tauri API 类型：** 使用窗口 API 时，需要使用 `LogicalSize` 或 `PhysicalSize` 类型，不能直接使用普通对象
9. **Mac 兼容性：** Mac 系统会自动将 `C-` 和 `M-` 互换，无需手动处理
10. **UI vs 项目级：** 根据快捷键是否需要项目上下文选择合适的类型

## 完整示例

假设要添加一个"设置窗口为迷你大小"的快捷键：

**1. shortcutKeysRegister.tsx - 注册快捷键：**

```typescript
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { Settings } from "@/core/service/Settings";

export const allKeyBinds: KeyBindItem[] = [
  // ... 其他快捷键
  {
    id: "setWindowToMiniSize",
    defaultKey: "A-S-m",
    onPress: async () => {
      const window = getCurrentWindow();
      // 如果当前是最大化状态，先取消最大化
      if (await window.isMaximized()) {
        await window.unmaximize();
        store.set(isWindowMaxsizedAtom, false);
      }
      // 如果当前是全屏状态，先退出全屏
      if (await window.isFullscreen()) {
        await window.setFullscreen(false);
      }
      // 设置窗口大小为设置中的迷你窗口大小
      const width = Settings.windowCollapsingWidth;
      const height = Settings.windowCollapsingHeight;
      await window.setSize(new LogicalSize(width, height));
    },
    isUI: true,
  },
  // ... 其他快捷键
];
```

**2. keybinds.tsx - 添加到分组：**

```typescript
export const shortcutKeysGroups: ShortcutKeysGroup[] = [
  // ... 其他分组
  {
    title: "ui",
    icon: <AppWindow />,
    keys: [
      "closeAllSubWindows",
      "toggleFullscreen",
      "setWindowToMiniSize",  // 添加到 UI 控制分组
      // ...
    ],
  },
  // ... 其他分组
];
```

**3. zh_CN.yml - 添加翻译：**

```yaml
keyBinds:
  setWindowToMiniSize:
    title: 设置窗口为迷你大小
    description: |
      将窗口大小设置为设置中配置的迷你窗口宽度和高度。
```

**4. 其他语言文件也需要添加相应翻译**

## 快捷键键位格式参考

**修饰键：**

- `C-` = Ctrl/Command
- `A-` = Alt/Option
- `S-` = Shift
- `M-` = Meta (macOS)

**特殊键：**

- `F1` - `F12` = 功能键
- `arrowup`, `arrowdown`, `arrowleft`, `arrowright` = 方向键
- `home`, `end`, `pageup`, `pagedown` = 导航键
- `space`, `enter`, `escape`, `tab`, `backspace`, `delete` = 特殊键

**组合示例：**

- `"C-s"` = Ctrl+S
- `"A-S-m"` = Alt+Shift+M
- `"C-A-S-t"` = Ctrl+Alt+Shift+T
- `"F11"` = F11
- `"C-F11"` = Ctrl+F11
- `"t t t"` = 连续按三次 T
- `"arrowup"` = 上方向键
- `"S-arrowup"` = Shift+上方向键

## 快捷键设置页面

快捷键添加到分组后，会在设置页面的"快捷键绑定"标签页中自动显示：

1. 用户可以在设置页面查看所有快捷键
2. 用户可以自定义快捷键键位
3. 用户可以启用/禁用快捷键
4. 用户可以重置快捷键为默认值

快捷键会自动保存到 `keybinds2.json` 文件中，并在应用重启后恢复。
