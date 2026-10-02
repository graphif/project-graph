# 画布缩放抗锯齿

粉色选中轮廓同样复用 `line_antialiasing.res`、平铺和各向异性 mipmap 过滤；宽度为 3 个视口像素的核心加透明过渡空间。避免仅开启原生 antialiased 却在 Compatibility 中仍呈阶梯边缘。闭合圆角轮廓像素回归测得 341 个半透明边缘像素。

选中描边手动验证：单击节点，分别缩放到 50%、100%、200%、400%，观察粉色圆角和斜边，再拖动节点及切换主题。应保持平滑且贴合节点，不改变节点尺寸和命中位置；重点检查圆角接缝、边缘缺口及缩小时消失。高 DPI 与其他 GPU 尚需人工确认。

## 方案

复用 Godot 的 SVG 栅格化、Image mipmap 和 Line2D 节点，并复用社区 Antialiased Line2D 的自定义 mipmap 纹理，不做整屏模糊。

- 画布节点和分组复用 SVG 栅格化的 4 倍 ImageTexture 与 mipmap，菜单保留 DPITexture。画布字体使用独立 2 倍原生字形缓存与 mipmap，视口采样固定，不随导航清空所有控件缓存。大尺寸 CJK MSDF 的首次生成成本较高，本次使用原生位图字形缓存。参见[缩放缓存验证](../validation/zoom-cache.md)。
- 连线、箭头和选中框将相机缩放计入局部几何，并抵消绘制节点的缩放，保持以视口像素为单位的绘制尺寸。当前 Compatibility 实测原生 Line2D 抗锯齿没有产生半透明边缘，因此线身改用带透明边缘的平铺纹理及各向异性 mipmap 过滤。世界坐标端点、碰撞和保存数据保持不变。
- 缩小后的连线保留至少一个视口像素的核心宽度，并给纹理透明边缘增加两个像素空间；用户保存的线宽不变。放大时曲线采样按缩放平方根增加，最多 512 段。

原生 2D MSAA 不支持当前 Compatibility 渲染器；字体 oversampling 不覆盖几何边缘。整屏 FXAA 原型会使小字变软，已撤回；全面超采样需要更大的缓冲区及额外输入适配，本次未采用。实现仅通过节点与资源属性，不调用底层绘制 API。

## 验证

在深浅主题分别创建节点、嵌套分组和斜连线，缩至 75%、50%、25%，缓慢平移。边框、箭头及选中框应比原先平滑，文字不应出现整片模糊。点击连线、双击编辑、拖动节点后，鼠标命中位置应保持准确。窗口缩放后重复检查。

自动检查覆盖缓存稳定、实际弧线像素覆盖率、缩放后的绘制尺度、世界端点不变、连线命中、文档快照不变和窗口调整。`canvas_sampling_smoke.gd` 覆盖实际 0.125 至 3.0 倍率，正常交互最大倍率的弧线区域保留超过 100 个半透明过渡像素。真实高 DPI 屏幕、非当前 GPU 及其他渲染后端仍需手动验证。

参考：[Godot 2D 抗锯齿](https://docs.godotengine.org/en/latest/tutorials/2d/2d_antialiasing.html)、[ImageTexture](https://docs.godotengine.org/en/stable/classes/class_imagetexture.html)。

## 连线纹理来源及放大回归

复用 [Antialiased Line2D](https://github.com/godot-extended-libraries/godot-antialiased-line2d) 的 `addons/antialiased_line2d/texture.gd`，固定提交 `808343e4ed29fe11162b51603f11916173a015b3`。使用其原始生成器离线生成 `assets/line_antialiasing.res`，保留 MIT 许可证 `assets/line_antialiasing-LICENSE.txt`。无需安装编辑器插件、添加自动加载或运行时生成纹理。Godot 4.8.dev6 Compatibility 实测通过；不需要外部编译器。

SHA-256：
- 上游生成器：`bceb877bd7646b1c5314d04c3c12a4d9893a734e90cbd6e29856da0a18eaa827`
- 纹理资源：`097e2b6bf2a2d65564db5ab4897ada31ffd4c1dd4591d189b630d40c1b509582`
- MIT 许可证：`e6599e16d9634b1c8846810b630b1e0c34398fe1a6e2f109f8157c18d93f4f8e`

实际透明视口中的斜线测试：原生 AA 有 0 个半透明过渡像素，纹理 AA 有 920 个。回归覆盖 25% 至 400% 缩放、深浅主题、命中几何、文档不变和连线文字编辑。

手动验证：连接两个错位节点，放大到 200% 和 400%，缓慢拖动。线身应有平滑边缘且曲线折角减少；双击线身仍能编辑文字。失败时重点检查纹理加载、过滤模式、断裂或命中偏移。此纹理处理线身长边，端帽与箭头尖端仍受原生几何栅格化限制；跨 GPU 与高 DPI 观感尚待验证。
