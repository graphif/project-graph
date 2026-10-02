extends Node

const COMMANDS := ["helpWhatsNew", "helpQuickStart", "helpMarkdown", "helpImportExport", "helpThemes", "helpCanvas", "helpRecovery", "helpCredits", "helpChangelog", "helpPrivacy", "helpFeedback", "helpAbout"]
const TOPICS = {
	"helpWhatsNew": [
		"新功能",
		"文件菜单现已按常用操作分组，并显示快捷键。\n\n• 打开文件夹后，可在侧栏浏览 .prg 文件。\n• Ctrl+P 搜索已打开、最近使用及当前文件夹中的项目。\n• 可重新加载、移动、批量保存和将文件移到回收站。\n• 打印会在默认浏览器打开预览，可选择打印机或保存为 PDF。\n• 帮助菜单提供离线入门、Markdown 导入说明和恢复指引。\n\n[url=action:quickOpen]快速打开[/url]    [url=action:helpChangelog]查看上游更新日志[/url]"
	],
	"helpQuickStart": [
		"快速入门",
		"[b]1. 创建与编辑[/b]\n文件 → 新建，或按 Ctrl+N。使用底部工具栏的选择工具，双击画布空白处创建文本节点，双击节点编辑。\n\n[b]2. 组织内容[/b]\n单击节点选中，Shift+单击追加多选，Ctrl+单击只选当前节点；选择后拖动调整位置。使用底部的连接工具创建关系，画笔工具绘制笔迹。鼠标操作可在偏好设置中调整。\n\n[b]3. 查找与保存[/b]\nCtrl+F 搜索节点；Ctrl+P 快速打开项目；Ctrl+S 保存为 .prg。Ctrl+Z 撤销，Ctrl+Shift+Z 重做。\n\n[b]4. 下一步[/b]\n[url=action:helpCanvas]节点、连线与画笔[/url]\n[url=action:helpMarkdown]从 Markdown 生成结构[/url]\n[url=action:helpImportExport]导入、导出与打印[/url]\n[url=action:clickAppMenuSettingsButton]打开偏好设置[/url]\n\n快捷键以上述默认配置为准，可在设置中修改。"
	],
	"helpMarkdown": [
		"Markdown 参考",
		"[b]从文本生成节点[/b]\n文件 → 导入，选择 .md 文件，在生成窗口中使用 Markdown 模式。标题等级表示父子关系；每行内容生成一个文本节点。\n\n[b]示例[/b]\n[code]# 项目计划\n## 设计\n### 绘制草图\n## 开发\n### 完成首版[/code]\n\n缩进列表也可用于层级：每两格空格或一个 Tab 表示一级。行首的 - 或 * 列表标记会被去除。\n\n[b]支持范围[/b]\n当前用于生成节点结构，不会渲染 Markdown 排版；表格、图片引用、行内公式和代码围栏不会自动转换为专用对象。\n\n[url=action:importTextFile]导入 Markdown 文件[/url]\n[url=action:generateNodeTreeByMarkdown]粘贴 Markdown 生成节点[/url]"
	],
	"helpImportExport": [
		"导入、导出与打印",
		"[b]导入[/b]\n文件 → 导入，支持 .txt 和 .md。先选择生成模式，再确认生成；可用撤销恢复。\n\n[b]导出[/b]\n文件 → 导出，支持 SVG、PNG，以及选中结构的文本、Markdown 和 Mermaid。需要导出选中内容时，先在画布选择节点。\n\n[b]打印[/b]\n文件 → 打印，或 Alt+Shift+P。默认浏览器会打开当前图的打印预览，点击“打印 / 保存为 PDF”选择打印机、纸张及方向。默认将整张图缩放到一页；复杂图建议先导出 SVG 调整版面。\n\n本工作区的这些操作不需要 Pandoc。\n\n[url=action:importTextFile]导入文件[/url]    [url=action:printFile]打印当前图[/url]"
	],
	"helpThemes": [
		"自定义外观",
		"[b]主题与字号[/b]\n在偏好设置的外观页选择 Catppuccin Mocha（深色）、Catppuccin Latte（浅色）或跟随系统；常规页可调整 UI 缩放、网格和交互方式。窗口顶栏也有主题切换按钮。\n\n[b]节点外观[/b]\n选择一个文本节点，打开节点属性，调整字体大小、宽度、填充和边框颜色后应用。\n\n目前提供内置主题和节点样式设置，尚不支持导入 Typora 的 CSS 主题。\n\n[url=action:openAppearanceSettings]打开外观设置[/url]\n[url=action:properties]打开节点属性[/url]"
	],
	"helpCanvas": [
		"节点、连线与画笔",
		"[b]选择工具[/b]\n使用底部选择工具，单击选中节点，Shift+单击追加到多选，Ctrl+单击（macOS 为 Cmd+单击）只选当前节点。Shift 再点已选节点会保留选择；Ctrl 与 Shift 同时按下时只选当前节点。普通单击已选节点保留多选，便于一起拖动；单击未选节点切换到该节点。也可框选舞台对象，再拖动调整位置。双击文本节点编辑文字。\n\n[b]放入与移出方块[/b]\n先选中一个或多个方块，按住 Alt，在目标方块上按下并松开左键；普通方块会自动成为容器。也可以在拖动时按住 Alt，再在目标上松开。绿色轮廓表示可放入，红色表示不能放入自身或后代。按住 Alt 在空白处点击可移到最外层；松开 Alt 或按 Esc 取消。拖动容器标题会带动内容，最后一个成员移出后恢复普通方块。\n\n[b]快速绘制思维导图[/b]\n选中一个主题，Tab 添加子主题，Enter 添加同级主题（需要唯一父主题），F2 编辑文字。新主题自动连线并继承节点样式。编辑时 Enter 确认，Shift+Enter 换行，Esc 取消文字修改。\n\n[b]连接工具[/b]\n切换到底部连接工具后，在节点之间拖动建立连线；默认模式也可从节点按住右键拖到另一个节点。Esc 取消连接，同方向的重复连接不会叠加。点击连线可选中，右键菜单 → 属性可改线宽、颜色和箭头，或反转方向。\n\n[b]颜色[/b]\n选择节点或连线，按 Ctrl+Shift+C，选择填充/连线、节点边框或节点文字后应用；可批量改色或恢复默认。文字颜色透明表示自动选择适合背景的颜色。\n\n[b]切割[/b]\n默认在空白处按住右键拖出细线，松开删除经过的对象；Esc 取消。右键轻点仍打开菜单。切割和改色均可撤销。\n\n[b]画笔工具[/b]\n切换到画笔工具，按住左键绘制，松开完成笔迹。节点、连线和笔迹均可保存到 .prg。\n\n使用 Ctrl+Z 撤销最近一步，Ctrl+Shift+Z 重做。\n\n旧版项目中的图片节点支持选择、拖动和撤销；添加新图片尚未在当前工作区实现。需要分享图形时，可以导出 SVG 或 PNG。\n\n[url=action:modeSelect]选择工具[/url]    [url=action:modeConnect]连接工具[/url]    [url=action:modeDraw]画笔工具[/url]"
	],
	"helpRecovery": [
		"数据恢复与版本管理",
		"[b]保留版本[/b]\n使用另存为保留独立副本，或点击下面的“创建备份”。备份保存为带时间戳的 .prg 文件。\n\n[b]恢复[/b]\n打开备份文件夹，用文件 → 打开加载需要的 .prg，再另存为到目标位置。重新加载会替换当前内存内容并清除撤销记录；有未保存更改时会要求确认。\n\n[b]删除与撤销[/b]\n文件菜单的删除会将磁盘文件移到系统回收站，恢复请使用系统回收站。画布的撤销仅处理编辑操作，不能撤销磁盘文件移动或删除。\n\n当前没有自动备份或自动恢复未保存草稿的机制；“保存全部”取消时，已保存的文件会保留，后续文件停止保存。\n\n[url=action:manualBackup]创建备份[/url]    [url=action:openDefaultBackupFolder]打开备份文件夹[/url]"
	],
	"helpCredits": [
		"鸣谢",
		"感谢 Project Graph 的作者、贡献者和反馈问题的用户。\n\n[url=https://github.com/graphif/project-graph]Project Graph 项目与贡献记录[/url]\n\n本工作区使用 Godot Engine 构建。感谢 Godot 及其第三方组件的维护者。\n\n[url=https://godotengine.org]Godot Engine[/url]"
	],
	"helpPrivacy": [
		"隐私说明",
		"[b]本地文件[/b]\n项目保存到你选择的 .prg 路径；偏好设置、最近文件路径和手动备份存放在应用用户目录。可以在最近文件窗口清除最近列表。\n\n[b]打印与外部页面[/b]\n打印会在应用用户目录的 print 文件夹生成包含当前图内容的 HTML 预览，由默认浏览器打开。预览文件会保留，可在不需要时自行删除。\n官网、文档、更新日志和反馈链接会交给浏览器访问，对应服务有各自的数据处理规则。\n\n[url=action:clickAppMenuRecentFileButton]管理最近文件[/url]    [url=action:openConfigFolder]打开应用用户目录[/url]\n\n[url=https://graphif.dev/docs/prg/misc/terms]查看上游用户协议与隐私相关条款[/url]\n该页面说明上游发行版及在线服务；本工作区的行为以实际功能为准。"
	],
	"helpFeedback": [
		"反馈",
		"请记录触发步骤、预期结果、实际结果，以及错误提示。附图前可先隐藏项目中的私人内容。\n\n当前为 Project Graph 的 Godot 工作区，反馈时请注明这一点，并附上系统和 Godot 版本。\n\n[url=https://graphif.dev/docs/prg/misc/community]打开官方社区与反馈渠道[/url]\n[url=https://github.com/graphif/project-graph/issues]查看已有问题[/url]\n\n这里只打开反馈入口，提交内容由你确认。"
	]
}

@onready var app = get_parent()
var window: Window
var text: RichTextLabel


func setup() -> void:
	if is_instance_valid(window):
		return
	window = app.overlay.get_node_or_null("HelpWindow") as Window
	if window == null:
		app._ensure_window_ready("HelpWindow")
		return
	# Embedded Window supplies the themed surface behind its transparent content.
	window.transparent_bg = true
	text = window.get_node("Margin/Content/Text") as RichTextLabel
	text.meta_clicked.connect(_link)
	window.get_node("Margin/Content/Actions/Close").pressed.connect(window.hide)


func run(command: String) -> void:
	if command == "helpChangelog":
		open_link("https://github.com/graphif/project-graph/releases")
		return
	if command == "helpAbout":
		var version := str(ProjectSettings.get_setting("application/config/version", ""))
		if version.is_empty():
			version = "开发版本"
		_show("关于 Project Graph", "Project Graph\n" + version + "\n\nGodot " + str(Engine.get_version_info().string) + "\n" + OS.get_name() + "\n\n用节点和连线组织思考。\n\n[url=https://graphif.dev/]官方网站[/url]    [url=https://github.com/graphif/project-graph]源码仓库[/url]")
		return
	if TOPICS.has(command):
		var topic: Array = TOPICS[command]
		_show(str(topic[0]), str(topic[1]))


func _show(title: String, body: String, markup := true) -> void:
	if not is_instance_valid(window):
		app._ensure_window_ready("HelpWindow")
	if not is_instance_valid(window):
		return
	window.title = title
	text.bbcode_enabled = markup
	text.text = ("[font_size=22][b]" + title + "[/b][/font_size]\n\n" + body) if markup else body
	app._show_panel("HelpWindow")
	text.scroll_to_line(0)


func _link(value: Variant) -> void:
	var link := str(value)
	if link.begins_with("action:"):
		var command := link.trim_prefix("action:")
		if COMMANDS.has(command):
			run(command)
		elif app._available(command):
			window.hide()
			app._run(command)
		return
	open_link(link)


func open_link(url: String) -> void:
	if not url.begins_with("https://"):
		return
	var error := OS.shell_open(url)
	if error != OK:
		app._show_error("无法打开链接：" + error_string(error))

# export-cache-invalidation-20260918
