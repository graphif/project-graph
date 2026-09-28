# 当前实现与风险

复核日期：2026-09-29。范围为带有用户未提交改动的工作区，通过 Godot MCP 只读脚本接口检查；不是某个干净发布版本的保证。Godot 连接检查返回 4.8.dev6，项目为 Project Graph。

状态分为“旧文档记录”“源码确认”“运行确认”。初始复核没有运行确认项；后续主题专项运行结果见文末。未直接读取场景文件。

| 能力 | 本轮证据 | 状态与后续动作 |
| --- | --- | --- |
| 项目文件 | `ProjectFile.save/load` 使用 ZIP 中的 metadata.json、stage.json，版本 3.0.0，接受主版本 3 | 源码确认；不能据此宣称与 master 的 MessagePack 文件互通 |
| 保存失败保护 | `ProjectFile.save` 直接打开目标路径写入；`Stage.save_to_file` 直接调用它 | 源码确认风险路径；尚未实现本轮建议的临时文件替换与恢复协议，未复现故障 |
| 未知数据与引用 | `StageObjectRegistry.restore` 跳过未知类型；属性恢复跳过未登记属性；缺失引用查询可得到 null | 源码确认静默丢失风险；优先增加加载前检查与覆盖保护 |
| 对象身份与恢复 | 注册表按对象 ID 延迟解析引用；重复 ID 只登记首个对象 | 源码确认机制，重复 ID 的完整错误处理待补；不是已支持独立 Item/Occurrence |
| 连线样式 | `LineEdge` 导出颜色、线宽、箭头开关，动态计算端点 | 源码确认；旧 TODO 中“只有自动选边”已过时；交互与保存仍未运行验收 |
| 边文字 | 已读 `LineEdge` 未见文字字段 | 局部源码确认缺口；实施前检查属性入口与关联脚本，不推断整个仓库都不存在类似能力 |
| 文本与详情 | `TextNode` 有 text、外观、输入法分支及编辑事务；该类未见独立详情与来源字段 | 源码确认局部现状；独立详情和来源按规格补齐 |
| 历史 | `History` 使用前后快照，等待物理稳定或超时，并在提交时停止剩余运动 | 源码确认；连续操作、取消、容器联动未运行确认 |
| 复制粘贴 | `WorkspaceActions.copy_selection/paste` 扩展容器后代与内部连线，粘贴重建 ID 映射 | 源码确认；外部引用及新字段的复制策略需逐项验收 |
| 选区导出 | `WorkspaceActions.export_text` 从直接选中集合开始；与复制的范围展开不同 | 源码确认不一致路径，尚未运行复现；首版统一范围契约 |
| 内容搜索 | main._refresh_find 匹配 TextNode.text，含大小写和范围选项 | 源码确认；独立详情、边文字、来源搜索与导航返回待补 |
| 快速打开 | FileActions._refresh_quick 搜索打开/最近/目录索引中的 .prg 路径 | 源码确认；不是文件正文搜索，索引有上限提示 |
| 属性窗口 | main._refresh_details 展示正文和节点/连线外观 | 源码确认；TextNode/LineEdge 的导出字段尚无独立详情、关系文字或证据集合 |
| 备份 | main._backup 写入 user://backups 的独立 .prg | 源码确认手动备份；此次未发现专用恢复选择流程，不宣称已有自动备份或崩溃恢复 |
| 关联与大纲 | _refresh_references 列出关联端点；_refresh_outline 使用连通分量 | 源码确认；前者不是来源库，后者不是用户指定阅读顺序 |
| 导出预览 | _request_export 直接打开文件对话框，_export_file 调用导出器 | 源码确认；尚无阅读顺序预览和完整证据输出 |
| 关闭前保存 | _save_before_close 调用保存/另存为，_on_saved 完成后续流程 | 源码入口确认；保存失败、取消及连续关闭仍待运行验收 |
| 未完成命令 | Mermaid 生成退化为文本；扩展市场仅提示；部分 SUPPORTED 命令无主执行分支 | 源码确认入口与行为不一致；按 PRD R9 处理，未运行复现 |
| 多视图共享、AI、协作 | 调研提案 | 不作为已实现能力，也不进入首版 |

## 接下来需要补齐的证据

1. 搜索、属性、备份和关闭保存已补源码入口；仍需按任务运行验证失败与取消行为。
2. 输入、创建、删除、复制、导出对新增字段及事务的覆盖。
3. 经授权运行验收后记录环境、样例、预期、实际、日期及关联提交。

本轮读取脚本：ProjectFile、StageObjectRegistry、History、Stage、TextNode、LineEdge、WorkspaceActions、FileActions；使用 MCP 项目脚本枚举及脚本读取类别。没有修改 Godot 文件，也没有执行编辑器脚本、运行项目或测试。

## UI 一致性补充复核

通过 MCP 读取 main、LocalTheme、DialogTheme、DialogMotion、ThemeTransition、GraphPreferences。确认已有深浅主题、系统跟随配置、UI 缩放、菜单图标映射与弹窗类型变体；未确认全局视觉一致性。配色分散、焦点样式和动效覆盖等证据见 [UI 规范差异表](../design/ui-style.md)。本次未读取场景/主题资源，未运行界面验收。

用户随后确定浅色采用 Catppuccin Latte，深色采用 Mocha。内置配色已迁移到统一色板和语义角色，主题插件未实现。主题切换、显式颜色保留、默认来源标志及保存恢复已经专项验证；设置窗口仍有内部节点实例化兼容性报错，详见 [主题验证记录](../validation/theme-palette.md)。本轮使用 Godot MCP 脚本读取、创建/修改及编辑器脚本执行类别。

## 功能设计复核（2026-09-29）

本次仅通过 Godot MCP 枚举/读取脚本，补查 main、menu_catalog、file_actions、workspace_actions、stage、project_file、stage_object_registry、graph_preferences、TextNode 和 LineEdge。范围仍为带未提交改动的工作区，不代表 HEAD 发布能力。没有执行功能测试、构建或场景文本操作。取舍见 [PRD](../specs/PRD.md)，唯一任务清单见 [TODO](TODO.md)。低优先级判断是基于核心任务的产品建议，没有实际使用率证据。
