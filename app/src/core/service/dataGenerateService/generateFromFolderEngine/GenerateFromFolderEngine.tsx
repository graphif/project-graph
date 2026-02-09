import { Color, Vector } from "@graphif/data-structures";
import { Project, service } from "@/core/Project";
import { invoke } from "@tauri-apps/api/core";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Rectangle } from "@graphif/shapes";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { parseSingleEmacsKey } from "@/utils/emacs";
import { allKeyBinds } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
// 快捷键分组定义（从SettingsWindow/keybinds.tsx复制）

import { Renderer } from "@/core/render/canvas2d/renderer";
import { getMultiLineTextSize } from "@/utils/font";
import i18next from "i18next";
import { shortcutKeysGroups } from "@/sub/SettingsWindow/keybinds";

@service("generateFromFolder")
export class GenerateFromFolder {
  constructor(private readonly project: Project) {}

  async generateFromFolder(folderPath: string): Promise<void> {
    const folderStructure = await readFolderStructure(folderPath);
    // 当前的放置点位
    const currentLocation = this.project.camera.location.clone();
    const dfs = (fEntry: FolderEntry, currentSection: Section | null = null) => {
      if (fEntry.is_file) {
        // 是文件，创建文本节点
        const textNode = new TextNode(this.project, {
          text: fEntry.name,
          details: DetailsManager.markdownToDetails(fEntry.path),
          collisionBox: new CollisionBox([new Rectangle(currentLocation.clone(), Vector.getZero())]),
          color: this.getColorByPath(fEntry.path),
        });
        this.project.stageManager.add(textNode);
        if (currentSection) {
          this.project.stageManager.goInSection([textNode], currentSection);
        }
        return textNode;
      } else {
        // 是文件夹，先创建一个Section
        const section = new Section(this.project, {
          text: fEntry.name,
          details: DetailsManager.markdownToDetails(fEntry.path),
          collisionBox: new CollisionBox([new Rectangle(currentLocation.clone(), Vector.getZero())]),
        });
        this.project.stageManager.add(section);
        if (currentSection) {
          this.project.stageManager.goInSection([section], currentSection);
        }
        // 然后递归处理子文件夹
        if (fEntry.children) {
          for (const child of fEntry.children) {
            dfs(child, section);
          }
        }
        return section;
      }
    };
    const rootEntity = dfs(folderStructure);
    this.project.stageManager.clearSelectAll();
    rootEntity.isSelected = true;
  }

  async generateTreeFromFolder(folderPath: string): Promise<void> {
    const folderStructure = await readFolderStructure(folderPath);
    // 当前的放置点位
    const currentLocation = this.project.camera.location.clone();

    let yIndex = 0;

    const dfs = (fEntry: FolderEntry, depth: number, parentNode: TextNode | null) => {
      // 无论是文件还是文件夹，都创建一个TextNode
      const position = currentLocation.add(new Vector(depth * 150, yIndex * 50)); // x间距150，y间距50
      yIndex++;

      const node = new TextNode(this.project, {
        text: fEntry.name,
        details: DetailsManager.markdownToDetails(fEntry.path),
        collisionBox: new CollisionBox([new Rectangle(position, Vector.getZero())]),
        color: this.getColorByPath(fEntry.path),
      });
      // 如果是文件夹，且没有颜色（getColorByPath返回透明），可以给个默认颜色区分？
      // 暂时保持一致，文件夹透明，文件有颜色

      this.project.stageManager.add(node);
      // 自动调整大小
      node.forceAdjustSizeByText();

      if (parentNode) {
        // 创建连线
        const edge = new LineEdge(this.project, {
          associationList: [parentNode, node],
          sourceRectangleRate: new Vector(0.99, 0.5), // 父节点右侧
          targetRectangleRate: new Vector(0.01, 0.5), // 子节点左侧
        });
        this.project.stageManager.add(edge);
      }

      if (fEntry.children) {
        for (const child of fEntry.children) {
          dfs(child, depth + 1, node);
        }
      }
      return node;
    };

    dfs(folderStructure, 0, null);
    this.project.historyManager.recordStep();
  }

  private getColorByPath(path: string): Color {
    if (path.includes(".")) {
      const ext = path.split(".").pop() as string;
      if (ext in GenerateFromFolder.fileExtColorMap) {
        return Color.fromHex(GenerateFromFolder.fileExtColorMap[ext]);
      } else {
        return Color.Transparent;
      }
    } else {
      return Color.Transparent;
    }
  }

  static fileExtColorMap: Record<string, string> = {
    txt: "#000000",
    md: "#000000",
    html: "#4ec9b0",
    css: "#da70cb",
    js: "#dcdcaa",
    mp4: "#181818",
    mp3: "#ca64ea",
    png: "#7a9a81",
    psd: "#001d26",
    jpg: "#49644e",
    jpeg: "#49644e",
    gif: "#ffca28",
  };
}

/**
 * 文件结构类型
 */
export type FolderEntry = {
  name: string;
  path: string;
  is_file: boolean;
  children?: FolderEntry[];
};

function readFolderStructure(path: string): Promise<FolderEntry> {
  // 不可能是isWeb的情况了
  return invoke("read_folder_structure", { path });
}

/**
 * 根据当前快捷键配置生成键盘布局图
 * @param project 项目实例
 */
export async function generateKeyboardLayout(project: Project): Promise<void> {
  // 标准QWERTY键盘布局
  const keyboardLayout: {
    row: number;
    col: number;
    key: string;
    width?: number; // 默认1，特殊键可能更宽
  }[] = [
    // 第一行：数字行
    { row: 0, col: 0, key: "`" },
    { row: 0, col: 1, key: "1" },
    { row: 0, col: 2, key: "2" },
    { row: 0, col: 3, key: "3" },
    { row: 0, col: 4, key: "4" },
    { row: 0, col: 5, key: "5" },
    { row: 0, col: 6, key: "6" },
    { row: 0, col: 7, key: "7" },
    { row: 0, col: 8, key: "8" },
    { row: 0, col: 9, key: "9" },
    { row: 0, col: 10, key: "0" },
    { row: 0, col: 11, key: "-" },
    { row: 0, col: 12, key: "=" },
    { row: 0, col: 13, key: "backspace", width: 2 },
    // 第二行：QWERTY行
    { row: 1, col: 0, key: "tab", width: 1.5 },
    { row: 1, col: 1.5, key: "q" },
    { row: 1, col: 2.5, key: "w" },
    { row: 1, col: 3.5, key: "e" },
    { row: 1, col: 4.5, key: "r" },
    { row: 1, col: 5.5, key: "t" },
    { row: 1, col: 6.5, key: "y" },
    { row: 1, col: 7.5, key: "u" },
    { row: 1, col: 8.5, key: "i" },
    { row: 1, col: 9.5, key: "o" },
    { row: 1, col: 10.5, key: "p" },
    { row: 1, col: 11.5, key: "[" },
    { row: 1, col: 12.5, key: "]" },
    { row: 1, col: 13.5, key: "\\", width: 1.5 },
    // 第三行：ASDF行
    { row: 2, col: 0, key: "capslock", width: 1.75 },
    { row: 2, col: 1.75, key: "a" },
    { row: 2, col: 2.75, key: "s" },
    { row: 2, col: 3.75, key: "d" },
    { row: 2, col: 4.75, key: "f" },
    { row: 2, col: 5.75, key: "g" },
    { row: 2, col: 6.75, key: "h" },
    { row: 2, col: 7.75, key: "j" },
    { row: 2, col: 8.75, key: "k" },
    { row: 2, col: 9.75, key: "l" },
    { row: 2, col: 10.75, key: ";" },
    { row: 2, col: 11.75, key: "'" },
    { row: 2, col: 12.75, key: "enter", width: 2.25 },
    // 第四行：ZXCV行
    { row: 3, col: 0, key: "shift", width: 2.25 },
    { row: 3, col: 2.25, key: "z" },
    { row: 3, col: 3.25, key: "x" },
    { row: 3, col: 4.25, key: "c" },
    { row: 3, col: 5.25, key: "v" },
    { row: 3, col: 6.25, key: "b" },
    { row: 3, col: 7.25, key: "n" },
    { row: 3, col: 8.25, key: "m" },
    { row: 3, col: 9.25, key: "," },
    { row: 3, col: 10.25, key: "." },
    { row: 3, col: 11.25, key: "/" },
    { row: 3, col: 12.25, key: "shift", width: 2.75 },
    // 第五行：空格行
    { row: 4, col: 0, key: "ctrl", width: 1.25 },
    { row: 4, col: 1.25, key: "alt", width: 1.25 },
    { row: 4, col: 2.5, key: " ", width: 6 }, // 空格键
    { row: 4, col: 8.5, key: "alt", width: 1.25 },
    { row: 4, col: 9.75, key: "ctrl", width: 1.25 },
  ];

  const keyWidth = 60; // 标准键宽度
  const keyHeight = 60; // 标准键高度
  const keyGap = 30; // 键之间的间距（增大）
  const rowGap = 40; // 行之间的间距（增大）

  // 获取当前快捷键配置
  const keyBindEntries = await project.keyBinds.entries();
  const keyBindMap = new Map<string, { key: string; isEnabled: boolean }>();

  for (const [id, config] of keyBindEntries) {
    if (typeof config === "string") {
      keyBindMap.set(id, { key: config, isEnabled: true });
    } else {
      keyBindMap.set(id, { key: config.key, isEnabled: config.isEnabled !== false });
    }
  }

  // 获取所有快捷键的翻译信息
  const keyBindInfoMap = new Map<string, { title: string; description: string; keySequence: string }>();
  for (const keyBind of allKeyBinds.filter((kb) => !kb.isGlobal)) {
    const config = keyBindMap.get(keyBind.id);
    if (config && config.isEnabled) {
      // 获取翻译文本
      const translation = i18next.t(`${keyBind.id}`, { ns: "keyBinds", returnObjects: true }) as {
        title?: string;
        description?: string;
      };
      const title = translation?.title || keyBind.id;
      const description = translation?.description || "";

      keyBindInfoMap.set(keyBind.id, {
        title,
        description,
        keySequence: config.key,
      });
    }
  }

  // 创建键节点映射
  const keyNodeMap = new Map<string, TextNode>();
  const currentLocation = project.camera.location.clone();

  // 计算键盘总宽度和起始位置
  const maxCol = Math.max(...keyboardLayout.map((k) => k.col + (k.width || 1)));
  const keyboardWidth = maxCol * (keyWidth + keyGap);
  const startX = currentLocation.x - keyboardWidth / 2;
  const startY = currentLocation.y;

  // 创建所有键节点
  for (const keyInfo of keyboardLayout) {
    const key = keyInfo.key;
    const width = (keyInfo.width || 1) * keyWidth + (keyInfo.width || 1 - 1) * keyGap;
    const height = keyHeight;
    const x = startX + keyInfo.col * (keyWidth + keyGap);
    const y = startY + keyInfo.row * (keyHeight + rowGap);

    const keyNode = new TextNode(project, {
      text: formatKeyDisplay(key),
      collisionBox: new CollisionBox([new Rectangle(new Vector(x, y), new Vector(width, height))]),
      color: Color.Transparent,
    });
    project.stageManager.add(keyNode);

    // 使用唯一标识符：row-col-key 来避免重复键名的问题
    const uniqueKey = `${keyInfo.row}-${keyInfo.col}-${key.toLowerCase()}`;
    keyNodeMap.set(uniqueKey, keyNode);
    // 同时也用键名映射，方便查找
    if (!keyNodeMap.has(key.toLowerCase())) {
      keyNodeMap.set(key.toLowerCase(), keyNode);
    }
  }

  // 为每个已使用的快捷键创建连接和标注
  const usedKeys = new Set<string>();
  const keyBindGroups = new Map<string, string[]>(); // 键 -> 快捷键ID列表

  for (const [keyBindId, config] of keyBindMap.entries()) {
    if (!config.isEnabled) continue;

    // 解析快捷键序列（可能包含多个按键，如 "C-k C-t"）
    const keySequence = config.key.split(" ");
    for (const keyStr of keySequence) {
      const parsed = parseSingleEmacsKey(keyStr);
      const baseKey = parsed.key.toLowerCase();

      // 跳过特殊键（鼠标、滚轮等）
      if (baseKey.startsWith("<") && baseKey.endsWith(">")) {
        continue;
      }

      // 记录使用的键
      usedKeys.add(baseKey);

      // 记录快捷键信息
      if (!keyBindGroups.has(baseKey)) {
        keyBindGroups.set(baseKey, []);
      }
      keyBindGroups.get(baseKey)!.push(keyBindId);
    }
  }

  // 为使用的键添加颜色标记
  for (const [key, node] of keyNodeMap.entries()) {
    if (usedKeys.has(key)) {
      node.color = new Color(100, 200, 100, 255); // 浅绿色表示已使用
    }
  }

  // 计算键盘整体的外接矩形
  const keyboardNodes = Array.from(keyNodeMap.values());
  const keyboardBoundingRect = Rectangle.getBoundingRectangle(
    keyboardNodes.map((node) => node.collisionBox.getRectangle()),
  );

  // 按照分组组织快捷键
  const keyboardGap = 100; // 键盘和标注区域之间的间距
  const sectionSpacingX = 50; // Section之间的水平间距
  const sectionSpacingY = 50; // Section之间的垂直间距
  const nodeSpacingX = 20; // Section内节点之间的水平间距
  const nodeSpacingY = 20; // Section内节点之间的垂直间距
  const sectionPadding = 40; // Section内边距

  // 标注区域的起始位置（键盘右侧）
  let currentSectionX = keyboardBoundingRect.right + keyboardGap;
  let currentSectionY = keyboardBoundingRect.top;

  // 存储所有标注节点和连接信息
  const annotationNodes: Array<{ node: TextNode; keyNode: TextNode }> = [];

  // 获取所有已分组的快捷键ID
  const groupedKeyBindIds = new Set<string>();
  for (const group of shortcutKeysGroups) {
    for (const keyBindId of group.keys) {
      groupedKeyBindIds.add(keyBindId);
    }
  }

  // 获取未分类的快捷键
  const ungroupedKeyBindIds: string[] = [];
  for (const keyBind of allKeyBinds.filter((kb) => !kb.isGlobal)) {
    const config = keyBindMap.get(keyBind.id);
    if (config && config.isEnabled && !groupedKeyBindIds.has(keyBind.id)) {
      ungroupedKeyBindIds.push(keyBind.id);
    }
  }

  // 创建所有分组（包括未分类的）
  const allGroups = [
    ...shortcutKeysGroups,
    ...(ungroupedKeyBindIds.length > 0 ? [{ title: "otherKeys", keys: ungroupedKeyBindIds }] : []),
  ];

  // 遍历每个分组
  for (const group of allGroups) {
    // 收集该分组中已启用的快捷键
    const groupKeyBinds: Array<{
      keyNode: TextNode;
      keyBindId: string;
      info: { title: string; description: string; keySequence: string };
    }> = [];

    for (const keyBindId of group.keys) {
      const config = keyBindMap.get(keyBindId);
      if (!config || !config.isEnabled) continue;

      // 找到该快捷键使用的键
      const keySequence = config.key.split(" ");
      for (const keyStr of keySequence) {
        const parsed = parseSingleEmacsKey(keyStr);
        const baseKey = parsed.key.toLowerCase();

        // 跳过特殊键（鼠标、滚轮等）
        if (baseKey.startsWith("<") && baseKey.endsWith(">")) {
          continue;
        }

        const keyNode = keyNodeMap.get(baseKey);
        if (keyNode) {
          const info = keyBindInfoMap.get(keyBindId) || { title: keyBindId, description: "", keySequence: "" };
          groupKeyBinds.push({ keyNode, keyBindId, info });
          break; // 每个快捷键只记录一次
        }
      }
    }

    // 如果该分组没有已启用的快捷键，跳过
    if (groupKeyBinds.length === 0) continue;

    // 计算Section内节点的布局
    const nodesPerRow = Math.ceil(Math.sqrt(groupKeyBinds.length * 1.5)); // 稍微宽一点
    let maxRowHeight = 0;
    // let currentRow = 0;
    let currentCol = 0;
    let currentX = currentSectionX + sectionPadding;
    let currentY = currentSectionY + sectionPadding;

    const sectionNodes: TextNode[] = [];

    for (const { keyNode, info } of groupKeyBinds) {
      // 创建标注节点文本
      const annotationText = `${info.title}\n${info.keySequence}`;

      // 计算文本实际大小
      const fontSize = Renderer.FONT_SIZE;
      const textSize = getMultiLineTextSize(annotationText, fontSize, 1.5);
      const nodeSize = textSize.add(Vector.same(Renderer.NODE_PADDING).multiply(2));

      // 计算节点位置
      const nodeX = currentX;
      const nodeY = currentY;

      // 创建标注节点（不传颜色参数，使用默认透明色）
      const annotationNode = new TextNode(project, {
        text: annotationText,
        details: info.description ? DetailsManager.markdownToDetails(info.description) : [],
        collisionBox: new CollisionBox([new Rectangle(new Vector(nodeX, nodeY), nodeSize)]),
      });

      // 强制调整大小以确保正确
      annotationNode.forceAdjustSizeByText();

      // 获取实际大小
      const actualSize = annotationNode.collisionBox.getRectangle().size;
      maxRowHeight = Math.max(maxRowHeight, actualSize.y);

      project.stageManager.add(annotationNode);
      sectionNodes.push(annotationNode);
      annotationNodes.push({ node: annotationNode, keyNode });

      // 移动到下一个位置
      currentCol++;
      if (currentCol >= nodesPerRow) {
        currentCol = 0;
        // currentRow++;
        currentX = currentSectionX + sectionPadding;
        currentY += maxRowHeight + nodeSpacingY;
        maxRowHeight = 0;
      } else {
        currentX += actualSize.x + nodeSpacingX;
      }
    }

    // 创建Section框
    const sectionHeight = currentY + maxRowHeight - currentSectionY + sectionPadding;
    const sectionWidth =
      Math.max(...sectionNodes.map((node) => node.collisionBox.getRectangle().right)) -
      currentSectionX +
      sectionPadding;

    const section = new Section(project, {
      text: group.title,
      collisionBox: new CollisionBox([
        new Rectangle(new Vector(currentSectionX, currentSectionY), new Vector(sectionWidth, sectionHeight)),
      ]),
      children: [],
    });
    project.stageManager.add(section);

    // 将节点添加到Section中
    project.stageManager.goInSection(sectionNodes, section);

    // 调整Section大小
    section.adjustLocationAndSize();

    // 移动到下一个Section位置
    currentSectionX = section.collisionBox.getRectangle().right + sectionSpacingX;
    if (currentSectionX > keyboardBoundingRect.right + keyboardGap + 800) {
      // 如果太宽，换行
      currentSectionX = keyboardBoundingRect.right + keyboardGap;
      currentSectionY = section.collisionBox.getRectangle().bottom + sectionSpacingY;
    }
  }

  // 创建连接线（绿色，alpha 0.2）
  const edgeColor = new Color(0, 255, 0, 0.2); // 绿色，alpha 0.2
  for (const { node: annotationNode, keyNode } of annotationNodes) {
    const edge = new LineEdge(project, {
      associationList: [keyNode, annotationNode],
      sourceRectangleRate: new Vector(0.99, 0.5), // 从键节点右侧中心
      targetRectangleRate: new Vector(0.01, 0.5), // 到标注节点左侧中心
      color: edgeColor,
    });
    project.stageManager.add(edge);
  }

  // 记录历史步骤
  project.historyManager.recordStep();
}

/**
 * 格式化键的显示文本
 */
function formatKeyDisplay(key: string): string {
  const displayMap: Record<string, string> = {
    " ": "Space",
    backspace: "Backspace",
    tab: "Tab",
    capslock: "Caps",
    enter: "Enter",
    shift: "Shift",
    ctrl: "Ctrl",
    alt: "Alt",
  };
  return displayMap[key.toLowerCase()] || key.toUpperCase();
}
