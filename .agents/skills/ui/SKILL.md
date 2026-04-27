---
name: ui
description: 建立于 shadcn/ui 之上的附加 UI 组件
---

# ui

## `Dialog` (`app/src/components/ui/dialog.tsx`)

- `Dialog.confirm`: 显示一个确认对话框，返回一个 Promise，用户点击确认时 resolve，点击取消时 reject。
- `Dialog.input`: 显示一个输入对话框，返回一个 Promise，用户输入内容并点击确认时 resolve，点击取消时 reject。
- `Dialog.copy`: 显示一个复制对话框，返回一个 Promise，用户关闭对话框时 resolve。
- `Dialog.buttons`: 显示一个带有自定义按钮的对话框，返回一个 Promise，用户点击任意按钮时 resolve，参数为被点击按钮的 `id`。

## `toast()` (`import { toast } from "sonner"`)

- `toast`: 显示一个通用的、info 类型的 toast 消息，参数为消息内容，尽量不要使用此函数，推荐使用下面的 `toast.success()` 等方法。
- `toast.success`: 显示一个成功类型的 toast 消息，参数为消息内容。
- `toast.error`: 显示一个错误类型的 toast 消息，参数为消息内容。
- `toast.warning`: 显示一个警告类型的 toast 消息，参数为消息内容。
- `toast.promise`: 见下面的示例代码。

```ts
await toast
  .promise(
    async () => {
      // 异步操作
    },
    {
      loading: "promise进行中的提示",
      success: "resolve后的提示",
      error: "reject后的提示",
    },
  )
  // unwrap方法会直接把传入的promise返回出来
  .unwrap();
```
