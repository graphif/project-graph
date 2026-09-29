# 节点与连线文字输入修复

日期：2026-09-29。

## 原因与改动

显示 Label 的最小宽度不包含 TextEdit 的光标留白和输入法预编辑宽度；输入框因此可能提前横向滚动，隐藏行首。现在复用 AutoSizeTextEdit 的原生字体/行宽测量，统一计算草稿尺寸，预留光标空间；节点和关系标签共享各自的背景与输入范围，并在布局更新后清除过期滚动偏移。输入法通知会请求重新测量，未支持 IME 的显示后端不调用 IME 接口。

节点使用左内边距实现居中，而 Godot TextEdit 原生把文字起点左侧当作 gutter，直接忽略点击。因此补充可选的内边距输入适配：将该区域的左键事件映射到文字起点，随后仍由原生 TextEdit 完成光标、拖选和 Shift 选择。未另写文字编辑器。关系标签也启用相同适配，并关闭选中文字的拖放，单击可直接重新定位插入点。

关系标签层级移到舞台选择线之上，防止选中线穿过编辑文字。节点位置不随输入框展开改变，标签仍附着连线。

后续统一：节点与关系标签都调用 AutoSizeTextEdit 的 `align_with_label` 和 `handle_canvas_input`。双击进入并全选，单击定位和拖选由原生控件处理；Ctrl+A、首尾插入、Enter 确认、Shift+Enter 换行、Esc 取消及 IME 确认保护一致。显示与输入文字共用居中起点，避免切换时文字左右跳动。

复用评估：Godot TextEdit、Font、DisplayServer 和现有 AutoSizeTextEdit 已提供排版、选择、光标和 IME 能力，不需要额外社区文本控件。根因可见 [Godot TextEdit 源码](https://github.com/godotengine/godot/blob/master/scene/gui/text_edit.cpp)的左边距点击判断；新增代码仅适配画布内边距和共享尺寸，无新依赖。

## 自动验证

用户已授权运行。Godot 4.8.dev6，Linux Wayland / Intel Iris Xe / Compatibility，独立进程使用 `/tmp/pg-caption-validation-data` 隔离用户数据。Godot 文件经 MCP 脚本读写及编辑器脚本执行处理；场景通过 PackedScene/ResourceSaver 修改，没有读取或编辑场景文本。

- `edge_caption_smoke.gd`：通过。连续中英文无空格输入、横向滚动为零、无滚动条、缩短草稿、显式换行、编辑提交/取消、撤销重做、保存重开和端点跟随。
- 扩展标签交互回归：双击标签全选、Ctrl+A、Home/End、首尾插入、共享 Esc 取消路径通过。
- `text_edit_geometry_smoke.gd`：通过。节点与标签进入编辑时背景稳定、共享尺寸、固定宽度长文本、仅显式换行和输入框无裁切。
- `canvas_text_focus_smoke.gd`：通过。0.5/1/2 倍缩放下的 Ctrl+A、Home/End、Shift+Home/End、首尾插入、中间插入、边缘点击及从左内边距拖选到末尾；真实输入分发测试使用 Input.parse_input_event 更新鼠标按键状态。

无脚本错误；Wayland 窗口装饰和图标协议缺失警告仍存在。原生中文输入法候选和预编辑无法由上述合成字符输入替代，尚待手动确认；未执行平台导出构建。

## 用户手动验证

1. 双击普通节点和关系标签，连续输入中英文，不按空格。应始终看到行首和行尾，不能出现水平滚动条；重点检查预编辑阶段而非只看确认后的文本。
2. Ctrl+A 后在中间单击并输入，内容应在光标处插入；点击左右留白应分别到达首尾。从左侧拖到右侧应选中完整文本。失败时记录缩放比例、焦点是否丢失及是否正处于 IME 组合输入。
3. Home/End、Shift+Home/End、Shift+Enter 后继续输入，检查首尾选择、显式换行与光标。Enter 确认、Esc 取消、撤销重做应保持完整文字。
4. 选中连线并编辑标签，选中高亮不应覆盖文字；移动端点后标签仍在线上。
