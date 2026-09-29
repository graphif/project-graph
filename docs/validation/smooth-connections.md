# 连线平滑度

## 实现选择

复用 Godot 内置 Curve2D 自适应贝塞尔细分、Line2D 圆角连接和原生抗锯齿；不引入第三方曲线库或自行实现通用细分算法。现有 4 度角容差使长弯曲边的折线段较明显。将角容差收紧并随采样档位提高精度，保留直线的少量顶点、几何缓存及现有端点/箭头语义。先验证几何误差与实际帧率，再决定是否需要调整纹理。

## 手动验证（待执行）

在浅色分组中连接黑色细线及白色曲线，连续放大、缩小并拖动端点。弯曲段应连续，箭头和线身之间无断口，命名块和右键选中区域跟随曲线；重点检查折角、锯齿、缩放闪烁和帧率下降。

## 最终改动与验证

- 自适应曲线角容差从 4 度收紧为 0.1 度，并随放大采样档位继续收紧；最大递归深度受限，直线仍仅使用少量顶点。
- 旧 256×256 纹理只有最外一行透明像素，屏幕上的渐变几乎消失。改用 Godot GradientTexture2D，边缘保留约一个屏幕像素的透明过渡；按四分之一像素线宽共享缓存，最多 256 项。无需全画布超采样。
- 已核查 [Godot 2D 抗锯齿文档](https://docs.godotengine.org/en/latest/tutorials/2d/2d_antialiasing.html) 和社区 [Antialiased Line2D](https://github.com/godot-extended-libraries/godot-antialiased-line2d)。现有项目已有 Line2D 纹理绘制路径，因此复用内置 GradientTexture2D 即可，不另引入插件。
- MCP 脚本读取、修改、创建、编辑器脚本执行工具完成实现和运行。没有文本读取或编辑场景文件。
- `smooth_connections_smoke` 对长线、陡弯和短线，在 0.25–8 倍缩放下对照 1024 段曲线验证屏幕误差不超过 0.35 像素；直线稀疏性、共享纹理及透明渐变通过。
- `arrow_geometry_smoke`、`navigation_cache_smoke`、`connection_continuity_smoke`、`edge_caption_magnet_smoke` 通过。已查看前后图形截图。
- 同机 119.96 Hz 屏幕、1280×800、X11、垂直同步、源码运行基准：平移 119.36 FPS，缩放 119.72 FPS；p95 分别 9.457 ms、9.522 ms。不是任意文档的帧率保证。
