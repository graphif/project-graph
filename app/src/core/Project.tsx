import { Dialog } from "@/components/ui/dialog";
import type { CurveRenderer } from "@/core/render/canvas2d/basicRenderer/curveRenderer";
import type { ImageRenderer } from "@/core/render/canvas2d/basicRenderer/ImageRenderer";
import type { ShapeRenderer } from "@/core/render/canvas2d/basicRenderer/shapeRenderer";
import type { SvgRenderer } from "@/core/render/canvas2d/basicRenderer/svgRenderer";
import type { TextRenderer } from "@/core/render/canvas2d/basicRenderer/textRenderer";
import type { DrawingControllerRenderer } from "@/core/render/canvas2d/controllerRenderer/drawingRenderer";
import type { CollisionBoxRenderer } from "@/core/render/canvas2d/entityRenderer/CollisionBoxRenderer";
import type { StraightEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/StraightEdgeRenderer";
import type { SymmetryCurveEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/SymmetryCurveEdgeRenderer";
import type { VerticalPolyEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/VerticalPolyEdgeRenderer";
import type { EdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRenderer";
import type { EntityDetailsButtonRenderer } from "@/core/render/canvas2d/entityRenderer/EntityDetailsButtonRenderer";
import type { EntityRenderer } from "@/core/render/canvas2d/entityRenderer/EntityRenderer";
import type { MultiTargetUndirectedEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/multiTargetUndirectedEdge/MultiTargetUndirectedEdgeRenderer";
import type { ReferenceBlockRenderer } from "@/core/render/canvas2d/entityRenderer/ReferenceBlockRenderer";
import type { SectionRenderer } from "@/core/render/canvas2d/entityRenderer/section/SectionRenderer";
import type { SvgNodeRenderer } from "@/core/render/canvas2d/entityRenderer/svgNode/SvgNodeRenderer";
import type { TextNodeRenderer } from "@/core/render/canvas2d/entityRenderer/textNode/TextNodeRenderer";
import type { UrlNodeRenderer } from "@/core/render/canvas2d/entityRenderer/urlNode/urlNodeRenderer";
import type { Renderer } from "@/core/render/canvas2d/renderer";
import type { BackgroundRenderer } from "@/core/render/canvas2d/utilsRenderer/backgroundRenderer";
import type { RenderUtils } from "@/core/render/canvas2d/utilsRenderer/RenderUtils";
import type { SearchContentHighlightRenderer } from "@/core/render/canvas2d/utilsRenderer/searchContentHighlightRenderer";
import type { WorldRenderUtils } from "@/core/render/canvas2d/utilsRenderer/WorldRenderUtils";
import type { InputElement } from "@/core/render/domElement/inputElement";
import type { AutoLayoutFastTree } from "@/core/service/controlService/autoLayoutEngine/autoLayoutFastTreeMode";
import type { AutoLayout } from "@/core/service/controlService/autoLayoutEngine/mainTick";
import type { ControllerUtils } from "@/core/service/controlService/controller/concrete/utilsControl";
import type { Controller } from "@/core/service/controlService/controller/Controller";
import type { KeyboardOnlyEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyEngine";
import type { KeyboardOnlyGraphEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyGraphEngine";
import type { KeyboardOnlyTreeEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyTreeEngine";
import type { SelectChangeEngine } from "@/core/service/controlService/keyboardOnlyEngine/selectChangeEngine";
import type { RectangleSelect } from "@/core/service/controlService/rectangleSelectEngine/rectangleSelectEngine";
import type { KeyBindHintEngine } from "@/core/service/controlService/shortcutKeysEngine/KeyBindHintEngine";
import type { MouseInteraction } from "@/core/service/controlService/stageMouseInteractionCore/stageMouseInteractionCore";
import type { AutoComputeUtils } from "@/core/service/dataGenerateService/autoComputeEngine/AutoComputeUtils";
import type { AutoCompute } from "@/core/service/dataGenerateService/autoComputeEngine/mainTick";
import type { GenerateFromFolder } from "@/core/service/dataGenerateService/generateFromFolderEngine/GenerateFromFolderEngine";
import type { StageExport } from "@/core/service/dataGenerateService/stageExportEngine/stageExportEngine";
import type { StageExportPng } from "@/core/service/dataGenerateService/stageExportEngine/StageExportPng";
import type { StageExportSvg } from "@/core/service/dataGenerateService/stageExportEngine/StageExportSvg";
import type { StageImport } from "@/core/service/dataGenerateService/stageImportEngine/stageImportEngine";
import type { AIEngine } from "@/core/service/dataManageService/aiEngine/AIEngine";
import type { ComplexityDetector } from "@/core/service/dataManageService/ComplexityDetector";
import type { ContentSearch } from "@/core/service/dataManageService/contentSearchEngine/contentSearchEngine";
import type { CopyEngine } from "@/core/service/dataManageService/copyEngine/copyEngine";
import type { Effects } from "@/core/service/feedbackService/effectEngine/effectMachine";
import { StageStyleManager } from "@/core/service/feedbackService/stageStyle/StageStyleManager";
import type { Camera } from "@/core/stage/Camera";
import type { Canvas } from "@/core/stage/Canvas";
import { GraphMethods } from "@/core/stage/stageManager/basicMethods/GraphMethods";
import { SectionMethods } from "@/core/stage/stageManager/basicMethods/SectionMethods";
import type { LayoutManager } from "@/core/stage/stageManager/concreteMethods/LayoutManager";
import type { SectionCollisionSolver } from "@/core/stage/stageManager/concreteMethods/SectionCollisionSolver";
import type { AutoAlign } from "@/core/stage/stageManager/concreteMethods/StageAutoAlignManager";
import type { DeleteManager } from "@/core/stage/stageManager/concreteMethods/StageDeleteManager";
import type { EntityMoveManager } from "@/core/stage/stageManager/concreteMethods/StageEntityMoveManager";
import type { StageUtils } from "@/core/stage/stageManager/concreteMethods/StageManagerUtils";
import type { MultiTargetEdgeMove } from "@/core/stage/stageManager/concreteMethods/StageMultiTargetEdgeMove";
import type { NodeAdder } from "@/core/stage/stageManager/concreteMethods/StageNodeAdder";
import type { NodeConnector } from "@/core/stage/stageManager/concreteMethods/StageNodeConnector";
import type { StageNodeRotate } from "@/core/stage/stageManager/concreteMethods/stageNodeRotate";
import type { StageObjectColorManager } from "@/core/stage/stageManager/concreteMethods/StageObjectColorManager";
import type { StageObjectSelectCounter } from "@/core/stage/stageManager/concreteMethods/StageObjectSelectCounter";
import type { SectionInOutManager } from "@/core/stage/stageManager/concreteMethods/StageSectionInOutManager";
import type { SectionPackManager } from "@/core/stage/stageManager/concreteMethods/StageSectionPackManager";
import type { StageSyncAssociationManager } from "@/core/stage/stageManager/concreteMethods/StageSyncAssociationManager";
import type { TagManager } from "@/core/stage/stageManager/concreteMethods/StageTagManager";
import { HistoryManager } from "@/core/stage/stageManager/StageHistoryManager";
import type { StageManager } from "@/core/stage/stageManager/StageManager";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { nextProjectIdAtom, store, tabsAtom } from "@/state";
import { createDefaultMetadata, isValidMetadata, PrgMetadata } from "@/types/metadata";
import { deserialize, serialize } from "@graphif/serializer";
import { Decoder, Encoder } from "@msgpack/msgpack";
import { BlobReader, BlobWriter, Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import md5 from "md5";
import mime from "mime";
import { File } from "lucide-react";
import React from "react";
import { URI } from "vscode-uri";
import { AutoSaveBackupService } from "./service/dataFileService/AutoSaveBackupService";
import { ProjectUpgrader } from "./stage/ProjectUpgrader";
import { ReferenceManager } from "./stage/stageManager/concreteMethods/StageReferenceManager";
import { Tab } from "./Tab";

if (import.meta.hot) {
  import.meta.hot.accept();
}

export enum ProjectState {
  /**
   * “已保存”
   * 已写入到原始文件中
   * 已上传到云端
   */
  Saved,
  /**
   * "已暂存"
   * 未写入到原始文件中，但是已经暂存到数据目录
   * 未上传到云端，但是已经暂存到本地
   */
  Stashed,
  /**
   * “未保存”
   * 未写入到原始文件中，也未暂存到数据目录（真·未保存）
   * 未上传到云端，也未暂存到本地
   */
  Unsaved,
}

/**
 * “工程”
 * 一个标签页对应一个工程，一个工程只能对应一个URI
 * 一个工程可以加载不同的服务，类似vscode的扩展（Extensions）机制
 */
export class Project extends Tab {
  static readonly latestVersion = 18;

  /**
   * 工程文件的URI
   * key: 服务ID
   * value: 服务实例
   */
  private _uri: URI;
  private _projectState: ProjectState = ProjectState.Unsaved;
  private _isSaving = false;
  public stage: StageObject[] = [];
  public tags: string[] = [];
  /**
   * string：UUID
   * value: Blob
   */
  public attachments = new Map<string, Blob>();
  /**
   * 创建Encoder对象比直接用encode()快
   * @see https://github.com/msgpack/msgpack-javascript#reusing-encoder-and-decoder-instances
   */
  private encoder = new Encoder();
  private decoder = new Decoder();

  /**
   * 创建一个项目
   * @param uri 工程文件的URI
   * 之所以从“路径”改为了“URI”，是因为要为后面的云同步功能做铺垫。
   * 普通的“路径”无法表示云盘中的文件，而URI可以。
   * 同时，草稿文件也从硬编码的“Project Graph”特殊文件路径改为了协议为draft、内容为UUID的URI。
   * @see https://code.visualstudio.com/api/references/vscode-api#workspace.workspaceFile
   */
  constructor(uri: URI) {
    super({});
    this._uri = uri;
  }
  /**
   * 创建一个草稿工程
   * URI为draft:UUID
   */
  static newDraft(): Project {
    // const num = store.get(tabsAtom).filter((p) => p.isDraft).length + 1;
    if (store.get(tabsAtom).length === 0) store.set(nextProjectIdAtom, 1);
    const num = store.get(nextProjectIdAtom);
    const uri = URI.parse("draft:" + num);
    store.set(nextProjectIdAtom, num + 1);
    return new Project(uri);
  }

  /**
   * 比较两个版本号字符串（格式：x.y.z）
   * @param version1 版本1
   * @param version2 版本2
   * @returns 如果 version1 < version2 返回 -1，如果 version1 > version2 返回 1，如果相等返回 0
   */
  private compareVersion(version1: string, version2: string): number {
    const v1Parts = version1.split(".").map(Number);
    const v2Parts = version2.split(".").map(Number);
    const maxLength = Math.max(v1Parts.length, v2Parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    return 0;
  }

  /**
   * 检查是否需要升级，如果需要则显示确认对话框
   * @param currentVersion 当前文件版本
   * @param latestVersion 最新版本
   */
  private async checkAndConfirmUpgrade(currentVersion: string, latestVersion: string): Promise<boolean> {
    const versionDiff = this.compareVersion(currentVersion, latestVersion);

    // 文件版本 > 软件版本：文件来自更新版本的软件，当前软件无法安全解析，拒绝打开
    if (versionDiff > 0) {
      await Dialog.buttons(
        "文件版本过新，无法打开",
        `该文件由更新版本的软件保存（prg文件版本 ${currentVersion}，当前软件支持的prg最高版本 ${latestVersion}）。\n\n请升级软件后再打开此文件，以避免数据损坏。`,
        [{ id: "ok", label: "确定" }],
      );
      return false;
    }

    // 文件版本 == 软件版本：无需升级，直接打开
    if (versionDiff === 0) {
      return true;
    }

    // 文件版本 < 软件版本：需要升级旧文件，弹出确认对话框
    const response = await Dialog.buttons(
      "检测到旧版本项目文件",
      `当前文件版本为 ${currentVersion}，需要升级到 ${latestVersion} (是prg文件版本,非软件版本)。\n\n升级过程不可逆且可能存在风险，特别是对于大型文件，建议提前备份。是否继续升级？`,
      [
        { id: "cancel", label: "取消", variant: "ghost" },
        { id: "upgrade", label: "确认升级" },
      ],
    );

    if (response === "cancel") {
      // 用户取消升级，返回 false 表示取消
      return false;
    }

    // 添加延迟，确保用户看到提示并给系统时间处理
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  /**
   * 解析项目文件（ZIP格式），提取所有数据
   * @returns 解析后的数据对象
   */
  private async parseProjectFile(): Promise<{
    serializedStageObjects: any[];
    tags: string[];
    references: { sections: Record<string, string[]>; files: string[] };
    metadata: PrgMetadata;
    readme?: string;
  }> {
    const fileContent = await this.fs.read(this.uri);
    const reader = new ZipReader(new Uint8ArrayReader(fileContent));
    const entries = await reader.getEntries();

    let serializedStageObjects: any[] = [];
    let tags: string[] = [];
    let references: { sections: Record<string, string[]>; files: string[] } = { sections: {}, files: [] };
    let metadata: PrgMetadata = createDefaultMetadata("2.0.0");
    let readme: string | undefined = undefined;

    for (const entry of entries) {
      if (entry.filename === "stage.msgpack") {
        const stageRawData = await entry.getData!(new Uint8ArrayWriter());
        serializedStageObjects = this.decoder.decode(stageRawData) as any[];
      } else if (entry.filename === "tags.msgpack") {
        const tagsRawData = await entry.getData!(new Uint8ArrayWriter());
        tags = this.decoder.decode(tagsRawData) as string[];
      } else if (entry.filename === "reference.msgpack") {
        const referenceRawData = await entry.getData!(new Uint8ArrayWriter());
        references = this.decoder.decode(referenceRawData) as { sections: Record<string, string[]>; files: string[] };
      } else if (entry.filename === "metadata.msgpack") {
        const metadataRawData = await entry.getData!(new Uint8ArrayWriter());
        const decodedMetadata = this.decoder.decode(metadataRawData) as any;
        // 验证并规范化 metadata
        if (isValidMetadata(decodedMetadata)) {
          metadata = decodedMetadata;
        } else {
          // 如果格式不正确，使用默认值
          metadata = createDefaultMetadata("2.0.0");
        }
      } else if (entry.filename === "README.md") {
        const readmeRawData = await entry.getData!(new Uint8ArrayWriter());
        readme = new TextDecoder().decode(readmeRawData);
      } else if (entry.filename.startsWith("attachments/")) {
        const match = entry.filename.trim().match(/^attachments\/([a-zA-Z0-9-]+)\.([a-zA-Z0-9]+)$/);
        if (!match) {
          console.warn("[Project] 附件文件名不符合规范: %s", entry.filename);
          continue;
        }
        const uuid = match[1];
        const ext = match[2];
        const type = mime.getType(ext) || "application/octet-stream";
        const attachment = await entry.getData!(new BlobWriter(type));
        this.attachments.set(uuid, attachment);
      }
    }

    return { serializedStageObjects, tags, references, metadata, readme };
  }

  /**
   * 服务加载完成后再调用
   */
  async init() {
    if (!(await this.fs.exists(this.uri))) {
      return;
    }
    try {
      // 解析项目文件
      const { serializedStageObjects, tags, references, metadata, readme } = await this.parseProjectFile();

      // 检查并确认升级
      const currentVersion = metadata?.version || "2.0.0";
      const latestVersion = ProjectUpgrader.NLatestVersion;
      const confirmed = await this.checkAndConfirmUpgrade(currentVersion, latestVersion);
      if (!confirmed) return; // 用户取消升级，不打开文件，跳过 this.projectState = ProjectState.Saved

      // 升级数据
      const [upgradedStageObjects, upgradedMetadata] = ProjectUpgrader.upgradeNAnyToNLatest(
        serializedStageObjects,
        metadata as any,
      );

      // 应用升级后的数据
      this.stage = deserialize(upgradedStageObjects, this);
      this.tags = tags;
      this.references = references;
      this.metadata = upgradedMetadata;
      this.readme = readme;

      // 更新引用关系，包括双向线的偏移状态
      // 注意：这里需要在服务加载后才能调用，所以需要检查服务是否已加载
      if (this.getService("stageManager")) {
        this.stageManager.updateReferences();
      }
    } catch (e) {
      console.warn(e);
      await Dialog.buttons(
        "文件解析失败",
        `打开文件时发生错误，文件内容可能已损坏或与当前软件版本不兼容。\n\n错误信息：${e}`,
        [{ id: "ok", label: "确定" }],
      );
      return;
    }
    this.projectState = ProjectState.Saved;
  }

  get isDraft() {
    return this.uri.scheme === "draft";
  }
  get title(): string {
    return this.uri.scheme === "draft"
      ? `临时草稿 (${this.uri.path})`
      : this.uri.scheme === "file"
        ? this.uri.path.split("/").pop()!
        : this.uri.toString();
  }
  get icon() {
    return File;
  }
  get uri() {
    return this._uri;
  }
  set uri(uri: URI) {
    this._uri = uri;
    this.projectState = ProjectState.Unsaved;
  }

  /**
   * 将文件暂存到数据目录中（通常为~/.local/share）
   * ~/.local/share/liren.project-graph/stash/<normalizedUri>
   * @see https://code.visualstudio.com/blogs/2016/11/30/hot-exit-in-insiders
   *
   * 频繁用msgpack序列化不会卡吗？
   * 虽然JSON.stringify()在V8上面速度和msgpack差不多
   * 但是要考虑跨平台，目前linux和macos用的都是webkit，目前还没有JavaScriptCore相关的benchmark
   * 而且考虑到以后会把图片也放进文件里面，JSON肯定不合适了
   * @see https://github.com/msgpack/msgpack-javascript#benchmark
   */
  async stash() {
    // TODO: stash
  }
  async save() {
    try {
      this.isSaving = true;
      await this.fs.write(this.uri, await this.getFileContent());
      this.projectState = ProjectState.Saved;
    } finally {
      this.isSaving = false;
    }
  }

  // 反向引用数据
  public references: { sections: Record<string, string[]>; files: string[] } = { sections: {}, files: [] };
  public metadata: PrgMetadata = createDefaultMetadata(ProjectUpgrader.NLatestVersion);
  public readme?: string;

  // 备份也要用到这个
  async getFileContent() {
    const serializedStage = serialize(this.stage);
    const encodedStage = this.encoder.encode(serializedStage);
    const uwriter = new Uint8ArrayWriter();

    const writer = new ZipWriter(uwriter); // zip writer用于把zip文件写入uint8array writer
    writer.add("stage.msgpack", new Uint8ArrayReader(encodedStage));
    writer.add("tags.msgpack", new Uint8ArrayReader(this.encoder.encode(this.tags)));
    writer.add("reference.msgpack", new Uint8ArrayReader(this.encoder.encode(this.references)));
    writer.add("metadata.msgpack", new Uint8ArrayReader(this.encoder.encode(this.metadata)));
    if (this.readme) {
      writer.add("README.md", new Uint8ArrayReader(new TextEncoder().encode(this.readme)));
    }
    // 添加附件
    for (const [uuid, attachment] of this.attachments.entries()) {
      writer.add(`attachments/${uuid}.${mime.getExtension(attachment.type)}`, new BlobReader(attachment));
    }
    await writer.close();

    const fileContent = await uwriter.getData();
    return fileContent;
  }

  /**
   * 备份用：生成项目内容的哈希值，用于检测内容是否发生变化
   */
  get stageHash() {
    const serializedStage = serialize(this.stage);
    // 创建临时Encoder来编码数据
    const tempEncoder = new Encoder();
    const encodedStage = tempEncoder.encode(serializedStage);
    return md5(encodedStage);
  }

  /**
   * 注册一个文件管理器
   * @param scheme 目前有 "file" | "draft"， 以后可能有其他的协议
   */

  addAttachment(data: Blob) {
    const uuid = crypto.randomUUID();
    this.attachments.set(uuid, data);
    return uuid;
  }

  set projectState(state: ProjectState) {
    if (state === this._projectState) return;
    this._projectState = state;
    this.emit("state-change", state);
  }

  get projectState(): ProjectState {
    return this._projectState;
  }

  set isSaving(isSaving: boolean) {
    if (isSaving === this._isSaving) return;
    this._isSaving = isSaving;
    this.emit("state-change", this._projectState);
  }

  get isSaving(): boolean {
    return this._isSaving;
  }

  private containerRef = React.createRef<HTMLDivElement>();

  /**
   * 立刻加载一个新的服务
   */
  loadService(service: { id?: string; new (...args: any[]): any }) {
    super.loadService(service);
    // 如果加载的是 canvas 服务，且容器已经准备好了，就进行挂载
    if (service.id === "canvas" && (this as any)._lastContainer) {
      this.canvas.mount((this as any)._lastContainer);
    }
  }

  componentDidMount(): void {
    // 这里的 this 是 Project 实例，不再作为 React 组件直接使用
  }

  private currentComponent: React.ComponentType | null = null;

  public getComponent(): React.ComponentType {
    if (this.currentComponent) return this.currentComponent;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.currentComponent = class extends React.Component {
      displayName = "ProjectContainer";
      private containerRef = React.createRef<HTMLDivElement>();

      componentDidMount(): void {
        (self as any)._lastContainer = this.containerRef.current;
        if (this.containerRef.current && self.getService("canvas")) {
          self.canvas.mount(this.containerRef.current);
        }
      }

      render() {
        return <div className="absolute inset-0 overflow-hidden" ref={this.containerRef}></div>;
      }
    };
    return this.currentComponent as React.ComponentType;
  }

  render(): React.ReactNode {
    return <div className="absolute inset-0 overflow-hidden" ref={this.containerRef}></div>;
  }
}

declare module "./Project" {
  interface Project {
    canvas: Canvas;
    inputElement: InputElement;
    controllerUtils: ControllerUtils;
    autoComputeUtils: AutoComputeUtils;
    renderUtils: RenderUtils;
    worldRenderUtils: WorldRenderUtils;
    historyManager: HistoryManager;
    stageManager: StageManager;
    camera: Camera;
    effects: Effects;
    autoCompute: AutoCompute;
    rectangleSelect: RectangleSelect;
    stageNodeRotate: StageNodeRotate;
    complexityDetector: ComplexityDetector;
    aiEngine: AIEngine;
    copyEngine: CopyEngine;
    autoLayout: AutoLayout;
    autoLayoutFastTree: AutoLayoutFastTree;
    layoutManager: LayoutManager;
    autoAlign: AutoAlign;
    mouseInteraction: MouseInteraction;
    contentSearch: ContentSearch;
    deleteManager: DeleteManager;
    nodeAdder: NodeAdder;
    entityMoveManager: EntityMoveManager;
    stageUtils: StageUtils;
    multiTargetEdgeMove: MultiTargetEdgeMove;
    nodeConnector: NodeConnector;
    stageObjectColorManager: StageObjectColorManager;
    stageObjectSelectCounter: StageObjectSelectCounter;
    sectionInOutManager: SectionInOutManager;
    sectionPackManager: SectionPackManager;
    sectionCollisionSolver: SectionCollisionSolver;
    tagManager: TagManager;
    syncAssociationManager: StageSyncAssociationManager;
    keyboardOnlyEngine: KeyboardOnlyEngine;
    keyboardOnlyGraphEngine: KeyboardOnlyGraphEngine;
    keyboardOnlyTreeEngine: KeyboardOnlyTreeEngine;
    selectChangeEngine: SelectChangeEngine;
    textRenderer: TextRenderer;
    imageRenderer: ImageRenderer;
    referenceBlockRenderer: ReferenceBlockRenderer;
    shapeRenderer: ShapeRenderer;
    entityRenderer: EntityRenderer;
    edgeRenderer: EdgeRenderer;
    multiTargetUndirectedEdgeRenderer: MultiTargetUndirectedEdgeRenderer;
    curveRenderer: CurveRenderer;
    svgRenderer: SvgRenderer;
    drawingControllerRenderer: DrawingControllerRenderer;
    collisionBoxRenderer: CollisionBoxRenderer;
    entityDetailsButtonRenderer: EntityDetailsButtonRenderer;
    straightEdgeRenderer: StraightEdgeRenderer;
    symmetryCurveEdgeRenderer: SymmetryCurveEdgeRenderer;
    verticalPolyEdgeRenderer: VerticalPolyEdgeRenderer;
    sectionRenderer: SectionRenderer;
    svgNodeRenderer: SvgNodeRenderer;
    textNodeRenderer: TextNodeRenderer;
    urlNodeRenderer: UrlNodeRenderer;
    backgroundRenderer: BackgroundRenderer;
    searchContentHighlightRenderer: SearchContentHighlightRenderer;
    renderer: Renderer;
    controller: Controller;
    stageExport: StageExport;
    stageExportPng: StageExportPng;
    stageExportSvg: StageExportSvg;
    stageImport: StageImport;
    generateFromFolder: GenerateFromFolder;
    keyBindHintEngine: KeyBindHintEngine;
    sectionMethods: SectionMethods;
    graphMethods: GraphMethods;
    stageStyleManager: StageStyleManager;
    autoSaveBackup: AutoSaveBackupService;
    referenceManager: ReferenceManager;
  }
}

/**
 * 装饰器
 */
export const service =
  (id: string) =>
  <
    T extends {
      [x: string | number | symbol]: any;
      id?: string;
      new (...args: any[]): any;
    },
  >(
    target: T,
  ): T & { id: string } => {
    target.id = id;
    return target as T & { id: string };
  };
