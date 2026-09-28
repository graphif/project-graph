# Linux 安装集成（Fedora / GNOME）

RPM 安装时自动完成以下配置，用户无需执行文件关联脚本：

- 注册 `application/x-project-graph` 与 `.prg`，使用专属文件图标。
- 将 Project Graph 注册为该类型的系统默认应用。已有用户级的显式默认选择按桌面规范优先。
- 安装 GNOME thumbnailer，从 ZIP 内的 `stage.json` 离线生成 PNG 概览，已有文件无需重存。
- 双击文档通过 `--` 后的路径参数打开；支持中文、空格与多个文档。
- 卸载移除默认应用条目并刷新数据库，不删除用户文档。

## 制作安装包

编辑器与导出模板必须匹配。本项目当前使用 Godot 4.8.dev6；通过官方模板管理器安装同版本模板，Linux 的 `custom_template/debug` 与 `custom_template/release` 留空，不能指向系统中的旧版 `/usr/bin/godot-runner`。构建脚本会比较 ELF 运行器版本和内嵌 PCK 的主/次版本，不匹配时拒绝打包。

当前生产导出需通过 Godot MCP 临时关闭 editor_plugins 并移除开发用 MCPRuntimeProbe 自动加载项，导出完成后恢复开发配置；否则被排除的 addons 目录会留下无效自动加载引用。独立运行导出程序检查启动日志，不能只依据导出成功就安装。应用场景不可引用被排除的 packaging 目录资源。

应用与文档图标同时安装根目录 `project-graph-icon.svg` 到 hicolor/scalable，并保留由同一 SVG 生成的 256 像素 PNG 作为兼容资源。更改 SVG 后须通过 Godot MCP 重新生成 `packaging/linux/project-graph.png` 再打包。

1. 使用 Godot 的 **Linux / 导出项目**，生成 `dist/project-graph.x86_64`。已配置嵌入 PCK；不能仅导出 PCK。
2. 构建机安装 `rpm-build`，执行：

   ```sh
   python3 packaging/linux/build-rpm.py --binary dist/project-graph.x86_64 --version 0.1.0
   ```

3. 发布 `dist/project-graph-*.rpm`。用户通过系统安装器安装该 RPM，关联和预览支持随包安装。

当前提供 Fedora RPM 流程，不包含 Windows Explorer 缩略图扩展或 macOS Quick Look 扩展。
版本号由发布者指定；未虚构当前应用版本。包内保留应用二进制附加的 PCK，不进行 strip。

## 手动验收（尚未执行）

1. 安装 RPM 后，在文件管理器打开包含旧 `.prg` 的目录，并启用本地文件缩略图。
   应显示图内容概览，未生成预览时应显示专属图标而非压缩包图标。
2. 双击带中文、空格的文件；应直接进入对应文档，不被欢迎页遮挡。多选打开应加载各文件。
3. 修改节点并保存，再查看缩略图；文件管理器应按修改时间更新缓存。
4. 试用空图、包含连线的图、损坏文件。空图显示空白画布提示；损坏或过大的文件回退图标，不能启动编辑器或阻塞文件管理器。
5. 关闭系统缩略图时应保持用户设置，仅显示文件图标。若安装后未更新，可重开文件管理器窗口。
6. 卸载后确认应用入口及其默认条目移除，文档和其他文件类型的默认应用仍保留。
7. 使用包含多层嵌套容器的文档生成新缩略图：外层边框左右留白应对称，容器原始位置不应影响取景；连接容器的线也不应延伸到旧位置。
8. 在高 DPI 文件管理器中放大预览，检查中文、英文和边框清晰度。缩略图按请求尺寸的两倍生成（最长 2048 像素）；旧缓存不会自动重绘，可复制文档到新路径后检查。若仍偏移，重点检查连接端点；若仍模糊，先确认新缩略图已生成及查看器是否继续放大。

缩略图回归检查（需显式授权后执行，依赖现有 Python Cairo/Pango 环境）：

```sh
python3 -m unittest discover -s packaging/linux -p 'test_thumbnailer.py'
```

缩略图为轻量概览，使用统一配色和字体，不是编辑器像素级截图；容器、旋转、自定义样式及部分画笔序列化形式可能与画布显示不同。
解析限制：ZIP 256 MiB、JSON 16 MiB、5000 个对象、每段画笔 2000 个点；不会解压文档到磁盘或访问网络。

参考：[GNOME thumbnailer 接口](https://github.com/GNOME/gnome-desktop/blob/master/libgnome-desktop/gnome-desktop-thumbnail.c)、[MIME 默认应用规范](https://specifications.freedesktop.org/mime-apps/latest/default.html)。
