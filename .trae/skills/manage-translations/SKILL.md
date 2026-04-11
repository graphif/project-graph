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
├── ...         # 其他语言翻译文件
└── README.md   # 翻译系统说明
```

## 查看当前支持的语言

在添加或修改翻译前，先查看 `app/src/locales/` 目录下有哪些 `.yml` 文件：

```bash
ls app/src/locales/*.yml
```
