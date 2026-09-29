# 连线标签：整体颜色与磁性避让

日期：2026-09-29。实现和专项自动回归已完成，原生 IME 与真实手动拖动尚待用户确认。

## 行为

- 关系名称仍是 LineEdge 的子节点，沿曲线定位，不创建独立持久化文本节点。标签、线段和箭头共用一个选择对象、颜色字段与历史操作。
- 右键标签或线段选择所属连线，打开现有上下文菜单；颜色管理更新整条连线。标签底色和边框使用连线的实际显示颜色，文字和光标选择高对比黑色或白色：白线为白块黑字，黑线为黑块白字。自动主题色随背景变化，用户显式颜色保留。
- 场景新增直接属于 LineEdge 刚体的 `CaptionCollision`，形状为 `RectangleShape2D`。碰撞矩形跟随标签位置和实际编辑尺寸，空标签不参与避让。
- 复用现有 NodeRepulsion 的世界坐标宽阶段筛选、磁力和六轮约束。标签约束把推力按曲线位置分配到端点，让节点腾出文字空间；共享端点的作用相互抵消后再求解，受控/冻结实体不会被强行移动。相反方向的连线按稳定 ID 分配不同的曲线位置，避免两个名称都卡在中点。
- 容器和后代仍不互相排斥；共同容器中的节点、标签可以互相避让。物理关闭或无编辑事务时不改动布局，保存、撤销、重做沿用现有事务与引用恢复。所有可移动参与者都被冻结时，不能靠磁力强行分开。

## 复用与文件

使用 Godot 内置 [RectangleShape2D](https://docs.godotengine.org/en/stable/classes/class_rectangleshape2d.html)、Rect2、Curve2D、Dictionary 和项目已有的 NodeRepulsion、History、StageObjectRegistry、颜色管理。通用布局库 Graphviz/ELK 不能替代这里的逐物理帧交互约束，不引入额外运行时；本次只扩展已有求解器的对象适配，没有新建通用物理或文本库。

实际修改：`node_repulsion.gd`、`line_edge.gd`、`edge_caption.gd`、LineEdge 场景；新增 `edge_caption_magnet_smoke.gd`。注册表没有新增类型，标签名称和颜色继续保存于 LineEdge 的原有导出属性。文本交互共用 AutoSizeTextEdit，详见 [输入验证](canvas-editing.md)。

Godot 文件全程使用 MCP 脚本读取/修改/创建和编辑器脚本执行类别。场景通过 PackedScene/ResourceSaver 修改并绕过过期资源缓存，不读取或编辑场景文本。

## 已执行验证

Godot 4.8.dev6，Linux Wayland，Compatibility。独立图形进程使用隔离目录 `/tmp/pg-caption-validation-data`，运行设置超时。

- `edge_caption_magnet_smoke.gd` 通过：端点与标签分离、反向标签分离、同容器第三节点避让、标签命中所属边、真实输入分发下右键标签和线段、整条连线改色、深浅主题保持显式颜色、白块黑字/黑块白字及编辑态对比、颜色撤销/重做、保存重开、删除端点及撤销恢复。
- `node_repulsion_smoke.gd` 通过：既有实体避让、冻结/拖动/投掷约束、关闭物理和已删除对象清理。
- `edge_caption_smoke.gd`、`text_edit_geometry_smoke.gd`、`canvas_text_focus_smoke.gd` 通过：连续输入、完整显示、统一编辑交互与选择层级。
- 图形产物 `/tmp/pg-caption-magnet.png`；数据往返使用 `/tmp/pg-caption-magnet.prg`，均为临时测试文件。

尚未执行：真实桌面 IME 候选交互、手工连续拖动的体验验收、大规模性能基准和平台导出构建。Wayland 窗口装饰/图标协议警告不是脚本错误。

## 用户手动验证

1. 保存当前工作后重新运行项目，在两个相近节点间命名连线。确认标签留在线上，提交文字或拖动后端点为标签腾出空间；增加反向连线和邻近节点，检查是否仍挤在一起或持续抖动。
2. 右键标签与线段分别改色。线、箭头与文字块底色应同步；白色底应为黑字。放入有色分组、切换深浅主题，检查背景色更新和显式颜色保留。
3. 像普通节点一样双击关系名称，检查全选、单击插入、首尾定位、拖选、中文预编辑、Enter/Shift+Enter/Esc。重点检查前缀消失、滚动条、焦点丢失及选中线覆盖文字。
4. 保存重开、撤销/重做改色和拖动、删除端点后撤销。标签必须随连线一起恢复，不出现独立文字对象或失效引用；失败重点检查碰撞矩形同步、引用恢复与事务收尾。
