# Windows 安装包

1. 在 Godot 4.8.dev6 中安装匹配的 Windows Desktop export template（此 Windows 流程尚未在本机验证）。
2. 使用 `Windows Desktop` 预设导出到 `builds/windows/`，文件名保持为 `Project Graph.exe`。
3. 用 Inno Setup 6 打开 `ProjectGraph.iss` 并编译，安装包会生成在 `builds/installer/`。

安装器会创建开始菜单快捷方式，并让用户选择是否创建桌面快捷方式。它还会把 `.prg` 注册为 Project Graph 文档；双击 `.prg` 时，应用会接收文件路径并自动打开。

可选品牌资源：把 `preview.png` 放入 `packaging/windows/assets/`，安装器会随包复制到应用的 `assets` 目录，方便在安装包或后续预览界面使用。若要替换 exe/卸载器图标，准备 `project-graph.ico` 后取消 `ProjectGraph.iss` 中的 `SetupIconFile` 注释。
