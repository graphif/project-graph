# 缩小后的文字与最小边框

本次实现补足普通文本节点及容器边框的最小宽度：原样式边框不足一个视口像素时，场景中的 `MinimumBorder` Line2D 使用逆画布变换绘制一像素核心，透明抗锯齿过渡另计。复用现有连续圆角轮廓和 `assets/line_antialiasing.res`，不改变节点尺寸、碰撞、序列化或历史。采样倍率向下分档，档间核心只会略增，不会小于一像素；隐藏的分组详情沿用原可见层控制。节点背景和内容边距仍归原样式管理。

节点显示文字、编辑文字、连线文字和分组预览标题使用原生 mipmap 过滤。原来的节点字形缓存已生成 mipmap，但 Label/TextEdit 显式使用普通线性过滤，没有消费缩小采样缓存。预览标题同时启用字体 mipmap。保留固定字形采样与固定视口采样，避免导航时清空整个文档的字体缓存。

复用评估：Godot 原生 FontFile 的 generate_mipmaps 与 CanvasItem 的 TEXTURE_FILTER_LINEAR_WITH_MIPMAPS 已覆盖字体缩小采样；Line2D 加现有社区抗锯齿纹理覆盖细轮廓。只新增节点适配脚本，无新增第三方依赖。相关说明见 [FontFile](https://docs.godotengine.org/en/latest/classes/class_fontfile.html)、[CanvasItem](https://docs.godotengine.org/en/latest/classes/class_canvasitem.html) 与[现有纹理来源](../design/canvas-antialiasing.md)。文字整体小于几个像素时，过滤可以改善覆盖连续性，不能恢复被缩掉的字形细节；本次不承诺每个文字笔画都保持一像素实体宽度。

## 待执行验证

用户随后明确授权运行检查及提交。下列人工验证仍未执行；真实 GPU、高 DPI 和截图中的原文件尚需复核。

1. 重新启动修改后的项目，打开截图中的文件，使用捏合或 Ctrl+滚轮逐步缩小到界面 25%、12.5%、6.25% 和最小倍率；缓慢平移，并往返放大。
2. 普通节点框、容器框应保持连续细线，至少一个视口像素核心；小字应减少碎片状闪烁。大字及正常倍率下的边框应保留原外观。
3. 切换深浅主题，选择节点、双击编辑、拖动、撤销/重做，进入和退出分组预览。应保持边框配色、圆角、输入位置及命中准确；预览隐藏的详情不应透出补偿边框。
4. 若失败，重点检查最低倍率及平移时断线、文字随像素位置消失、容器标题多出框、圆角偏移、隐藏详情透出和缩放卡顿。记录主题、实际倍率、GPU、窗口缩放及截图。

## 已执行检查

通过 Godot MCP 编辑器脚本启动 Xvfb/X11 的 Godot 4.8.dev6 Compatibility / Mesa llvmpipe，测试带超时并清理进程。通过：

- `minimum_screen_border_smoke.gd`：实际倍率 0.02–2.0、四个亚像素位置的普通边框像素覆盖，世界几何不变；细竖线文字四相位的最小/最大覆盖比例从普通过滤的约 0.60 提高到 mipmap 的约 0.77。该指标说明采样更稳定，不表示极小文字仍可读。
- `canvas_sampling_smoke.gd`：固定视口/字体缓存，最大正常倍率圆角区域 470 个半透明过渡像素。
- `text_edit_geometry_smoke.gd`、`pingfang_font_smoke.gd`。
- Godot `--check-only` 编译本次新增脚本、像素测试、TextNode 和 EdgeCaption；新增脚本缩进/尾空白检查及本次修改的 `git diff --check`。

工作区同时存在独立的分组预览编辑。为检查本次提交内容，在测试子进程的内存中使用 HEAD 的 GroupOverview 加本次两个字体采样改动，保留磁盘上的其他编辑：`canvas_antialiasing_smoke.gd` 通过，斜线/选中框分别测得 2400/2226 个过渡像素。完整当前工作区运行该测试时会因其他预览编辑而失败和超时。

`node_border_smoke.gd` 的四个颜色刷新断言失败；HEAD 的 TextNode/GroupOverview 内存基线同样失败。`group_overview_smoke.gd` 在上述隔离场景仍有 24 个交互/嵌套预览断言失败，HEAD 内存基线具有相同的 24 个失败。本次不修改这些既有行为，也不将这些检查记为通过。临时内存覆盖脚本已清理。

未执行发布导出或大文档 `zoom_frame_benchmark.gd`；容器实际像素覆盖、细笔画文字的视觉效果与导航性能仍需人工复核。
