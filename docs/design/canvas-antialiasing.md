# 画布缩小抗锯齿

## 方案

复用 Godot 的 SVG 栅格化、Image mipmap、Line2D / Polygon2D 抗锯齿，不引入第三方依赖，不做整屏模糊。

- 舞台圆角纹理按 4 倍逻辑尺寸生成 mipmap，采用三线性过滤。逻辑尺寸、九宫格边距和文字布局不变。菜单继续使用 DPITexture。
- 连线、箭头和选中框将相机缩放计入局部几何，并抵消绘制节点的缩放，使原生抗锯齿过渡保持一个视口像素，不再随画布缩小。世界坐标端点、碰撞和保存数据保持不变。
- 缩小后的连线保持至少一个视口像素宽；用户保存的线宽不变。

原生 2D MSAA 不支持当前 Compatibility 渲染器；字体 oversampling 不覆盖几何边缘。整屏 FXAA 原型会使小字变软，已撤回；全面超采样需要更大的缓冲区及额外输入适配，本次未采用。实现仅通过节点与资源属性，不调用底层绘制 API。

## 验证

在深浅主题分别创建节点、嵌套分组和斜连线，缩至 75%、50%、25%，缓慢平移。边框、箭头及选中框应比原先平滑，文字不应出现整片模糊。点击连线、双击编辑、拖动节点后，鼠标命中位置应保持准确。窗口缩放后重复检查。

自动检查覆盖 mipmap 生成、缩放后的绘制尺度、世界端点不变、连线命中、文档快照不变和窗口调整。真实高 DPI 屏幕、非当前 GPU 及其他渲染后端仍需手动验证。

参考：[Godot 2D 抗锯齿](https://docs.godotengine.org/en/latest/tutorials/2d/2d_antialiasing.html)、[ImageTexture](https://docs.godotengine.org/en/stable/classes/class_imagetexture.html)。
