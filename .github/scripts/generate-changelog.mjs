/* eslint-disable */
import { execSync } from "child_process";

// 获取最近一次发布的标签
const lastRelease = execSync(
  "git for-each-ref --sort=-creatordate --format='%(refname:short)' \"refs/tags/v*\" | head -n 1",
)
  .toString()
  .trim();

// 获取 Git 提交记录
const commits = execSync(`git log ${lastRelease}.. --pretty=format:"%s" --reverse`).toString().trim();

// 定义提示信息
const prompt = `
你是一个专业的软件文档撰写助手，负责将开发团队提供的commit历史记录转换为用户友好的更新日志（Changelog）。用户会提供git历史记录信息。
你的任务是生成一篇清晰、简洁的Changelog，面向最终用户（非技术人员），避免使用技术术语，专注于用户能直接感知的变更。请遵循以下规则：

1. **理解commit类型**：
  - \`feat\` / \`feature\`：新功能，归类为“新功能”。
  - \`fix\` / \`hotfix\`：问题修复，归类为“问题修复”。
  - \`docs\`：文档或内容更新，归类为“文档和内容更新”。
  - \`chore\`：界面优化、配置调整或内部改进，归类为“改进和优化”（重点描述用户可见的变化）。
  - 其他类型根据描述推断，确保归类合理。

2. **组织Changelog结构**：
  - 按类别分组commit（如“问题修复”、“文档和内容更新”、“改进和优化”等），每个类别使用子标题。
  - 每个类别下用项目符号列表描述变更，语言口语化、正面积极（例如：用“修复了...问题”而非“修复bug”）。
  - 如果多个commit相似，可合并描述以提高可读性。

3. **输出格式**：
  - 使用中文。
  - 保持段落清晰，无需编号，但使用标题和项目符号。
  - 开头不要有 \`## 更新日志\`，直接开始更新内容。
  - 从二级标题开始（例如：\`## 新功能\`）。

请直接输出Changelog内容，无需额外解释。

## Example

\`\`\`
## 新功能

增加穿透点击功能，全局快捷键Alt+2可以开关窗口穿透，穿透点击开启后，副作用是会自动将透明度设置为0.2且自动打开窗口置顶
标签面板可以正常打开了，且增加标签管理器UI分裂功能，每一个标签都能分裂成一个可拖拽与改变大小的独立子窗口，且点击能够对准对应的节点
rua时，可以输入自定义连接符，如果输入了换行符作为连接，则rua出来的节点的换行策略会自动变为手动调整宽度模式
增加手动保存时是否自动清理历史记录的设置项
完成自动保存功能
完成自动备份功能

## 操作优化

修复最后一个实体跳出框时，框附带移动到实体附近的bug
section中最后一个节点跳出框时，自动变为文本节点

## 视觉/交互优化

alt跳入框时，显示框会变大多少的虚线边缘
右键菜单中增加文本节点妙操作
开启穿透点击时，自动半透明窗口
给子窗口增加shadow
按住ctrl或者shift框选加选或者叉选时，增加视觉提示
给特效界面增加提示

## Bug修复

修复涂鸦后没有记录历史的问题
防止一开始启动软件视野缩放过大
暂时修复详细信息报错问题
\`\`\`
`;

// 发送请求到 API
const response = fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=" +
    process.env.GEMINI_API_KEY,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      contents: [
        {
          parts: [
            {
              text: commits,
            },
          ],
        },
      ],
    }),
  },
);

response
  .then((res) => res.json())
  .then((data) => {
    const changelog = data.candidates[0].content.parts[0].text;
    const finalChangelog = `${changelog}
`;
    console.log(finalChangelog);
  })
  .catch((err) => {
    console.error(err);
  });
