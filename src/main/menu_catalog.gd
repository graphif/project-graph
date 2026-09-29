class_name GraphMenuCatalog
extends RefCounted

# 菜单结构与命令标识的唯一来源；场景声明对应的 PopupMenu 节点。
const MENUS = [
	{
		"type": "topMenu",
		"id": "file",
		"icon": "File",
		"children": [
			{
				"type": "item",
				"id": "newDraft",
				"label": "新建"
			},
			{
				"type": "item",
				"id": "newWindow",
				"label": "新建窗口"
			},
			{
				"type": "separator",
				"id": "file-create"
			},
			{
				"type": "item",
				"id": "openFile",
				"label": "打开..."
			},
			{
				"type": "item",
				"id": "openFolder",
				"label": "打开文件夹..."
			},
			{
				"type": "separator",
				"id": "file-open"
			},
			{
				"type": "item",
				"id": "quickOpen",
				"label": "快速打开..."
			},
			{
				"type": "sub",
				"id": "recentFilesSub",
				"label": "打开最近文件",
				"children": [
					{
						"type": "recentFiles",
						"id": "recentFilesEntries",
						"label": "recentFilesEntries"
					}
				]
			},
			{
				"type": "item",
				"id": "reloadFile",
				"label": "从磁盘重新加载"
			},
			{
				"type": "separator",
				"id": "file-reload"
			},
			{
				"type": "item",
				"id": "saveFile",
				"label": "保存"
			},
			{
				"type": "item",
				"id": "saveAs",
				"label": "另存为..."
			},
			{
				"type": "item",
				"id": "moveFile",
				"label": "移动到..."
			},
			{
				"type": "item",
				"id": "saveAll",
				"label": "保存全部打开的文件..."
			},
			{
				"type": "separator",
				"id": "file-save"
			},
			{
				"type": "item",
				"id": "openCurrentProjectFileFolder",
				"label": "打开文件位置..."
			},
			{
				"type": "item",
				"id": "revealInSidebar",
				"label": "在侧边栏中显示"
			},
			{
				"type": "item",
				"id": "deleteFile",
				"label": "删除..."
			},
			{
				"type": "separator",
				"id": "file-location"
			},
			{
				"type": "item",
				"id": "importTextFile",
				"label": "导入..."
			},
			{
				"type": "sub",
				"id": "exportSub",
				"label": "导出",
				"children": [
					{
						"type": "item",
						"id": "exportSvgAll",
						"label": "全部内容为 SVG..."
					},
					{
						"type": "item",
						"id": "exportSvgSelected",
						"label": "选中内容为 SVG..."
					},
					{
						"type": "item",
						"id": "exportPngLegacy",
						"label": "全部内容为 PNG..."
					},
					{
						"type": "item",
						"id": "exportPngSelected",
						"label": "选中内容为 PNG..."
					},
					{
						"type": "separator",
						"id": "file-export"
					},
					{
						"type": "item",
						"id": "exportSelectedNetStructureToPlainText",
						"label": "选中网状结构为文本..."
					},
					{
						"type": "item",
						"id": "exportSelectedTreeStructureToPlainText",
						"label": "选中树形结构为文本..."
					},
					{
						"type": "item",
						"id": "exportSelectedTreeStructureToMarkdown",
						"label": "选中树形结构为 Markdown..."
					},
					{
						"type": "item",
						"id": "exportSelectedNetStructureToMermaid",
						"label": "选中网状结构为 Mermaid..."
					}
				]
			},
			{
				"type": "item",
				"id": "printFile",
				"label": "打印..."
			},
			{
				"type": "separator",
				"id": "file-export-end"
			},
			{
				"type": "item",
				"id": "clickAppMenuSettingsButton",
				"label": "偏好设置..."
			},
			{
				"type": "separator",
				"id": "file-preferences"
			},
			{
				"type": "item",
				"id": "closeTab",
				"label": "关闭"
			}
		],
		"label": "文件"
	},
	{
		"type": "topMenu",
		"id": "view",
		"icon": "View",
		"children": [
			{
				"type": "item",
				"id": "resetViewAll",
				"icon": "View",
				"label": "根据全部内容重置视野"
			},
			{
				"type": "item",
				"id": "resetView",
				"icon": "SquareDashedMousePointer",
				"label": "重置视野"
			},
			{
				"type": "item",
				"id": "resetCameraScale",
				"icon": "Scaling",
				"label": "重置缩放"
			},
			{
				"type": "item",
				"id": "moveViewToOrigin",
				"icon": "MapPin",
				"label": "移到坐标原点"
			},
			{
				"type": "separator",
				"id": "sep-view-1",
				"label": "sep-view-1"
			},
			{
				"type": "item",
				"id": "stopDrifting",
				"icon": "OctagonX",
				"label": "停止漂移"
			},
			{
				"type": "item",
				"id": "focusRandomEntity",
				"icon": "Dices",
				"label": "随机聚焦实体"
			}
		],
		"label": "视野"
	},
	{
		"type": "topMenu",
		"id": "actions",
		"icon": "Axe",
		"children": [
			{
				"type": "item",
				"id": "searchText",
				"icon": "Search",
				"label": "搜索文本"
			},
			{
				"type": "item",
				"id": "updateReferences",
				"icon": "RefreshCcwDot",
				"label": "更新引用"
			},
			{
				"type": "separator",
				"id": "sep-actions-0",
				"label": "sep-actions-0"
			},
			{
				"type": "item",
				"id": "undo",
				"icon": "Undo",
				"label": "撤销"
			},
			{
				"type": "item",
				"id": "redo",
				"icon": "Redo",
				"label": "取消撤销"
			},
			{
				"type": "item",
				"id": "groupSelection",
				"icon": "groupSelection",
				"label": "创建分组"
			},
			{
				"type": "item",
				"id": "releaseKeys",
				"icon": "Keyboard",
				"label": "释放按键"
			},
			{
				"type": "item",
				"id": "closeAllSubWindows",
				"icon": "X",
				"label": "关闭所有子窗口"
			},
			{
				"type": "separator",
				"id": "sep-actions-1",
				"label": "sep-actions-1"
			},
			{
				"type": "sub",
				"id": "generateSub",
				"icon": "Sparkles",
				"children": [
					{
						"type": "item",
						"id": "generateNodeTreeByText",
						"icon": "Network",
						"label": "根据文本生成树状结构"
					},
					{
						"type": "item",
						"id": "generateNodeTreeByMarkdown",
						"icon": "Network",
						"label": "根据Markdown生成树状结构"
					},
					{
						"type": "item",
						"id": "generateNodeGraphByText",
						"icon": "GitCompareArrows",
						"label": "根据文本生成网状结构"
					},
					{
						"type": "item",
						"id": "generateNodeMermaidByText",
						"icon": "GitCompareArrows",
						"label": "根据Mermaid生成嵌套结构"
					}
				],
				"label": "生成"
			},
			{
				"type": "item",
				"id": "openLogicNodePanel",
				"icon": "Workflow",
				"label": "打开逻辑节点面板"
			},
			{
				"type": "item",
				"id": "openLogicNodeDocs",
				"icon": "BookOpen",
				"label": "打开逻辑节点文档"
			},
			{
				"type": "separator",
				"id": "sep-actions-2",
				"label": "sep-actions-2"
			},
			{
				"type": "item",
				"id": "clearStage",
				"icon": "Radiation",
				"label": "清空舞台"
			}
		],
		"label": "操作"
	},
	{
		"type": "topMenu",
		"id": "settings",
		"icon": "Settings",
		"children": [
			{
				"type": "item",
				"id": "clickAppMenuSettingsButton",
				"icon": "Settings",
				"label": "打开设置页面"
			},
			{
				"type": "sub",
				"id": "autoSettingsSub",
				"icon": "Rabbit",
				"children": [
					{
						"type": "item",
						"id": "autoNamerTemplate",
						"icon": "Type",
						"label": "设置自动命名模板"
					},
					{
						"type": "item",
						"id": "autoNamerSectionTemplate",
						"icon": "Type",
						"label": "设置框命名模板"
					},
					{
						"type": "item",
						"id": "autoNamerDetailsTemplate",
						"icon": "Type",
						"label": "设置详细信息模板"
					},
					{
						"type": "item",
						"id": "autoNamerTreeNodeTemplate",
						"icon": "Type",
						"label": "设置Tab生长节点名称"
					},
					{
						"type": "item",
						"id": "autoFillNodeColorToggle",
						"icon": "Palette",
						"label": "切换自动填色"
					},
					{
						"type": "item",
						"id": "autoFillNodeColorSet",
						"icon": "Palette",
						"label": "设置自动填色"
					}
				],
				"label": "自动设置"
			},
			{
				"type": "item",
				"id": "openAppearanceSettings",
				"icon": "Palette",
				"label": "打开外观设置"
			},
			{
				"type": "item",
				"id": "resetAllKeyBinds",
				"icon": "Radiation",
				"label": "重置所有快捷键"
			},
			{
				"type": "item",
				"id": "openConfigFolder",
				"icon": "FolderCog",
				"label": "打开配置文件夹"
			},
			{
				"type": "item",
				"id": "openCacheFolder",
				"icon": "FolderOpen",
				"label": "打开缓存文件夹"
			}
		],
		"label": "设置"
	},
	{
		"type": "topMenu",
		"id": "window",
		"icon": "AppWindow",
		"children": [
			{
				"type": "item",
				"id": "toggleFullscreen",
				"icon": "Fullscreen",
				"label": "切换全屏"
			},
			{
				"type": "item",
				"id": "checkoutClassroomMode",
				"icon": "Airplay",
				"label": "进入或退出专注模式"
			},
			{
				"type": "item",
				"id": "checkoutProtectPrivacy",
				"icon": "VenetianMask",
				"label": "进入或退出隐私保护模式"
			},
			{
				"type": "sub",
				"id": "backgroundGridSub",
				"icon": "LayoutGrid",
				"children": [
					{
						"type": "item",
						"id": "toggleBackgroundHorizontalLines",
						"icon": "Rows4",
						"label": "切换水平线背景"
					},
					{
						"type": "item",
						"id": "toggleBackgroundVerticalLines",
						"icon": "Columns4",
						"label": "切换垂直线背景"
					},
					{
						"type": "item",
						"id": "toggleBackgroundDots",
						"icon": "Grip",
						"label": "切换点状背景"
					},
					{
						"type": "item",
						"id": "toggleBackgroundCartesian",
						"icon": "Move3d",
						"label": "切换笛卡尔网格"
					}
				],
				"label": "背景网格"
			},
			{
				"type": "sub",
				"id": "windowOpacitySub",
				"icon": "PictureInPicture2",
				"children": [
					{
						"type": "item",
						"id": "checkoutWindowOpacityMode",
						"icon": "PictureInPicture2",
						"label": "切换窗口透明度模式"
					},
					{
						"type": "item",
						"id": "windowOpacityAlphaDecrease",
						"icon": "PictureInPicture2",
						"label": "窗口不透明度减小"
					},
					{
						"type": "item",
						"id": "windowOpacityAlphaIncrease",
						"icon": "PictureInPicture2",
						"label": "窗口不透明度增加"
					}
				],
				"label": "窗口透明度"
			},
			{
				"type": "item",
				"id": "switchDebugShow",
				"icon": "Bug",
				"label": "切换调试信息显示"
			},
			{
				"type": "sub",
				"id": "stealthModeSub",
				"icon": "CircleDot",
				"children": [
					{
						"type": "item",
						"id": "switchStealthMode",
						"icon": "CircleDot",
						"label": "切换潜行模式"
					},
					{
						"type": "item",
						"id": "toggleStealthModeReverseMask",
						"icon": "CircleDot",
						"label": "切换反转遮罩"
					},
					{
						"type": "item",
						"id": "stealthModeScopeRadiusIncrease",
						"icon": "CirclePlus",
						"label": "放大狙击镜范围"
					},
					{
						"type": "item",
						"id": "stealthModeScopeRadiusDecrease",
						"icon": "CircleMinus",
						"label": "缩小狙击镜范围"
					}
				],
				"label": "狙击镜"
			}
		],
		"label": "窗口"
	},
	{
		"type": "topMenu",
		"id": "extensions",
		"icon": "Blocks",
		"children": [
			{
				"type": "item",
				"id": "openExtensionsWindow",
				"icon": "Blocks",
				"label": "打开扩展窗口"
			},
			{
				"type": "item",
				"id": "openPluginMarket",
				"icon": "Store",
				"label": "扩展市场"
			},
			{
				"type": "item",
				"id": "openExtensionFolder",
				"icon": "FolderOpen",
				"label": "打开扩展文件夹"
			}
		],
		"label": "扩展"
	},
	{
		"type": "topMenu",
		"id": "help",
		"icon": "CircleHelp",
		"children": [
			{
				"type": "item",
				"id": "helpWhatsNew",
				"label": "新功能..."
			},
			{
				"type": "separator",
				"id": "help-news"
			},
			{
				"type": "item",
				"id": "helpQuickStart",
				"label": "快速入门"
			},
			{
				"type": "item",
				"id": "helpMarkdown",
				"label": "Markdown 参考"
			},
			{
				"type": "item",
				"id": "helpImportExport",
				"label": "导入、导出与打印"
			},
			{
				"type": "item",
				"id": "helpThemes",
				"label": "自定义外观"
			},
			{
				"type": "item",
				"id": "helpCanvas",
				"label": "节点、连线与画笔"
			},
			{
				"type": "item",
				"id": "helpRecovery",
				"label": "数据恢复与版本管理"
			},
			{
				"type": "item",
				"id": "openOfficialDocs",
				"label": "更多主题..."
			},
			{
				"type": "separator",
				"id": "help-guides"
			},
			{
				"type": "item",
				"id": "helpCredits",
				"label": "鸣谢"
			},
			{
				"type": "item",
				"id": "helpChangelog",
				"label": "更新日志"
			},
			{
				"type": "item",
				"id": "helpPrivacy",
				"label": "隐私说明"
			},
			{
				"type": "item",
				"id": "website",
				"label": "官方网站"
			},
			{
				"type": "item",
				"id": "helpFeedback",
				"label": "反馈"
			},
			{
				"type": "separator",
				"id": "help-info"
			},
			{
				"type": "item",
				"id": "helpAbout",
				"label": "关于"
			}
		],
		"label": "关于"
	},
	{
		"type": "topMenu",
		"id": "unstable",
		"icon": "MessageCircleWarning",
		"visible": false,
		"children": [
			{
				"type": "versionInfo",
				"id": "versionInfoText",
				"label": "versionInfoText"
			},
			{
				"type": "separator",
				"id": "sep-unstable-1",
				"label": "sep-unstable-1"
			},
			{
				"type": "sub",
				"id": "devSub",
				"icon": "TestTube2",
				"children": [
					{
						"type": "item",
						"id": "devOpenTestWindow",
						"icon": "FlaskConical",
						"label": "打开测试窗口"
					},
					{
						"type": "item",
						"id": "devSerializeTest",
						"icon": "Code",
						"label": "序列化测试"
					},
					{
						"type": "item",
						"id": "devTriggerBug",
						"icon": "Bug",
						"label": "触发错误"
					},
					{
						"type": "item",
						"id": "devReload",
						"icon": "RefreshCw",
						"label": "重载应用"
					},
					{
						"type": "item",
						"id": "devGetDeviceId",
						"icon": "Fingerprint",
						"label": "获取设备ID"
					},
					{
						"type": "item",
						"id": "devFeatureFlags",
						"icon": "Flag",
						"label": "功能开关"
					},
					{
						"type": "item",
						"id": "devNodeDetails",
						"icon": "LayoutPanelTop",
						"label": "节点详情"
					},
					{
						"type": "item",
						"id": "devCreateTestTab",
						"icon": "FilePlus",
						"label": "创建测试标签页"
					},
					{
						"type": "item",
						"id": "devLogStage",
						"icon": "Terminal",
						"label": "输出舞台日志"
					},
					{
						"type": "item",
						"id": "devLogSelectedDetails",
						"icon": "FileText",
						"label": "输出选中节点详情"
					},
					{
						"type": "item",
						"id": "devCreateExampleExtension",
						"icon": "Package",
						"label": "创建示例扩展"
					},
					{
						"type": "item",
						"id": "devOutputMarkdown",
						"icon": "FileText",
						"label": "输出Markdown"
					},
					{
						"type": "item",
						"id": "devOnboarding",
						"icon": "BookOpen",
						"label": "新手引导"
					},
					{
						"type": "item",
						"id": "devCreate100Nodes",
						"icon": "Plus",
						"label": "创建100个节点"
					}
				],
				"label": "devSub"
			}
		],
		"label": "测试版"
	}
]
