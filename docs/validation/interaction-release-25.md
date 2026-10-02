# Release 25：临时视觉优化交付记录

已安装 project-graph-0.1.21-25.local.fc44.x86_64，替换 Release 24。802bcddd4 调整分组底色、边框与标题层次，9ba6db95b 修复视口边缘标题相交。用户随后明确要求直接采用 master 的视觉规则，后续交付将替换本版视觉设计。

安装包 dist/project-graph-0.1.21-25.local.fc44.x86_64.rpm；导出与 /usr/bin/project-graph 的 SHA256 相同：d55bef82ad99f1c80102cd599310722b6be96292fc6a11ebb3c1302b06bee6bd。

使用 Godot MCP 处理脚本、执行原生回归和导出，开发 project.godot 按字节恢复；Python/RPM 打包安装。原生相关回归、四实文件缩放、12 项离线缩略图回归通过；rpm -V 无输出且退出 0。安装入口打开教程操作正常完成，无脚本错误；该次首帧可交互约 9.92 秒，仍有既有退出 ObjectDB 泄漏警告，不宣称固定加载时间或严格稳定 120 Hz。

本版不再作为最终视觉验收目标，按用户最新要求继续移植 master 的分组预览视觉。
