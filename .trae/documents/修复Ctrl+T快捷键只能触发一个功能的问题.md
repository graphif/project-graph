## 问题分析

1. **现象**：用户按下Ctrl+T快捷键时，只有一个功能被触发，而不是三个绑定了该快捷键的功能都被触发
2. **原因**：在`KeyBindsUI.tsx`的`check`函数中，当第一个匹配的快捷键执行后，会立即调用`userEventQueue.clear()`清空事件队列，导致后续绑定了相同快捷键的功能无法匹配到事件
3. **涉及文件**：
   - `app/src/core/service/controlService/shortcutKeysEngine/KeyBindsUI.tsx` - 快捷键处理核心逻辑
   - `app/src/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister.tsx` - 快捷键注册定义

## 解决方案

修改`KeyBindsUI.tsx`中的`check`函数，调整事件队列清空的时机，确保所有匹配的快捷键都能被执行：

1. 移除在单个快捷键执行后立即清空队列的逻辑
2. 收集所有匹配的快捷键，执行完所有匹配的快捷键后再清空队列
3. 或者保持队列清空逻辑，但确保每个快捷键都能检查到匹配的事件

## 具体修改步骤

1. 打开`KeyBindsUI.tsx`文件
2. 修改`check`函数，将`userEventQueue.clear()`移到所有快捷键检查完成之后
3. 确保所有匹配的快捷键都能被执行
4. 测试修改效果，确认按下Ctrl+T时三个功能都能被触发

## 预期效果

- 按下Ctrl+T时，会依次执行：
  - `folderSection` - 切换/折叠章节
  - `reverseEdges` - 反转选中的边
  - `reverseSelectedNodeEdge` - 反转选中节点的边
- 所有绑定了相同快捷键的功能都能正常触发
- 不影响其他快捷键的正常工作
