import { FileSystemProviderCollab } from "@/core/file-system-provider/file-system-provider-collab";
import { FileSystemProviderDraft } from "@/core/file-system-provider/file-system-provider-draft";
import { FileSystemProviderFile } from "@/core/file-system-provider/file-system-provider-file";
import { Project } from "@/core/project";
import { CollaborationService } from "@/core/service/collaboration/collaboration-service";
import { CurveRenderer } from "@/core/render/canvas2d/basic-renderer/curve-renderer";
import { ImageRenderer } from "@/core/render/canvas2d/basic-renderer/image-renderer";
import { ShapeRenderer } from "@/core/render/canvas2d/basic-renderer/shape-renderer";
import { SvgRenderer } from "@/core/render/canvas2d/basic-renderer/svg-renderer";
import { TextRenderer } from "@/core/render/canvas2d/basic-renderer/text-renderer";
import { DrawingControllerRenderer } from "@/core/render/canvas2d/controller-renderer/drawing-renderer";
import { CollisionBoxRenderer } from "@/core/render/canvas2d/entity-renderer/collision-box-renderer";
import { StraightEdgeRenderer } from "@/core/render/canvas2d/entity-renderer/edge/concrete/straight-edge-renderer";
import { SymmetryCurveEdgeRenderer } from "@/core/render/canvas2d/entity-renderer/edge/concrete/symmetry-curve-edge-renderer";
import { VerticalPolyEdgeRenderer } from "@/core/render/canvas2d/entity-renderer/edge/concrete/vertical-poly-edge-renderer";
import { EdgeRenderer } from "@/core/render/canvas2d/entity-renderer/edge/edge-renderer";
import { EntityDetailsButtonRenderer } from "@/core/render/canvas2d/entity-renderer/entity-details-button-renderer";
import { EntityRenderer } from "@/core/render/canvas2d/entity-renderer/entity-renderer";
import { LatexNodeRenderer } from "@/core/render/canvas2d/entity-renderer/latex-node/latex-node-renderer";
import { MediaNodeRenderer } from "@/core/render/canvas2d/entity-renderer/media-node/media-node-renderer";
import { MultiTargetUndirectedEdgeRenderer } from "@/core/render/canvas2d/entity-renderer/multi-target-undirected-edge/multi-target-undirected-edge-renderer";
import { ReferenceBlockRenderer } from "@/core/render/canvas2d/entity-renderer/reference-block-renderer";
import { SectionRenderer } from "@/core/render/canvas2d/entity-renderer/section/section-renderer";
import { SvgNodeRenderer } from "@/core/render/canvas2d/entity-renderer/svg-node/svg-node-renderer";
import { TextNodeRenderer } from "@/core/render/canvas2d/entity-renderer/text-node/text-node-renderer";
import { UrlNodeRenderer } from "@/core/render/canvas2d/entity-renderer/url-node/url-node-renderer";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { BackgroundRenderer } from "@/core/render/canvas2d/utils-renderer/background-renderer";
import { RenderUtils } from "@/core/render/canvas2d/utils-renderer/render-utils";
import { SearchContentHighlightRenderer } from "@/core/render/canvas2d/utils-renderer/search-content-highlight-renderer";
import { WorldRenderUtils } from "@/core/render/canvas2d/utils-renderer/world-render-utils";
import { InputElement } from "@/core/render/dom-element/input-element";
import { AutoLayoutFastTree } from "@/core/service/control-service/auto-layout-engine/auto-layout-fast-tree-mode";
import { AutoLayout } from "@/core/service/control-service/auto-layout-engine/main-tick";
import { ControllerUtils } from "@/core/service/control-service/controller/concrete/utils-control";
import { Controller } from "@/core/service/control-service/controller/controller";
import { KeyboardOnlyEngine } from "@/core/service/control-service/keyboard-only-engine/keyboard-only-engine";
import { KeyboardOnlyGraphEngine } from "@/core/service/control-service/keyboard-only-engine/keyboard-only-graph-engine";
import { KeyboardOnlyTreeEngine } from "@/core/service/control-service/keyboard-only-engine/keyboard-only-tree-engine";
import { SelectChangeEngine } from "@/core/service/control-service/keyboard-only-engine/select-change-engine";
import { RectangleSelect } from "@/core/service/control-service/rectangle-select-engine/rectangle-select-engine";
import { KeyBindHintEngine } from "@/core/service/control-service/shortcut-keys-engine/key-bind-hint-engine";
import { MouseInteraction } from "@/core/service/control-service/stage-mouse-interaction-core/stage-mouse-interaction-core";
import { AutoComputeUtils } from "@/core/service/data-generate-service/auto-compute-engine/auto-compute-utils";
import { AutoCompute } from "@/core/service/data-generate-service/auto-compute-engine/main-tick";
import { GenerateFromFolder } from "@/core/service/data-generate-service/generate-from-folder-engine/generate-from-folder-engine";
import { StageExport } from "@/core/service/data-generate-service/stage-export-engine/stage-export-engine";
import { StageExportPng } from "@/core/service/data-generate-service/stage-export-engine/stage-export-png";
import { StageExportSvg } from "@/core/service/data-generate-service/stage-export-engine/stage-export-svg";
import { StageImport } from "@/core/service/data-generate-service/stage-import-engine/stage-import-engine";
import { AIEngine } from "@/core/service/data-manage-service/ai-engine/ai-engine";
import { ComplexityDetector } from "@/core/service/data-manage-service/complexity-detector";
import { ContentSearch } from "@/core/service/data-manage-service/content-search-engine/content-search-engine";
import { CopyEngine } from "@/core/service/data-manage-service/copy-engine/copy-engine";
import { Effects } from "@/core/service/feedback-service/effect-engine/effect-machine";
import { StageStyleManager } from "@/core/service/feedback-service/stage-style/stage-style-manager";
import { Camera } from "@/core/stage/camera";
import { Canvas } from "@/core/stage/canvas";
import { GraphMethods } from "@/core/stage/stage-manager/basic-methods/graph-methods";
import { SectionMethods } from "@/core/stage/stage-manager/basic-methods/section-methods";
import { LayoutManager } from "@/core/stage/stage-manager/concrete-methods/layout-manager";
import { SectionCollisionSolver } from "@/core/stage/stage-manager/concrete-methods/section-collision-solver";
import { AutoAlign } from "@/core/stage/stage-manager/concrete-methods/stage-auto-align-manager";
import { DeleteManager } from "@/core/stage/stage-manager/concrete-methods/stage-delete-manager";
import { EntityMoveManager } from "@/core/stage/stage-manager/concrete-methods/stage-entity-move-manager";
import { StageUtils } from "@/core/stage/stage-manager/concrete-methods/stage-manager-utils";
import { MultiTargetEdgeMove } from "@/core/stage/stage-manager/concrete-methods/stage-multi-target-edge-move";
import { NodeAdder } from "@/core/stage/stage-manager/concrete-methods/stage-node-adder";
import { NodeConnector } from "@/core/stage/stage-manager/concrete-methods/stage-node-connector";
import { StageNodeRotate } from "@/core/stage/stage-manager/concrete-methods/stage-node-rotate";
import { StageObjectColorManager } from "@/core/stage/stage-manager/concrete-methods/stage-object-color-manager";
import { StageObjectSelectCounter } from "@/core/stage/stage-manager/concrete-methods/stage-object-select-counter";
import { SectionInOutManager } from "@/core/stage/stage-manager/concrete-methods/stage-section-in-out-manager";
import { SectionPackManager } from "@/core/stage/stage-manager/concrete-methods/stage-section-pack-manager";
import { StageSyncAssociationManager } from "@/core/stage/stage-manager/concrete-methods/stage-sync-association-manager";
import { TagManager } from "@/core/stage/stage-manager/concrete-methods/stage-tag-manager";
import { HistoryManager } from "@/core/stage/stage-manager/stage-history-manager";
import { StageManager } from "@/core/stage/stage-manager/stage-manager";
import { AutoSaveBackupService } from "./service/data-file-service/auto-save-backup-service";
import { ReferenceManager } from "./stage/stage-manager/concrete-methods/stage-reference-manager";

/**
 * 以下方法在项目初始化之前加载所有服务
 * @param project
 */
export function loadAllServicesBeforeInit(project: Project): void {
  project.registerFileSystemProvider("file", FileSystemProviderFile);
  project.registerFileSystemProvider("draft", FileSystemProviderDraft);
  project.registerFileSystemProvider("collab", FileSystemProviderCollab);
  project.loadService(Canvas);
  project.loadService(InputElement);
  project.loadService(StageStyleManager);
  // project.loadService(KeyBinds);
  project.loadService(ControllerUtils);

  // 基础算法
  project.loadService(SectionMethods);
  project.loadService(GraphMethods);

  project.loadService(Controller);
  project.loadService(AutoComputeUtils);
  project.loadService(RenderUtils);
  project.loadService(WorldRenderUtils);
  project.loadService(StageManager);

  // 自动计算引擎应该早于Camera，因为它会操作摄像机
  project.loadService(AutoCompute);
  project.loadService(Camera);

  // 基础渲染器
  project.loadService(Renderer);
  // Effects必须在Renderer之后
  project.loadService(Effects);

  project.loadService(RectangleSelect);
  project.loadService(StageNodeRotate);
  project.loadService(ComplexityDetector);
  project.loadService(AIEngine);
  project.loadService(CopyEngine);
  project.loadService(AutoLayout);
  project.loadService(AutoLayoutFastTree);
  project.loadService(LayoutManager);
  project.loadService(AutoAlign);
  project.loadService(MouseInteraction);
  project.loadService(ContentSearch);
  project.loadService(DeleteManager);
  project.loadService(NodeAdder);
  project.loadService(EntityMoveManager);
  project.loadService(StageUtils);
  project.loadService(MultiTargetEdgeMove);
  project.loadService(NodeConnector);
  project.loadService(StageObjectColorManager);
  project.loadService(StageObjectSelectCounter);
  project.loadService(SectionInOutManager);
  project.loadService(SectionPackManager);
  project.loadService(SectionCollisionSolver);
  project.loadService(TagManager);
  project.loadService(StageSyncAssociationManager);
  project.loadService(ReferenceManager);
  project.loadService(KeyboardOnlyEngine);
  project.loadService(KeyboardOnlyGraphEngine);
  project.loadService(KeyboardOnlyTreeEngine);
  project.loadService(SelectChangeEngine);

  // 渲染服务
  project.loadService(TextRenderer);
  project.loadService(ImageRenderer);
  project.loadService(ShapeRenderer);
  project.loadService(EntityRenderer);
  project.loadService(MultiTargetUndirectedEdgeRenderer);
  project.loadService(CurveRenderer);
  project.loadService(SvgRenderer);
  project.loadService(DrawingControllerRenderer);
  project.loadService(CollisionBoxRenderer);
  project.loadService(EntityDetailsButtonRenderer);
  project.loadService(StraightEdgeRenderer);
  project.loadService(SymmetryCurveEdgeRenderer);
  project.loadService(VerticalPolyEdgeRenderer);
  project.loadService(EdgeRenderer);
  project.loadService(SectionRenderer);
  project.loadService(SvgNodeRenderer);
  project.loadService(LatexNodeRenderer);
  project.loadService(MediaNodeRenderer);
  project.loadService(TextNodeRenderer);
  project.loadService(UrlNodeRenderer);
  project.loadService(ReferenceBlockRenderer);
  project.loadService(BackgroundRenderer);
  project.loadService(SearchContentHighlightRenderer);

  // 导入导出服务
  project.loadService(StageImport);
  project.loadService(StageExport);
  project.loadService(StageExportPng);
  project.loadService(StageExportSvg);
  project.loadService(GenerateFromFolder);

  // 快捷键交互
  project.loadService(KeyBindHintEngine);

  // 自动保存与备份
  project.loadService(AutoSaveBackupService);
}

export function loadAllServicesAfterInit(project: Project): void {
  project.loadService(HistoryManager);
  project.loadService(CollaborationService);
}
