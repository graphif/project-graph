# 字体

界面、节点、节点编辑框和连线文字统一使用霞鹜文楷完整 Regular 版。画布继续使用共享 MSDF 字体缓存，菜单使用普通字体渲染。

复用 Godot FontFile、Theme 和现有画布字体缓存，不新增字体渲染库。旧场景的字体覆盖由 TextNode 初始化时统一替换。

来源：https://github.com/lxgw/LxgwWenKai ，版本 v1.522，固定提交 `e8b5b48b79f19f29aa68b0a178eab3472ea9f7e8`，上游路径 `fonts/TTF/LXGWWenKai-Regular.ttf`。随包保留 SIL OFL 1.1 许可证 `assets/fonts/LXGWWenKai-OFL.txt`。

字体 SHA-256：`39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009`。
许可证 SHA-256：`c38b1994a5e48ac30ac7d1da7d0409fd8fd8127dfe28a13d6e787d5b1ef34a5e`。

Godot 4.8.dev6 可加载该 TTF，实际报告 46,490 个字符；不宣称覆盖全部 Unicode。

手动验证：重新启动项目，在节点与连线输入“关组连动边框清晰 Test01”，切换深浅主题，打开菜单，再双击编辑并缩放到 50%。应使用一致的霞鹜文楷字形，编辑时文字起点保持一致，方向键移动光标。若出现方框、局部字体突变或编辑跳位，重点检查字体导入、局部字体覆盖和编辑框排版。极罕见字符需另行核验覆盖。
