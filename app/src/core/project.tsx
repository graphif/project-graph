import { Dialog } from "@/components/ui/dialog";
import type { CurveRenderer } from "@/core/render/canvas2d/basic-renderer/curve-renderer";
import type { ImageRenderer } from "@/core/render/canvas2d/basic-renderer/image-renderer";
import type { ShapeRenderer } from "@/core/render/canvas2d/basic-renderer/shape-renderer";
import type { SvgRenderer } from "@/core/render/canvas2d/basic-renderer/svg-renderer";
import type { TextRenderer } from "@/core/render/canvas2d/basic-renderer/text-renderer";
import type { DrawingControllerRenderer } from "@/core/render/canvas2d/controller-renderer/drawing-renderer";
import type { CollisionBoxRenderer } from "@/core/render/canvas2d/entity-renderer/collision-box-renderer";
import type { StraightEdgeRenderer } from "@/core/render/canvas2d/entity-renderer/edge/concrete/straight-edge-renderer";
import type { SymmetryCurveEdgeRenderer } from "@/core/render/canvas2d/entity-renderer/edge/concrete/symmetry-curve-edge-renderer";
import type { VerticalPolyEdgeRenderer } from "@/core/render/canvas2d/entity-renderer/edge/concrete/vertical-poly-edge-renderer";
import type { EdgeRenderer } from "@/core/render/canvas2d/entity-renderer/edge/edge-renderer";
import type { EntityDetailsButtonRenderer } from "@/core/render/canvas2d/entity-renderer/entity-details-button-renderer";
import type { EntityRenderer } from "@/core/render/canvas2d/entity-renderer/entity-renderer";
import type { LatexNodeRenderer } from "@/core/render/canvas2d/entity-renderer/latex-node/latex-node-renderer";
import type { MediaNodeRenderer } from "@/core/render/canvas2d/entity-renderer/media-node/media-node-renderer";
import type { MultiTargetUndirectedEdgeRenderer } from "@/core/render/canvas2d/entity-renderer/multi-target-undirected-edge/multi-target-undirected-edge-renderer";
import type { ReferenceBlockRenderer } from "@/core/render/canvas2d/entity-renderer/reference-block-renderer";
import type { SectionRenderer } from "@/core/render/canvas2d/entity-renderer/section/section-renderer";
import type { SvgNodeRenderer } from "@/core/render/canvas2d/entity-renderer/svg-node/svg-node-renderer";
import type { TextNodeRenderer } from "@/core/render/canvas2d/entity-renderer/text-node/text-node-renderer";
import type { UrlNodeRenderer } from "@/core/render/canvas2d/entity-renderer/url-node/url-node-renderer";
import type { Renderer } from "@/core/render/canvas2d/renderer";
import type { BackgroundRenderer } from "@/core/render/canvas2d/utils-renderer/background-renderer";
import type { RenderUtils } from "@/core/render/canvas2d/utils-renderer/render-utils";
import type { SearchContentHighlightRenderer } from "@/core/render/canvas2d/utils-renderer/search-content-highlight-renderer";
import type { WorldRenderUtils } from "@/core/render/canvas2d/utils-renderer/world-render-utils";
import type { InputElement } from "@/core/render/dom-element/input-element";
import type { AutoLayoutFastTree } from "@/core/service/control-service/auto-layout-engine/auto-layout-fast-tree-mode";
import type { AutoLayout } from "@/core/service/control-service/auto-layout-engine/main-tick";
import type { ControllerUtils } from "@/core/service/control-service/controller/concrete/utils-control";
import type { Controller } from "@/core/service/control-service/controller/controller";
import type { KeyboardOnlyEngine } from "@/core/service/control-service/keyboard-only-engine/keyboard-only-engine";
import type { KeyboardOnlyGraphEngine } from "@/core/service/control-service/keyboard-only-engine/keyboard-only-graph-engine";
import type { KeyboardOnlyTreeEngine } from "@/core/service/control-service/keyboard-only-engine/keyboard-only-tree-engine";
import type { SelectChangeEngine } from "@/core/service/control-service/keyboard-only-engine/select-change-engine";
import type { RectangleSelect } from "@/core/service/control-service/rectangle-select-engine/rectangle-select-engine";
import type { KeyBindHintEngine } from "@/core/service/control-service/shortcut-keys-engine/key-bind-hint-engine";
import type { MouseInteraction } from "@/core/service/control-service/stage-mouse-interaction-core/stage-mouse-interaction-core";
import type { AutoComputeUtils } from "@/core/service/data-generate-service/auto-compute-engine/auto-compute-utils";
import type { AutoCompute } from "@/core/service/data-generate-service/auto-compute-engine/main-tick";
import type { GenerateFromFolder } from "@/core/service/data-generate-service/generate-from-folder-engine/generate-from-folder-engine";
import type { StageExport } from "@/core/service/data-generate-service/stage-export-engine/stage-export-engine";
import type { StageExportPng } from "@/core/service/data-generate-service/stage-export-engine/stage-export-png";
import type { StageExportSvg } from "@/core/service/data-generate-service/stage-export-engine/stage-export-svg";
import type { StageImport } from "@/core/service/data-generate-service/stage-import-engine/stage-import-engine";
import type { AIEngine } from "@/core/service/data-manage-service/ai-engine/ai-engine";
import type { ComplexityDetector } from "@/core/service/data-manage-service/complexity-detector";
import type { ContentSearch } from "@/core/service/data-manage-service/content-search-engine/content-search-engine";
import type { CopyEngine } from "@/core/service/data-manage-service/copy-engine/copy-engine";
import type { Effects } from "@/core/service/feedback-service/effect-engine/effect-machine";
import { StageStyleManager } from "@/core/service/feedback-service/stage-style/stage-style-manager";
import type { Camera } from "@/core/stage/camera";
import type { Canvas } from "@/core/stage/canvas";
import { GraphMethods } from "@/core/stage/stage-manager/basic-methods/graph-methods";
import { SectionMethods } from "@/core/stage/stage-manager/basic-methods/section-methods";
import type { LayoutManager } from "@/core/stage/stage-manager/concrete-methods/layout-manager";
import type { SectionCollisionSolver } from "@/core/stage/stage-manager/concrete-methods/section-collision-solver";
import type { AutoAlign } from "@/core/stage/stage-manager/concrete-methods/stage-auto-align-manager";
import type { DeleteManager } from "@/core/stage/stage-manager/concrete-methods/stage-delete-manager";
import type { EntityMoveManager } from "@/core/stage/stage-manager/concrete-methods/stage-entity-move-manager";
import type { StageUtils } from "@/core/stage/stage-manager/concrete-methods/stage-manager-utils";
import type { MultiTargetEdgeMove } from "@/core/stage/stage-manager/concrete-methods/stage-multi-target-edge-move";
import type { NodeAdder } from "@/core/stage/stage-manager/concrete-methods/stage-node-adder";
import type { NodeConnector } from "@/core/stage/stage-manager/concrete-methods/stage-node-connector";
import type { StageNodeRotate } from "@/core/stage/stage-manager/concrete-methods/stage-node-rotate";
import type { StageObjectColorManager } from "@/core/stage/stage-manager/concrete-methods/stage-object-color-manager";
import type { StageObjectSelectCounter } from "@/core/stage/stage-manager/concrete-methods/stage-object-select-counter";
import type { SectionInOutManager } from "@/core/stage/stage-manager/concrete-methods/stage-section-in-out-manager";
import type { SectionPackManager } from "@/core/stage/stage-manager/concrete-methods/stage-section-pack-manager";
import type { StageSyncAssociationManager } from "@/core/stage/stage-manager/concrete-methods/stage-sync-association-manager";
import type { TagManager } from "@/core/stage/stage-manager/concrete-methods/stage-tag-manager";
import { HistoryManager } from "@/core/stage/stage-manager/stage-history-manager";
import type { StageManager } from "@/core/stage/stage-manager/stage-manager";
import { StageObject } from "@/core/stage/stage-object/abstract/stage-object";
import { nextProjectIdAtom, store, tabsAtom } from "@/state";
import { createDefaultMetadata, PrgMetadata } from "@/types/metadata";
import { deserialize, serialize } from "@graphif/serializer";
import { Decoder, Encoder } from "@msgpack/msgpack";
import { BlobReader, Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { File } from "lucide-react";
import md5 from "md5";
import mime from "mime";
import React from "react";
import { save as saveDialog } from "@/platform/dialogs";
import { URI } from "vscode-uri";
import { CollaborationService } from "./service/collaboration/collaboration-service";
import { AutoSaveBackupService } from "./service/data-file-service/auto-save-backup-service";
import { generateThumbnail } from "./service/data-generate-service/generate-thumbnail";
import { ProjectOwnershipLifecycle, ProjectOwnershipLease } from "./project-ownership";
import { compareProjectVersions, parseProjectFile } from "./project-file";
import { ProjectUpgrader } from "./stage/project-upgrader";
import { ReferenceManager } from "./stage/stage-manager/concrete-methods/stage-reference-manager";
import { Tab } from "./tab";

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
  private readonly projectOwnership = new ProjectOwnershipLifecycle(this);
  public stage: StageObject[] = [];
  public sectionMoveDepth = 0;
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

  attachProjectOwnership(ownership: ProjectOwnershipLease) {
    this.projectOwnership.attach(ownership);
  }

  get projectOwnerIdentity() {
    return this.projectOwnership.ownershipId;
  }

  get canonicalProjectPath() {
    return this.projectOwnership.canonicalPath;
  }

  activateOpenRuntimeHost() {
    this.projectOwnership.activate();
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
   * 检查是否需要升级，如果需要则显示确认对话框
   * @param currentVersion 当前文件版本
   * @param latestVersion 最新版本
   */
  private async checkAndConfirmUpgrade(currentVersion: string, latestVersion: string): Promise<boolean> {
    const versionDiff = compareProjectVersions(currentVersion, latestVersion);

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
   * 服务加载完成后再调用
   */
  async init(options: { automation?: boolean; allowUpgrade?: boolean } = {}) {
    if (!(await this.fs.exists(this.uri))) {
      return;
    }
    try {
      // 解析项目文件
      const parsed = await parseProjectFile(
        await this.fs.read(this.uri),
        this.decoder,
        this.attachments,
      );
      const { tags, references, metadata, readme } = parsed;
      if (parsed.format === "json") {
        const { decodeStageGraph } = await import("@/application/read-legacy-stage");
        this.stage = decodeStageGraph(parsed.graph, this);
        this.tags = tags;
        this.references = references;
        this.metadata = metadata;
        this.readme = readme;
        this.stageManager.updateReferences();
        this.projectState = ProjectState.Saved;
        return;
      }
      const { serializedStageObjects } = parsed;

      // 检查并确认升级
      const currentVersion = metadata?.version || "2.0.0";
      const latestVersion = ProjectUpgrader.NLatestVersion;
      if (options.automation) {
        const difference = compareProjectVersions(currentVersion, latestVersion);
        if (difference > 0) throw new Error("PROJECT_VERSION_UNSUPPORTED");
        if (difference < 0 && !options.allowUpgrade) throw new Error("PROJECT_UPGRADE_REQUIRED");
      }
      const confirmed = options.automation || (await this.checkAndConfirmUpgrade(currentVersion, latestVersion));
      if (!confirmed) return; // 用户取消升级，不打开文件，跳过 this.projectState = ProjectState.Saved

      // 升级数据
      const [upgradedStageObjects, upgradedMetadata] = ProjectUpgrader.upgradeNAnyToNLatest(
        serializedStageObjects,
        metadata as any,
      );

      // 应用升级后的数据
      this.stage = deserialize(upgradedStageObjects, this);
      const { convertLatexNodes } = await import("@/core/stage/stage-object/tools/convert-latex-nodes");
      convertLatexNodes(this);
      this.tags = tags;
      this.references = references;
      this.metadata = upgradedMetadata;
      this.readme = readme;

      // 更新引用关系，包括双向线的偏移状态
      // 注意：这里需要在服务加载后才能调用，所以需要检查服务是否已加载
      if (this.getService("stageManager")) {
        this.stageManager.updateReferences();
      }

      this.wasUpgraded = currentVersion !== latestVersion;
    } catch (e) {
      if (options.automation) throw e;
      console.warn(e);
      const errorMessage = `打开文件时发生错误，文件内容可能已损坏或与当前软件版本不兼容。\n\n错误信息：${e}`;
      const result = await Dialog.buttons("文件解析失败", errorMessage, [
        { id: "ok", label: "确定" },
        { id: "copy", label: "复制错误信息" },
      ]);
      if (result === "copy") {
        navigator.clipboard.writeText(errorMessage);
      }
      return;
    }
    this.projectState = ProjectState.Saved;
  }

  get isDraft() {
    return this.uri.scheme === "draft";
  }
  get isCollab() {
    return this.uri.scheme === "collab";
  }
  get title(): string {
    return this.uri.scheme === "draft"
      ? `临时草稿 (${this.uri.path})`
      : this.uri.scheme === "collab"
        ? `协作 (${this.uri.path})`
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
  async save(options: { includeThumbnail?: boolean } = {}) {
    if (this.isDraft || this.isCollab) {
      const path = await saveDialog({
        title: this.isDraft ? "保存草稿" : "保存协作工程",
        filters: [{ name: "Project Graph", extensions: ["prg"] }],
      });
      if (!path) throw new Error("未选择路径");
      await this.saveAs(URI.file(path), options);
      return;
    }
    try {
      this.isSaving = true;
      await this.fs.write(this.uri, await this.getFileContent(options));
      this.projectState = ProjectState.Saved;
    } finally {
      this.isSaving = false;
    }
  }

  async saveAs(targetUri: URI, options: { includeThumbnail?: boolean } = {}) {
    if (targetUri.scheme !== "file") throw new Error("Project Save As requires a file URI");
    const fileSystemProvider = this.fileSystemProviders.get("file");
    if (!fileSystemProvider) throw new Error("File Project provider is not registered");

    try {
      this.isSaving = true;
      const content = await this.getFileContent(options);
      await this.projectOwnership.saveAs(targetUri, () => fileSystemProvider.write(targetUri, content));
      this.projectState = ProjectState.Saved;
    } finally {
      this.isSaving = false;
    }
  }

  // 反向引用数据
  public references: { sections: Record<string, string[]>; files: string[] } = { sections: {}, files: [] };
  public metadata: PrgMetadata = createDefaultMetadata(ProjectUpgrader.NLatestVersion);
  public readme?: string;
  public wasUpgraded = false;

  // 备份也要用到这个
  async getFileContent(options: { includeThumbnail?: boolean } = {}) {
    const includeThumbnail = options.includeThumbnail !== false;
    const serializedStage = serialize(this.stage);
    const encodedStage = this.encoder.encode(serializedStage);
    const uwriter = new Uint8ArrayWriter();

    // @zip.js/zip.js 从 ^2.7.63 升到了 ^2.8.26，需要显示指定 level: 0，防止保存的时候卡顿
    const writer = new ZipWriter(uwriter, { level: 0 });
    await writer.add("stage.msgpack", new Uint8ArrayReader(encodedStage), { level: 0 });
    await writer.add("tags.msgpack", new Uint8ArrayReader(this.encoder.encode(this.tags)), { level: 0 });
    await writer.add("reference.msgpack", new Uint8ArrayReader(this.encoder.encode(this.references)), { level: 0 });
    await writer.add("metadata.msgpack", new Uint8ArrayReader(this.encoder.encode(this.metadata)), { level: 0 });
    if (this.readme) {
      await writer.add("README.md", new Uint8ArrayReader(new TextEncoder().encode(this.readme)), { level: 0 });
    }
    // 添加附件
    for (const [uuid, attachment] of this.attachments.entries()) {
      await writer.add(`attachments/${uuid}.${mime.getExtension(attachment.type)}`, new BlobReader(attachment), {
        level: 0,
      });
    }
    // 添加缩略图
    if (includeThumbnail) {
      try {
        const thumbnailBlob = await generateThumbnail(this);
        if (thumbnailBlob) {
          await writer.add("thumbnail.png", new BlobReader(thumbnailBlob), { level: 0 });
        }
      } catch {
        // 缩略图生成失败不阻止保存
      }
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

  addAttachment(data: Blob, id: string = crypto.randomUUID()): string {
    const uuid = id;
    this.attachments.set(uuid, data);
    this.emit("attachment-add", { id: uuid, data });
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
    this.currentComponent = class extends React.Component<Record<string, never>> {
      displayName = "ProjectContainer";
      private containerRef = React.createRef<HTMLDivElement>();

      componentDidMount(): void {
        (self as any)._lastContainer = this.containerRef.current;
        if (this.containerRef.current && self.getService("canvas")) {
          self.canvas.mount(this.containerRef.current);
        }
      }

      render() {
        return (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden" ref={this.containerRef}></div>
          </div>
        );
      }
    };
    return this.currentComponent as React.ComponentType;
  }

  render(): React.ReactNode {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden" ref={this.containerRef}></div>
      </div>
    );
  }

  override async dispose() {
    await this.projectOwnership.dispose(async () => {
      const cleanupErrors: unknown[] = [];
      try {
        await super.dispose();
      } catch (error) {
        cleanupErrors.push(error);
      }
      const stageCleanupTasks = this.stage.map((stageObject) => Promise.resolve().then(() => stageObject.dispose?.()));
      const stageCleanupResults = await Promise.allSettled(stageCleanupTasks);
      cleanupErrors.push(
        ...stageCleanupResults
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map(({ reason }) => reason),
      );
      this.stage.length = 0;
      this.attachments.clear();
      if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, "Project cleanup failed");
    });
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
    latexNodeRenderer: LatexNodeRenderer;
    mediaNodeRenderer: MediaNodeRenderer;
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
    collaboration: CollaborationService;
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
