---
name: create-setting-item
description: 指导如何在 Project Graph 项目中创建新的设置项。当用户需要添加新的设置项、配置选项或需要了解设置系统的实现方式时使用此技能。
---

# 创建新的设置项功能

本技能指导如何在 Project Graph 项目中创建新的设置项。

## 创建设置项的步骤

创建新设置项需要完成以下 5 个步骤：

### 1. 在 Settings.tsx 中添加 Schema 定义

在 `app/src/core/service/Settings.tsx` 文件的 `settingsSchema` 对象中添加新的设置项定义。

**支持的 Zod 类型：**

- `z.boolean().default(false)` - 布尔值开关
- `z.number().min(x).max(y).default(z)` - 数字（可添加 `.int()` 限制为整数）
- `z.string().default("")` - 字符串
- `z.union([z.literal("option1"), z.literal("option2")]).default("option1")` - 枚举选择
- `z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0,0,0,0])` - 元组（如颜色 RGBA）

**示例：**

```typescript
// 布尔值设置
enableNewFeature: z.boolean().default(false),

// 数字范围设置（带滑块）
newSliderValue: z.number().min(0).max(100).int().default(50),

// 枚举选择设置
newMode: z.union([z.literal("mode1"), z.literal("mode2")]).default("mode1"),
```

### 2. 在 SettingsIcons.tsx 中添加图标

在 `app/src/core/service/SettingsIcons.tsx` 文件的 `settingsIcons` 对象中添加对应的图标。

**步骤：**

1. 从 `lucide-react` 导入合适的图标组件
2. 在 `settingsIcons` 对象中添加映射：`settingKey: IconComponent`

**示例：**

```typescript
import { NewIcon } from "lucide-react";

export const settingsIcons = {
  // ... 其他设置项
  enableNewFeature: NewIcon,
};
```

### 3. 添加翻译文本

在所有语言文件中添加翻译：

- `app/src/locales/zh_CN.yml` - 简体中文
- `app/src/locales/zh_TW.yml` - 繁体中文
- `app/src/locales/en.yml` - 英文
- `app/src/locales/zh_TWC.yml` - 接地气繁体中文
- `app/src/locales/id.yml` - 印度尼西亚语

**翻译结构：**

```yaml
settings:
  settingKey:
    title: "设置项标题"
    description: |
      设置项的详细描述
      可以多行
    options: # 仅枚举类型需要
      option1: "选项1显示文本"
      option2: "选项2显示文本"
```

**示例：**

```yaml
settings:
  enableNewFeature:
    title: "启用新功能"
    description: |
      开启后将启用新功能特性。
      此功能可能会影响性能。
  newMode:
    title: "新模式"
    description: "选择新的模式选项"
    options:
      mode1: "模式一"
      mode2: "模式二"
```

### 4. 将设置项添加到分组中

在 `app/src/sub/SettingsWindow/settings.tsx` 文件的 `categories` 对象中，将新设置项的键名添加到相应的分组数组中。

**分组结构：**

```typescript
const categories = {
  visual: {           // 一级分类：视觉
    basic: [...],     // 二级分组：基础
    background: [...], // 二级分组：背景
    node: [...],      // 二级分组：节点样式
    // ...
  },
  automation: {       // 一级分类：自动化
    autoNamer: [...],
    autoSave: [...],
    // ...
  },
  control: {         // 一级分类：控制
    mouse: [...],
    cameraMove: [...],
    // ...
  },
  performance: {     // 一级分类：性能
    memory: [...],
    cpu: [...],
    // ...
  },
  ai: {              // 一级分类：AI
    api: [...],
  },
};
```

**添加设置项到分组：**

```typescript
const categories = {
  visual: {
    basic: [
      "language",
      "isClassroomMode",
      "enableNewFeature", // 添加新设置项
      // ...
    ],
  },
  // ...
};
```

**分组选择指南：**

- **visual（视觉）**：界面显示、主题、背景、节点样式、连线样式等
  - `basic`: 基础视觉设置
  - `background`: 背景相关设置
  - `node`: 节点样式设置
  - `edge`: 连线样式设置
  - `section`: Section 框的样式设置
  - `entityDetails`: 实体详情面板设置
  - `debug`: 调试相关设置
  - `miniWindow`: 迷你窗口设置
  - `experimental`: 实验性视觉功能
- **automation（自动化）**：自动保存、自动备份、自动命名等
  - `autoNamer`: 自动命名相关
  - `autoSave`: 自动保存相关
  - `autoBackup`: 自动备份相关
  - `autoImport`: 自动导入相关
- **control（控制）**：鼠标、键盘、触摸板、相机控制等
  - `mouse`: 鼠标相关设置
  - `touchpad`: 触摸板设置
  - `cameraMove`: 相机移动设置
  - `cameraZoom`: 相机缩放设置
  - `objectSelect`: 对象选择设置
  - `textNode`: 文本节点编辑设置
  - `edge`: 连线操作设置
  - `generateNode`: 节点生成设置
  - `gamepad`: 游戏手柄设置
- **performance（性能）**：内存、CPU、渲染性能相关
  - `memory`: 内存相关设置
  - `cpu`: CPU 相关设置
  - `render`: 渲染相关设置
  - `experimental`: 实验性性能功能
- **ai（AI）**：AI 相关设置
  - `api`: AI API 配置

**注意：** 如果设置项不属于任何现有分组，可以：

1. 添加到最接近的现有分组
2. 在相应分类下创建新的分组（需要同时更新翻译文件中的分类结构）

### 5. 在设置页面中使用 SettingField 组件

设置项添加到分组后，会在设置页面的相应分组中自动显示。如果需要手动渲染或添加额外内容，可以使用 `SettingField` 组件：

**基本用法：**

```tsx
import { SettingField } from "@/components/ui/field";

<SettingField settingKey="enableNewFeature" />;
```

**带额外内容的用法：**

```tsx
<SettingField settingKey="enableNewFeature" extra={<Button>额外按钮</Button>} />
```

**注意：** 大多数情况下，只需要将设置项添加到 `categories` 中即可，设置页面会自动渲染。只有在需要特殊布局或额外功能时才需要手动使用 `SettingField` 组件。

## SettingField 组件的自动类型推断

`SettingField` 组件会根据 schema 定义自动渲染对应的 UI 控件：

- **字符串类型** → `Input` 输入框
- **数字类型（有 min/max）** → `Slider` 滑块 + `Input` 数字输入框
- **数字类型（无范围）** → `Input` 数字输入框
- **布尔类型** → `Switch` 开关
- **枚举类型（Union）** → `Select` 下拉选择框

## 访问设置值

在代码中访问设置值：

```typescript
import { Settings } from "@/core/service/Settings";

// 读取设置值
const value = Settings.enableNewFeature;

// 修改设置值
Settings.enableNewFeature = true;

// 监听设置变化（返回取消监听的函数）
const unsubscribe = Settings.watch("enableNewFeature", (newValue) => {
  console.log("设置已更改:", newValue);
});

// React Hook 方式（在组件中使用）
const [value, setValue] = Settings.use("enableNewFeature");
```

## 注意事项

1. **设置项键名命名规范：** 使用驼峰命名法（camelCase），如 `enableNewFeature`
2. **默认值：** 所有设置项都必须提供默认值（`.default()`）
3. **类型安全：** TypeScript 会自动推断类型，确保类型一致性
4. **持久化：** 设置值会自动保存到 `settings.json` 文件中
5. **翻译键名：** 翻译文件中的键名必须与设置项的键名完全一致
6. **图标可选：** 如果不需要图标，可以不在 `settingsIcons` 中添加，组件会使用 Fragment
7. **分组必须：** 所有设置项都必须添加到 `categories` 对象中的相应分组，否则不会在设置页面中显示
8. **分组选择：** 根据设置项的功能特性选择合适的分类和分组，保持设置页面的逻辑清晰

## 完整示例

假设要添加一个"启用暗色模式"的设置项：

**1. Settings.tsx:**

```typescript
export const settingsSchema = z.object({
  // ... 其他设置项
  enableDarkMode: z.boolean().default(false),
});
```

**2. SettingsIcons.tsx:**

```typescript
import { Moon } from "lucide-react";

export const settingsIcons = {
  // ... 其他设置项
  enableDarkMode: Moon,
};
```

**3. zh_CN.yml:**

```yaml
settings:
  enableDarkMode:
    title: "启用暗色模式"
    description: "开启后将使用暗色主题界面"
```

**4. settings.tsx - 添加到分组：**

```typescript
const categories = {
  visual: {
    basic: [
      "language",
      "isClassroomMode",
      "enableDarkMode", // 添加到基础视觉设置分组
      // ...
    ],
    // ...
  },
  // ...
};
```

**5. 设置项会自动显示：**
设置项添加到 `categories` 后，会在设置页面的"视觉 > 基础"分组中自动显示，无需手动使用 `SettingField` 组件。

## 快捷设置栏支持

如果希望设置项出现在快捷设置栏（Quick Settings Toolbar）中，需要：

1. 确保设置项已正确创建（完成上述 4 步）
2. 快捷设置栏会自动显示所有布尔类型的设置项
3. 可以通过 `QuickSettingsManager.addQuickSetting()` 手动添加非布尔类型的设置项
