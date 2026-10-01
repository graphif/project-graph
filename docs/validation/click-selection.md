# 点击选择修饰键

2026-10-02：按用户要求，Shift+单击追加多选，Ctrl+单击强制只选当前节点（macOS 同时支持 Cmd）。Ctrl 优先于 Shift；Shift 重复点击不会取消选中。普通点击已选节点仍保留多选，以便拖动整个选区。

新增 Stage.select_object_from_click，供 Entity 原生碰撞/Label 输入、分组预览、连线及关系标签共用。既有程序调用 select_object 的增减选中语义保持不变，空白处框选保持原有操作规则。应用内快速入门、节点帮助及设计操作表同步更新。复用 Godot InputEventMouseButton、PackedStringArray 和现有选区接口，不需要第三方通用库或新依赖。使用 Godot MCP 脚本读写及编辑器脚本执行工具。

click_selection_smoke 通过原生 Input.parse_input_event 驱动真实节点 Label 和分组预览 GUI 输入，覆盖 Shift 追加/重复点击、Ctrl 对已选及未选节点的独占选择、组合键优先级、Cmd 和普通点击保留多选。修复前对应断言失败，修改后通过。group_overview、local_drag_physics、edge_caption、help_theme 回归通过。

待用户手动验证：单击 A，Shift+单击 B，应同时选中；再 Shift+单击 B 应继续多选；Ctrl+单击 A 应只剩 A。Ctrl+Shift+单击 B 应只选 B。缩小后对分组预览重复操作，再尝试多选拖动。失败重点检查是否误取消已选节点、隐藏成员是否抢走输入、拖动是否只带走一个节点。文字编辑中的 Shift/Ctrl 仍由原生 TextEdit 处理，实际键盘及 IME 操作尚待手动确认。
