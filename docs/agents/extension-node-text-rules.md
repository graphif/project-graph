# 扩展问题与结论规则接口

扩展先调用 `prg.capabilities_get()`，检查 `nodeTextRules === 1`。缺少能力的版本应显示升级提示并停止注册。

`prg.nodeTextRules_register(options)` 注册当前扩展拥有的同步文字规则。选项包括 enabled、numbering、frameTitles，以及 questionColor 和 conclusionColor 两个 RGB 整数三元组。RGB 范围为 0 至 255。只允许一个扩展拥有这组规则，同一扩展可重复调用以更新配置。

识别规则由扩展提供 questionSuffixes、conclusionPrefixes 和 statusPrefixes 字符串数组。输入转换使用 conclusionShortcut 和 conclusionReplacement，查找命令使用 questionQuery 和 conclusionQuery。匹配字符串不能留空，宿主限制数组数量和字符串长度。扩展负责提供中文标记、任务状态优先级及配置界面。

宿主在测量和绘制文字时使用显示编号，在 StageManager.add 时为新建文本节点记录创建顺序。历史节点缺少该可选字段时不补时间。各工程独立编号，问题和结论各从 1 开始。编号不写入原文。

例如问题与结论扩展可配置问号后缀、结论前缀和 /jl 输入转换，并把 ✅ 和 ❌ 配为优先排除的状态前缀，以配合 Task Arrange 与文本节点 TODO List 使用。中文标记均来自扩展配置。

启用框标题规则时，框内第一个未完成问题命名仍未命名的框。通过 rename 手动编辑过的标题受保护，包括手动清空。已自动命名过的框不再次覆盖。已有明确标题的历史框也受保护。

非正则查找支持 /问题 和 /结论，遵循现有查找范围。

`prg.nodeTextRules_unregister()` 只移除调用扩展的注册。ExtensionRuntime.terminate 会自动清理该扩展的注册，并重新测量显示文字。原文、状态颜色、已保存的创建记录和已确认的框标题保留。

扩展的开关界面和自身配置由扩展实现，宿主接口不会改写全局设置或注册任务快捷键。
