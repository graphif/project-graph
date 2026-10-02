# 直接移植 master 的分组预览视觉

用户明确要求完全采用 master 的视觉，替换此前自定义的顶部标签和卡片设计。参考 master 的 SectionRenderer.renderBigCoveredTitle/renderNoCollapse、TextRenderer.getFontSizeByRectangleSize、Settings 与 Catppuccin 舞台色值。默认 cover，遮罩透明度 .5，文字居中，字号按文字宽高比与矩形尺寸计算，留白比例 .9，最大字号为最长边的 .8；分组边框固定两屏幕像素，圆角为八世界单位随缩放变化。文字按 master colorInvert 的加权亮度规则选纯黑或纯白，边框直接使用 master 的主题色。

标准库与复用评估：复用 Godot Label、Font 的原生测量、Panel/StyleBoxFlat 与已有字体缓存、Corners 原生资源缓存；将 master 的现有尺寸公式移植到 Godot 节点，不新增排版或布局依赖。保留已有直接下一层的内容抽象和原生连接，维护已有编辑、物理、历史与保存规则。取消自定义色标、 raised 底色、顶部标签、标题钉边错位与省略。

通过 Godot MCP 修改/创建脚本并执行原生测试。master_preview_visual_smoke 在此前自定义样式上失败，移植后通过，覆盖居中、字号适配、半透明、明暗主题、边框与编辑；group_overview、next_layer_preview、canvas_antialiasing、progressive_loading 及四实文件四档缩放通过，已检查截图。旧顶部标题和贴边错位测试由 master 视觉回归取代。用户随后补充预览应保持可见圆角并减少框体重合，另作独立调整。安装与用户手动验收尚待完成。用户手动验收：重新启动安装版，打开教程操作、快捷键教程并缩小。分组标题应居中覆盖框内，背景半透明，字号随框尺寸变化；下一层标题与连接仍能显示，放大恢复原图。失败时检查顶部色标或卡片是否残留、标题不居中、填色透明度不正确或保存位置变化。
