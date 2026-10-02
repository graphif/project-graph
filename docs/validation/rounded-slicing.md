# 切片保留圆角

切片动画之前从矩形碰撞框取多边形，导致文字节点原有圆角变成直角。现在只在生成临时碎片时使用 TextNode 的可见轮廓；碰撞检测、删除事务和历史行为不变。分组使用当前预览轮廓和容器样式。

复用项目的 continuous_corners 和 Godot 原生 Geometry2D.intersect_polygons（https://docs.godotengine.org/en/stable/classes/class_geometry2d.html#class-geometry2d-method-intersect-polygons）。无需新增依赖；内部终点的四个扇区与圆角轮廓求交，避免按每个圆弧采样点生成大量小碎片。碎片仍由 Polygon2D、Line2D 节点组成。

通过 Godot MCP 的脚本修改、原生文件读取、编辑器脚本执行工具完成。授权的独立 Godot 进程运行 tests/slice_rounded_smoke.gd：修复前圆角和面积断言失败，修复后通过。覆盖横穿的两片、内部终点的四片、可见区域与面积、临时节点不进入快照及动画结束清理；图像 /tmp/pg-rounded-slice.png。

手动验证（尚需在安装版本完成）：打开带填色的圆角文字节点，开启特效，从空白处按住切割按钮斜穿节点；外边缘应保持圆角，切口是直线。切到内部应生成四片并自动消失。失败时检查外侧是否出现矩形尖角、是否出现几十片小碎片，以及撤销是否一次恢复节点和关联线。
