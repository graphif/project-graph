import { loadAllServicesAfterInit, loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { Project } from "@/core/Project";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { ReferenceFileScanner } from "@/core/service/dataFileService/ReferenceFileScanner";
import { CrossFileContentQuery } from "@/core/service/dataGenerateService/crossFileContentQuery";
import { LogicNodeNameToRenderNameMap } from "@/core/service/dataGenerateService/autoComputeEngine/logicNodeNameEnum";
import { TextNodeSmartTools } from "@/core/service/dataManageService/textNodeSmartTools";
import { SubWindow } from "@/core/service/SubWindow";
import { ReferenceManager } from "@/core/stage/stageManager/concreteMethods/StageReferenceManager";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { LatexNode } from "@/core/stage/stageObject/entity/LatexNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeTabAtom, store, tabsAtom } from "@/state";
import AutoCompleteWindow from "@/sub/AutoCompleteWindow";
import { DateChecker } from "@/utils/dateChecker";
import { PathString } from "@/utils/pathString";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import Fuse from "fuse.js";
import _ from "lodash";
import katex from "katex";

/**
 * 自动将文本节点转换为引用块（支持自动创建新文件）
 *
 * 流程：
 * 1. 检测文本节点是否为 [[文件名]] 或 [[文件名#Section名]] 格式
 * 2. 优先在当前项目的引用文件夹中查找目标文件
 * 3. 找到文件：校验 Section 是否存在，然后直接创建引用块
 * 4. 未找到文件：自动创建新的 .prg 文件（含初始文本节点），切换到新项目，再创建引用块
 */
export async function autoChangeTextNodeToReferenceBlock(project: Project, textNode: TextNode) {
  if (!(textNode.text.startsWith("[[") && textNode.text.endsWith("]]"))) {
    return;
  }
  textNode.isSelected = true;

  const parserResult = ReferenceManager.referenceBlockTextParser(textNode.text);
  if (!parserResult.isValid) {
    toast.error(parserResult.invalidReason);
    return;
  }

  // 草稿项目不允许创建引用文件
  if (project.isDraft) {
    toast.error("草稿项目不能创建新引用文件");
    return;
  }

  // 优先在当前项目的引用文件夹中查找
  const foundPath = await ReferenceFileScanner.findFileInReferenceFolder(project.uri.fsPath, parserResult.fileName);

  if (foundPath) {
    // 文件已存在：加入最近文件列表，校验 Section，然后创建引用块
    await RecentFileManager.addRecentFileByUri(URI.file(foundPath));
    if (parserResult.sectionName) {
      const sections = await CrossFileContentQuery.getSectionsByFileName(parserResult.fileName);
      if (!sections.includes(parserResult.sectionName)) {
        toast.error(`文件【${parserResult.fileName}】中没有section【${parserResult.sectionName}】，不能创建引用`);
        return;
      }
    }
    await TextNodeSmartTools.changeTextNodeToReferenceBlock(project);
    return;
  }

  // 文件不存在：尝试从最近文件列表中查找（兼容旧逻辑）
  const recentFiles = await RecentFileManager.getRecentFiles();
  const recentFile = recentFiles.find(
    (item) => PathString.getFileNameFromPath(item.uri.fsPath) === parserResult.fileName,
  );
  if (recentFile) {
    if (parserResult.sectionName) {
      const sections = await CrossFileContentQuery.getSectionsByFileName(parserResult.fileName);
      if (!sections.includes(parserResult.sectionName)) {
        toast.error(`文件【${parserResult.fileName}】中没有section【${parserResult.sectionName}】，不能创建引用`);
        return;
      }
    }
    await TextNodeSmartTools.changeTextNodeToReferenceBlock(project);
    return;
  }

  // 文件完全不存在：自动在引用文件夹中创建新文件
  await ReferenceFileScanner.ensureReferenceFolderExists(project.uri.fsPath);
  const newUri = ReferenceFileScanner.getNewFileUri(project.uri.fsPath, parserResult.fileName);

  const newProject = Project.newDraft();
  newProject.uri = newUri;
  loadAllServicesBeforeInit(newProject);
  await newProject.init();
  loadAllServicesAfterInit(newProject);

  // 新文件中创建一个以文件名命名的初始文本节点
  const newTextNode = new TextNode(newProject, { text: parserResult.fileName });
  newProject.stageManager.add(newTextNode);
  newTextNode.isSelected = true;

  await newProject.save();
  await RecentFileManager.addRecentFileByUri(newUri);
  await ReferenceFileScanner.addFileToCache(project.uri.fsPath, parserResult.fileName);

  // 将新项目加入项目列表并切换
  store.set(tabsAtom, [...store.get(tabsAtom), newProject]);
  store.set(activeTabAtom, newProject);

  // 在原项目中创建引用块
  await TextNodeSmartTools.changeTextNodeToReferenceBlock(project);
}

/**
 * 自动将文本节点转换为 LaTeX 公式节点
 * 检测文本是否以 $ 开头和结尾（且长度 > 2），若是则创建 LatexNode 替换 TextNode
 */
export async function autoChangeTextNodeToLatexNode(project: Project, textNode: TextNode) {
  const text = textNode.text.trim();
  // 格式检测：以 $ 开头和结尾，且中间有内容
  if (!(text.startsWith("$") && text.endsWith("$") && text.length > 2)) {
    return;
  }
  // 防止误匹配 $$ 空公式（即 text = "$$"）
  const latexSource = text.slice(1, -1).trim();
  if (!latexSource) {
    return;
  }

  const location = textNode.collisionBox.getRectangle().location.clone();

  // 创建 LatexNode，放置在原 TextNode 相同位置
  const latexNode = new LatexNode(project, {
    latexSource,
    fontScaleLevel: 0,
    collisionBox: new CollisionBox([new Rectangle(location, Vector.getZero())]),
  });

  // 删除旧 TextNode（会自动清理关联边）
  project.deleteManager.deleteEntities([textNode]);

  // 添加新 LatexNode
  project.stageManager.add(latexNode);
  latexNode.isSelected = true;

  project.historyManager.recordStep();
}

/**
 * 管理文本节点编辑时的实时 LaTeX 预览浮层。
 *
 * 封装了以下职责：
 * - 预览 div 的创建、定位与销毁
 * - 异步竞态保护（requestId）
 * - 编辑结束后的一次性关闭标志（dismissed）
 * - 从文本+光标位置检测当前所在的 $...$ 片段
 */
export class LatexPreviewManager {
  private div: HTMLDivElement | null = null;
  private dismissed = false;
  private requestId = 0;

  /** 自增并返回最新请求 ID，用于异步竞态保护 */
  nextRequestId(): number {
    return ++this.requestId;
  }

  /** 返回当前最新请求 ID */
  currentRequestId(): number {
    return this.requestId;
  }

  /** 编辑是否已经结束（dismissed 后不再创建预览） */
  isDismissed(): boolean {
    return this.dismissed;
  }

  /** 移除预览 DOM，但保持可再次显示 */
  remove(): void {
    if (this.div) {
      this.div.remove();
      this.div = null;
    }
  }

  /** 编辑结束时调用，永久关闭预览，之后的异步回调不再触发 */
  dismiss(): void {
    this.dismissed = true;
    this.remove();
  }

  /**
   * 根据最新 LaTeX 内容和节点视图矩形，更新（或创建）预览浮层的内容与位置。
   * 若 katex 渲染出错则静默忽略。
   */
  update(latexContent: string, rectView: Rectangle): void {
    try {
      const previewHtml = katex.renderToString(latexContent || "\\ldots", {
        throwOnError: false,
        displayMode: true,
        output: "htmlAndMathml",
      });

      if (!this.div) {
        this.div = document.createElement("div");
        this.div.style.cssText = `
          position: fixed;
          z-index: 9999;
          background: var(--background, white);
          border: 1px solid rgba(128,128,128,0.4);
          border-radius: 6px;
          padding: 8px 12px;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          max-width: 500px;
        `;
        document.body.appendChild(this.div);
      }

      this.div.innerHTML = previewHtml;

      const margin = 8;
      const previewHeight = this.div.offsetHeight || 60;
      const previewWidth = this.div.offsetWidth || 200;
      let left = rectView.left;
      let top = rectView.top - previewHeight - margin;
      if (top < margin) {
        top = rectView.top + rectView.height + margin;
      }
      left = Math.max(margin, Math.min(left, window.innerWidth - previewWidth - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - previewHeight - margin));
      this.div.style.left = `${left}px`;
      this.div.style.top = `${top}px`;
    } catch {
      // 忽略渲染错误
    }
  }

  /**
   * 检测光标当前是否位于某个 $...$ 片段内，若是则返回其中的 LaTeX 字符串，否则返回 null。
   *
   * @param value  文本框的完整内容
   * @param cursor 光标位置（selectionStart）
   */
  static getInlineLatexAtCursor(value: string, cursor: number): string | null {
    const pos = Math.max(0, Math.min(cursor, value.length));
    const dollarIndices: number[] = [];
    for (let i = 0; i < value.length; i++) {
      if (value[i] === "$") dollarIndices.push(i);
    }
    let k = 0;
    while (k < dollarIndices.length && dollarIndices[k] < pos) k++;
    if (k % 2 === 0) return null;
    const start = dollarIndices[k - 1]!;
    const end = dollarIndices[k] ?? -1;
    const content = end === -1 ? value.slice(start + 1, pos) : value.slice(start + 1, end);
    return content;
  }
}

/**
 * 管理文本节点编辑时的自动补全弹窗。
 *
 * 支持两种触发格式：
 * - `#...` — 模糊匹配逻辑节点名称
 * - `[[...]]` — 模糊匹配最近文件名，含 `[[文件名#Section名]]` 格式
 */
export class AutoCompleteManager {
  private currentWindowId: string | undefined;

  constructor(private readonly project: Project) {}

  /** 根据当前输入文本决定触发哪种补全，无匹配前缀则不做任何事 */
  handle = _.debounce(
    (text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void) => {
      if (text.startsWith("#")) {
        this.handleLogic(text, node, ele, setWindowId);
      } else if (text.startsWith("[[")) {
        this.handleReference(text, node, ele, setWindowId);
      }
    },
    0,
    { leading: true, trailing: false },
  );

  private openWindow(
    node: TextNode,
    entries: Record<string, string>,
    onSelect: (value: string) => void,
    setWindowId: (id: string) => void,
  ) {
    if (this.currentWindowId) SubWindow.close(this.currentWindowId);
    const windowId = AutoCompleteWindow.open(
      this.project.renderer.transformWorld2View(node.rectangle).leftBottom,
      entries,
      onSelect,
    ).id;
    this.currentWindowId = windowId;
    setWindowId(windowId);
  }

  private handleLogic(text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void) {
    const searchText = text.replaceAll("#", "").toLowerCase();
    const logicNodeEntries = Object.entries(LogicNodeNameToRenderNameMap).map(([key, renderName]) => ({
      key,
      name: key.replaceAll("#", "").toLowerCase(),
      renderName,
    }));
    const fuse = new Fuse(logicNodeEntries, { keys: ["name"], threshold: 0.3 });
    const matchingNodes = fuse.search(searchText).map((r) => [r.item.key, r.item.renderName]);

    const tip =
      searchText === "" ? "暂无匹配的逻辑节点名称，请输入全大写字母" : `暂无匹配的逻辑节点名称【${searchText}】`;
    const entries = matchingNodes.length > 0 ? Object.fromEntries(matchingNodes) : { tip };
    this.openWindow(
      node,
      entries,
      (value) => {
        ele.value = value;
      },
      setWindowId,
    );
  }

  private handleReference = _.debounce(
    async (text: string, node: TextNode, ele: HTMLTextAreaElement, setWindowId: (id: string) => void) => {
      const searchText = text.slice(2).toLowerCase().replace("]]", "");
      if (!searchText.includes("#")) {
        await this.handleReferenceFile(searchText, node, ele, setWindowId);
      } else {
        await this.handleReferenceSection(searchText, node, ele, setWindowId);
      }
    },
    500,
  );

  private async handleReferenceFile(
    searchText: string,
    node: TextNode,
    ele: HTMLTextAreaElement,
    setWindowId: (id: string) => void,
  ) {
    const recentFiles = await RecentFileManager.getRecentFiles();
    const fileEntries = recentFiles.map((file) => ({
      name: PathString.getFileNameFromPath(file.uri.path),
      time: file.time,
    }));
    const fuse = new Fuse(fileEntries, { keys: ["name"], threshold: 0.3 });
    const matchingFiles = fuse
      .search(searchText)
      .map((r) => [r.item.name, DateChecker.formatRelativeTime(r.item.time)]);

    const tip = searchText === "" ? "暂无最近文件" : `暂无匹配的最近文件【${searchText}】`;
    const entries = matchingFiles.length > 0 ? Object.fromEntries(matchingFiles) : { tip };
    this.openWindow(
      node,
      entries,
      (value) => {
        ele.value = `[[${value}`;
      },
      setWindowId,
    );
  }

  private async handleReferenceSection(
    searchText: string,
    node: TextNode,
    ele: HTMLTextAreaElement,
    setWindowId: (id: string) => void,
  ) {
    const [fileName, sectionName] = searchText.split("#", 2);
    const sections = await CrossFileContentQuery.getSectionsByFileName(fileName);
    const sectionObjects = sections.map((s) => ({ name: s }));

    let results: { item: { name: string } }[];
    if (!sectionName?.trim()) {
      results = sectionObjects.slice(0, 20).map((item) => ({ item }));
    } else {
      results = new Fuse(sectionObjects, { keys: ["name"], threshold: 0.3 }).search(sectionName);
    }
    const matchingSections = results.map((r) => [r.item.name, ""]);

    const tip = sectionName === "" ? "这个文件中没有section，无法创建引用" : `暂无匹配的section【${sectionName}】`;
    const entries = matchingSections.length > 0 ? Object.fromEntries(matchingSections) : { tip };
    this.openWindow(
      node,
      entries,
      (value) => {
        ele.value = `[[${fileName}#${value}`;
      },
      setWindowId,
    );
  }
}
