# macOS 安装界面

`background.svg` 是可编辑源文件，`background.png` 是 Tauri 打包时使用的背景。两个可拖动图标及文件名由 Finder 绘制，背景图中不要再画一次。

在本目录使用 ImageMagick 生成背景和布局预览：

```sh
magick -background none background.svg background.png
magick -background none preview-overlay.svg /tmp/project-graph-dmg-overlay.png
magick background.png \( ../icons/icon.png -resize 128x128 \) -geometry +120+190 -composite /tmp/project-graph-dmg-overlay.png -geometry +0+0 -composite /tmp/project-graph-dmg-preview.png
```

渲染中文需要 Noto Sans CJK SC 字体。`preview-overlay.svg` 中的 Applications 图标和名称用于预览，不参与打包。

窗口尺寸为 720 × 460，图标中心为 `(184, 254)` 和 `(536, 254)`，与 `tauri.conf.json` 的 `bundle.macOS.dmg` 配置对应。修改布局时需同时更新这些位置。

预览不包含 Finder 的窗口标题栏。[Tauri 官方文档](https://v2.tauri.app/distribute/dmg/) 记录了 CI 下可能不应用图标位置的问题；发布工作流设置 `TAURI_BUNDLER_DMG_IGNORE_CI=true` 启用 Finder 布局，并挂载产物检查背景文件和 `.DS_Store`。最终视觉效果仍需在 macOS 上查看。
