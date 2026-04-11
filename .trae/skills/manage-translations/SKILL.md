---
name: manage-translations
description: "指导如何在 Project Graph 项目中管理多语言翻译。当需要添加新翻译、更新现有翻译或了解翻译系统结构时使用此技能。"
---

# 管理翻译

本技能指导如何在 Project Graph 项目中管理多语言翻译。

## 翻译文件位置

所有翻译文件位于 `app/src/locales/` 目录下：

```
app/src/locales/
├── en.yml      # 英文
├── id.yml      # 印度尼西亚语
├── zh_CN.yml   # 简体中文
├── zh_TW.yml   # 繁体中文
├── zh_TWC.yml  # 接地气繁体中文
└── README.md   # 翻译系统说明
```

## 查看当前支持的语言

在添加或修改翻译前，先查看 `app/src/locales/` 目录下有哪些 `.yml` 文件：

```bash
ls app/src/locales/*.yml
```

## 添加新翻译

### 1. 确定翻译键名

翻译使用层级结构，通常按功能模块组织：

```yaml
# 基本结构
moduleName:
  featureName:
    title: "标题文本"
    description: "描述文本"
```

### 2. 在所有语言文件中添加

为每个 `.yml` 文件添加对应的翻译。例如添加一个设置项的翻译：

**zh_CN.yml:**

```yaml
settings:
  enableNewFeature:
    title: "启用新功能"
    description: "开启后将启用新功能特性"
    options:
      option1: "选项一"
      option2: "选项二"
```

**en.yml:**

```yaml
settings:
  enableNewFeature:
    title: "Enable New Feature"
    description: "Enable to activate the new feature"
    options:
      option1: "Option 1"
      option2: "Option 2"
```

**其他语言文件同理...**

### 3. 翻译内容规范

- **title**: 简短标题，3-10个字
- **description**: 详细描述，可以包含多行（使用 `|`）
- **options**: 仅枚举类型需要，列出所有选项的显示文本

## 翻译使用方式

### 在代码中使用

```typescript
import i18next from "i18next";

// 简单翻译
const title = i18next.t("settings.enableNewFeature.title");

// 带参数的翻译
const message = i18next.t("common.deleted", { count: 5 });

// 指定命名空间（如 keyBinds）
const keyBindTitle = i18next.t("saveFile.title", { ns: "keyBinds", defaultValue: "" });
```

### 在 React 组件中使用

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();

  return <div>{t("settings.enableNewFeature.title")}</div>;
}
```

## 添加新语言

1. 在 `app/src/locales/` 目录下创建新的 `.yml` 文件
2. 复制现有语言文件（如 `en.yml`）作为模板
3. 将所有值翻译为目标语言
4. 在语言配置中添加新语言（如有语言选择功能）

## 注意事项

1. **保持键名一致**: 所有语言文件中的键名必须完全一致
2. **不要遗漏**: 添加新翻译时，确保为所有语言文件都添加
3. **使用英文作为后备**: 如果某个翻译缺失，系统会回退到英文
4. **参数占位符**: 使用 `{{paramName}}` 语法添加可变参数
5. **多行文本**: 使用 `|` 符号表示多行文本
