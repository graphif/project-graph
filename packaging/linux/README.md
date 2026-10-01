# Linux 安装集成（Fedora / GNOME）

RPM 安装时自动完成以下配置，用户无需执行文件关联脚本：

- 注册 `application/x-project-graph` 与 `.prg`，使用专属文件图标。
- 将 Project Graph 注册为该类型的系统默认应用。已有用户级的显式默认选择按桌面规范优先。
- 安装 GNOME thumbnailer，兼容 ZIP 内的 `stage.json` 和 master 的 `stage.msgpack`。旧存档有 `thumbnail.png` 时直接使用；没有时离线解析图与附件，已有文件无需重存。
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

缩略图现在读取保存的填充色和文字色，保留透明填充，并按画布背景与祖先容器合成颜色计算中性边框和默认文字对比度。同 RGB 的连续包含链向外按 0.78 递减填充 alpha；先绘制外层容器，再绘制内层和子节点。节点宽度包含画布的文字预留，固定宽度是最小值，正文仅按保存的换行分行；容器标题高度包含上下留白。连线使用可见轮廓端口、保存的线宽、箭头开关和文字标签。

复用评估：标准库 JSON/ZIP/math 足够解析存档和适配项目配色规则；现有 Cairo 提供 alpha 合成、原生贝塞尔曲线、轮廓命中和路径展平，Pango 提供文字排版。无需增加 Pillow、Shapely 或颜色计算库，也不启动 Godot。圆角控制点和颜色对比度规则来自项目现有实现。

缩略图仍为轻量概览，字体使用系统 Sans，主题跟随桌面；没有画布网格、编辑选中状态或未保存的临时文字，不是编辑器像素级截图。旋转、缩放变换、部分画笔序列化形式及复杂连线标签避让仍可能与画布显示不同。

本次已对 `/home/waya/Desktop/project/未命名.prg` 与 `你好.prg` 生成并目视检查新预览，原文档未修改；离线回归、Python 语法及 Ruff 检查通过。手动验收：重开该目录，检查“你好”节点为紫色填充深色文字，蓝色嵌套容器层次可见，连线有箭头和“你好”标签。若仍显示旧配色，重点检查缩略图缓存和 `/usr/libexec/project-graph-thumbnailer` 是否已更新。尚未执行新版 RPM 安装后的文件管理器端到端验收、实际高 DPI 操作和跨平台验证。

开发脚本修改不会更新系统安装的预览器。发布时按上面的 RPM 流程重新打包安装，才会让新建或再次保存的文档持续使用新版。GNOME 的缩略图沙箱不暴露用户主目录，不能简单将 thumbnailer Exec 指向仓库或 `~/.local/libexec`。只测试预览器时，可在仓库根目录由用户执行下列命令更新已安装的辅助程序（本次因缺少管理员权限尚未执行），然后复制一个 `.prg` 到新文件名触发新预览：

```sh
sudo install -m 755 packaging/linux/project-graph-thumbnailer.py /usr/libexec/project-graph-thumbnailer
```

该临时更新不替代 RPM 发布；之后重新安装旧 RPM 会覆盖辅助程序。
解析限制：ZIP 256 MiB、JSON 16 MiB、5000 个对象、每段画笔 2000 个点；不会解压文档到磁盘或访问网络。

参考：[GNOME thumbnailer 接口](https://github.com/GNOME/gnome-desktop/blob/master/libgnome-desktop/gnome-desktop-thumbnail.c)、[MIME 默认应用规范](https://specifications.freedesktop.org/mime-apps/latest/default.html)。


## master 旧格式预览

新增的「教程操作」「教程节点」「tutorial-shortcut-keys-3.1」使用 MessagePack。
预览器复用 msgpack-python 1.1.2（Apache-2.0），RPM 固定该版本，
源包哈希见 [requirements-thumbnailer.txt](requirements-thumbnailer.txt)。
使用 pip 安装时添加 `--require-hashes --no-binary=msgpack`；RPM 由仓库签名验证来源。
GdkPixbuf 与 librsvg 负责图片/SVG 解码，不另写图像解码器。
保存内嵌预览的旧文档会保留 master 的配色、网格和取景。

已通过 12 项预览回归、Ruff 检查，并对上述三个实文件生成预览及更新四档
GNOME 缓存。原文档未改写。手动验收：重开目录或复制文档到新文件名，
应显示图内容；若仍为应用图标，检查系统预览器版本和 msgpack/GdkPixbuf/librsvg
依赖。新版辅助程序尚未安装到 `/usr/libexec`，新版 RPM 端到端安装尚未验证。

来源：[msgpack-python](https://github.com/msgpack/msgpack-python)、
[MessagePack 格式规范](https://github.com/msgpack/msgpack/blob/master/spec.md)。
