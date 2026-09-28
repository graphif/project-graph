# 连续圆角

## 实现选择

统一节点、菜单、Dock 与弹窗的曲线风格，保留原生 Control、Theme、焦点和输入处理。

- `StyleBoxFlat`：适合普通圆弧和细线；`corner_detail` 只控制细分，不提供连续曲率形状。
- `ColorRect + Shader`：适合独立背景，但不能直接覆盖原生菜单样式，也不自动裁剪子节点。示例中的隐式函数并非精确距离场，不能直接用于等宽描边。
- 采用 Godot 自带 `StyleBoxTexture + DPITexture`：通过 SVG 曲线与描边生成九宫格样式，复用引擎的布局、栅格化、主题缩放和描边实现。无需第三方依赖。保留源 StyleBoxFlat 参数供换色和读取，不直接调用底层绘制 API。

每个角用两段对称三次贝塞尔曲线近似连续圆角；直线连接处曲率为零，角部中点切线与曲率连续。这是项目自己的近似轮廓，不宣称复现 Apple 私有公式。选中框和拖拽预览采样同一条曲线。

画布节点和连线文字的九宫格改用 4 倍栅格化、带 mipmap 的 ImageTexture，以支持相机缩小；界面菜单继续使用 DPITexture。见[画布抗锯齿](canvas-antialiasing.md)。

## 尺寸规则

| 用途 | 圆角区域（逻辑像素） |
| --- | ---: |
| 按钮、输入框、菜单项、连线文字 | 12 |
| 节点、分组、列表面板 | 18 |
| 菜单外框、Dock、弹窗 | 24 |

零圆角的分隔线、页签下划线和细滚动条保持原本用途。九宫格保留原有内容边距；圆角不改变文档数据。小控件的角部由引擎按尺寸收缩。填色、边框和阴影共用轮廓；节点边框仍使用自动对比灰度。

## 手动验收

1. 新建节点及嵌套分组，选中、拖动、双击编辑；背景、边框、选中与拖拽预览应贴合，编辑时文字不跳位。
2. 打开文件菜单、设置、命令面板及文件 Dock；观察四角，不应出现方形底色、黑色碎角或文字被裁切。
3. 切换 Mocha / Latte，调整界面缩放与画布缩放；确认边框等宽、焦点可见、颜色正确，没有明显锯齿或发虚。
4. 特别检查小尺寸按钮、长菜单与滚动列表，确保圆角不会挤掉内容或改变点击行为。

## 本次验证记录

Godot 4.8.dev6 当前工作区：连续圆角、画布文本焦点、连线文字、自动节点边框、分层透明度和主题配色检查通过。已检查深浅主题截图，覆盖菜单、Dock、设置、命令面板和画布 50% / 100% / 200% 缩放。

基础交互检查另发现现有 ColorWindow 场景缺少脚本要求的 `ColorRow/Hex`，未通过；本次未将其描述为圆角回归通过。真实输入法、其他操作系统和高 DPI 显示器仍需手动验证。字体缺少部分简体字导致的系统回退是独立问题，不属于圆角修复。

参考：[StyleBoxTexture](https://docs.godotengine.org/en/stable/classes/class_styleboxtexture.html)、[DPITexture](https://docs.godotengine.org/en/stable/classes/class_dpitexture.html)、[Apple continuous corners](https://developer.apple.com/documentation/swiftui/roundedcornerstyle/continuous)。
