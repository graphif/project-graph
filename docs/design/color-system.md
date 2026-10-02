# 配色与主题预设规范

状态：2026-09-29，设计契约草案 v1。用户确定两个预设：Catppuccin Mocha（深色）与 Catppuccin Latte（浅色）。取消原绿色浅色方向。本文为配色唯一维护入口，服务后续主题插件预配置；内置运行时配色已接入，插件加载器和外部预设配置文件尚未实现。

## 1. 三层结构

1. Palette：官方命名颜色，不包含组件用途。
2. Semantic roles：界面消费的稳定角色，如 text.primary、surface.canvas，不直接硬编码某个主题色值。
3. Component binding：把角色映射到 Godot Theme 的颜色、StyleBox、字体及图标调制入口；尺寸和交互见 [UI 规范](ui-style.md)。

主题插件可换 palette/roles，不能用换色偷偷改变按钮行为、文档内容或用户自定义节点配色。跟随系统是选择策略，不是第三个配色预设。

## 2. 基础色板

颜色来自 [Catppuccin 官方 Palette](https://catppuccin.com/palette/)，核对日期 2026-09-29。以下保留官方命名；用途映射是 Project Graph 的设计决定，不是官方推荐的逐项复制。

| 名称 | Mocha | Latte |
| --- | --- | --- |
| rosewater | #f5e0dc | #dc8a78 |
| flamingo | #f2cdcd | #dd7878 |
| pink | #f5c2e7 | #ea76cb |
| mauve | #cba6f7 | #8839ef |
| red | #f38ba8 | #d20f39 |
| maroon | #eba0ac | #e64553 |
| peach | #fab387 | #fe640b |
| yellow | #f9e2af | #df8e1d |
| green | #a6e3a1 | #40a02b |
| teal | #94e2d5 | #179299 |
| sky | #89dceb | #04a5e5 |
| sapphire | #74c7ec | #209fb5 |
| blue | #89b4fa | #1e66f5 |
| lavender | #b4befe | #7287fd |
| text | #cdd6f4 | #4c4f69 |
| subtext1 | #bac2de | #5c5f77 |
| subtext0 | #a6adc8 | #6c6f85 |
| overlay2 | #9399b2 | #7c7f93 |
| overlay1 | #7f849c | #8c8fa1 |
| overlay0 | #6c7086 | #9ca0b0 |
| surface2 | #585b70 | #acb0be |
| surface1 | #45475a | #bcc0cc |
| surface0 | #313244 | #ccd0da |
| base | #1e1e2e | #eff1f5 |
| mantle | #181825 | #e6e9ef |
| crust | #11111b | #dce0e8 |

Green 仅保留为完整色板及成功语义候选，不再承担浅色主题主色。统一强调色为 mauve。

## 3. 语义角色 v1

引用语法为 palette.<name>，颜色采用不透明 sRGB #RRGGBB；透明派生只通过明确的 blend 结构描述。下表是完整的 v1 必需角色集合，多个角色引用相同色值也保持独立名称。

| 角色 | Mocha 默认 | Latte 默认 | 含义 |
| --- | --- | --- | --- |
| surface.app | mantle | mantle | 应用框架 |
| surface.canvas | base | base | 画布底色 |
| surface.panel | mantle | mantle | 侧栏、详情和弹窗 |
| surface.raised | base | base | 菜单与浮层 |
| surface.field | base | base | 输入表面 |
| surface.hover | surface0 | surface0 | 悬停 |
| surface.pressed | surface1 | surface1 | 按下 |
| surface.selected | blend(base,mauve,0.16) | blend(base,mauve,0.12) | 持续选中 |
| text.primary | text | text | 正文 |
| text.secondary | subtext0 | subtext0 | 辅助文字 |
| text.disabled | overlay0 | overlay0 | 禁用文字 |
| text.on_accent | base | base | 强调色按钮文字；待实测对比度 |
| border.default | surface1 | surface1 | 控件边界 |
| border.subtle | surface0 | surface0 | 分区与网格 |
| border.focus | mauve | mauve | 键盘焦点 |
| accent.primary | mauve | mauve | 主要操作 |
| accent.link | blue | blue | 可打开链接 |
| icon.default | text | text | 普通图标 |
| icon.muted | subtext0 | subtext0 | 次要图标 |
| icon.disabled | overlay0 | overlay0 | 禁用图标 |
| icon.active | mauve | mauve | 活动图标 |
| status.info | blue | blue | 信息 |
| status.success | green | green | 成功标记，配文字 |
| status.warning | peach | peach | 警告标记，配文字 |
| status.error | red | red | 错误与危险标记，配文字 |
| canvas.node.fill | base | base | 默认节点填充 |
| canvas.node.border | surface2 | surface2 | 默认节点边界 |
| canvas.node.text | text | text | 默认节点文字 |
| canvas.edge | blue | blue | 默认连线 |
| canvas.selection | mauve | mauve | 选中轮廓 |

表中简写在配置里展开为 palette 引用。blend(background, foreground, alpha) 定义为各 sRGB 编码通道直接按 (1-alpha)×background + alpha×foreground 混合，四舍五入至 8 位，结果不透明；避免不同插件自行选择不同混合空间。阴影等装饰不在颜色契约 v1 内，继续由组件样式维护。

## 4. 预设文件契约（拟定，尚无加载器）

建议使用 UTF-8 JSON 数据，经 Godot JSON 解析后适配 Theme，不把插件配置当作可执行脚本。下面是 **Latte 最小合法覆盖示例**：依赖内置父预设提供完整色板和角色，不是独立完整主题文件。

```json
{
  "schema_version": 1,
  "id": "local.latte-preview",
  "display_name": "Latte Preview",
  "appearance": "light",
  "extends": "builtin.catppuccin-latte",
  "palette": {},
  "roles": {
    "accent.primary": "palette.mauve",
    "border.focus": "palette.mauve",
    "icon.active": "palette.mauve",
    "surface.selected": {
      "blend": {
        "background": "palette.base",
        "foreground": "palette.mauve",
        "alpha": 0.12
      }
    }
  }
}
```

内置预设 ID 固定为 builtin.catppuccin-mocha / builtin.catppuccin-latte，appearance 分别为 dark / light，使用第 2、3 节完整内容。自定义预设 ID 不得占用 builtin 命名空间。

字段约束：schema_version 必须为整数 1；id 为非空 ASCII 小写字母、数字、点、下划线、短横线组成的稳定字符串；display_name 为非空显示文本；appearance 仅 light/dark。palette 的键仅允许第 2 节名称，值为 #RRGGBB；roles 的键仅允许第 3 节角色，值为 palette 引用、#RRGGBB 或上述单层 blend；alpha 为 0–1 的有限数值。不允许表达式、脚本、文件路径、URL 或递归 blend。

extends 可省略；省略时须提供完整色板与角色。若提供，只允许引用一个同 appearance 的内置预设，不允许自定义继承链。先复制父预设的未解析数据，再按键覆盖 palette 与 roles，最后解析所有引用，因此覆盖 palette.mauve 会同步影响所有引用它的角色。

加载器应拒绝重复 JSON 键、未知 schema、未知字段/角色、非法颜色、丢失引用、重复注册 ID 和缺失必需角色；报出字段路径并保留当前主题。采用现成 JSON/校验能力，若 Godot 解析器不能检测重复键，先评估现成库，不自写通用 JSON 解析器。

完整解析及校验成功后一次性应用；预览取消恢复进入预览前的主题，确认后持久化 ID。预设被删除或无法加载时回退对应 appearance 的内置预设，并说明原因。系统模式映射 dark→Mocha、light→Latte，无法识别系统时默认 Mocha；这些均是目标行为，尚未实现。

## 5. 图标与 Godot 适配

图标通过 icon.* 角色着色，主题预设不复制整套浅色/深色 SVG。复用现有 SVG/Texture 与 Godot Theme 能力，平台兼容及导入路径实施时复核。SVG 的 currentColor 是设计工具约定，不假定 Godot 会像浏览器一样自动继承；适配器必须显式解析颜色或使用合适的纹理调制。

主题预设仅改变默认画布色；用户显式颜色优先。默认节点边框与连线分别使用 use_theme_border / use_theme_color 标志跟随主题；用户显式颜色优先。新建对象启用标志，旧数据缺少标志时按自定义颜色保留，即便颜色等于旧默认 HEX 也不猜测来源。保存、恢复和复制保留标志。

本轮没有引入库或主题插件。依赖落地前固定版本、哈希、许可与平台兼容信息；本色板引用不代表已完成依赖审计。

## 6. 迁移与验收

已通过 theme_palette.gd 集中提供色板、角色与 Theme 适配。旧 light 设置映射到 Latte，mocha 映射到 Mocha，system 跟随系统，无法识别时默认 Mocha。主界面、菜单、弹窗、画布、节点和连线已接入；开关采用紫色强调，用户显式颜色保持。复用 Godot Theme、StyleBoxFlat、Image SVG 栅格化和现有主题资源，无新增第三方库。

下表供用户手动验证；涉及外部预设加载器的操作仍是未来验收项：

| 操作 | 预期 | 失败重点 |
| --- | --- | --- |
| 切换两个预设并打开延迟加载弹窗 | 所有默认角色对应同一预设，无旧绿色主色残留 | 硬编码、缓存键、局部 override |
| 使用最小覆盖示例修改 mauve，再预览/取消 | 所有引用角色一致变化；取消完整恢复 | 合并顺序、引用解析、预览回滚 |
| 导入未知版本、坏颜色、缺失角色或重复 ID | 指明错误并维持当前有效主题 | 半应用、静默默认、错误路径 |
| 设置用户自定义节点色后切换主题 | 自定义色保持，默认色更新 | 以色值猜测来源、迁移覆盖 |
| 删除当前自定义预设并重启 | 回退对应内置预设且给出说明 | 悬空 ID、初始化顺序 |

与 [U1–U6](ui-style.md) 一起核对文字、焦点、缩放和禁用态。本轮获授权执行内置主题验证，结果与未覆盖范围见 [主题验证记录](../validation/theme-palette.md)。主题插件仍未实现。
