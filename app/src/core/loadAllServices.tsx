import { FileSystemProviderDraft } from "@/core/fileSystemProvider/FileSystemProviderDraft";
import { FileSystemProviderFile } from "@/core/fileSystemProvider/FileSystemProviderFile";
import { Project } from "@/core/Project";
import { CurveRenderer } from "@/core/render/canvas2d/basicRenderer/curveRenderer";
import { ImageRenderer } from "@/core/render/canvas2d/basicRenderer/ImageRenderer";
import { ShapeRenderer } from "@/core/render/canvas2d/basicRenderer/shapeRenderer";
import { SvgRenderer } from "@/core/render/canvas2d/basicRenderer/svgRenderer";
import { TextRenderer } from "@/core/render/canvas2d/basicRenderer/textRenderer";
import { DrawingControllerRenderer } from "@/core/render/canvas2d/controllerRenderer/drawingRenderer";
import { CollisionBoxRenderer } from "@/core/render/canvas2d/entityRenderer/CollisionBoxRenderer";
import { StraightEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/StraightEdgeRenderer";
import { SymmetryCurveEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/SymmetryCurveEdgeRenderer";
import { VerticalPolyEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/VerticalPolyEdgeRenderer";
import { EdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRenderer";
import { EntityDetailsButtonRenderer } from "@/core/render/canvas2d/entityRenderer/EntityDetailsButtonRenderer";
import { EntityRenderer } from "@/core/render/canvas2d/entityRenderer/EntityRenderer";
import { MultiTargetUndirectedEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/multiTargetUndirectedEdge/MultiTargetUndirectedEdgeRenderer";
import { SectionRenderer } from "@/core/render/canvas2d/entityRenderer/section/SectionRenderer";
import { SvgNodeRenderer } from "@/core/render/canvas2d/entityRenderer/svgNode/SvgNodeRenderer";
import { TextNodeRenderer } from "@/core/render/canvas2d/entityRenderer/textNode/TextNodeRenderer";
import { UrlNodeRenderer } from "@/core/render/canvas2d/entityRenderer/urlNode/urlNodeRenderer";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { BackgroundRenderer } from "@/core/render/canvas2d/utilsRenderer/backgroundRenderer";
import { RenderUtils } from "@/core/render/canvas2d/utilsRenderer/RenderUtils";
import { SearchContentHighlightRenderer } from "@/core/render/canvas2d/utilsRenderer/searchContentHighlightRenderer";
import { WorldRenderUtils } from "@/core/render/canvas2d/utilsRenderer/WorldRenderUtils";
import { InputElement } from "@/core/render/domElement/inputElement";
import { AutoLayoutFastTree } from "@/core/service/controlService/autoLayoutEngine/autoLayoutFastTreeMode";
import { AutoLayout } from "@/core/service/controlService/autoLayoutEngine/mainTick";
import { ControllerUtils } from "@/core/service/controlService/controller/concrete/utilsControl";
import { Controller } from "@/core/service/controlService/controller/Controller";
import { KeyboardOnlyEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyEngine";
import { KeyboardOnlyGraphEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyGraphEngine";
import { KeyboardOnlyTreeEngine } from "@/core/service/controlService/keyboardOnlyEngine/keyboardOnlyTreeEngine";
import { SelectChangeEngine } from "@/core/service/controlService/keyboardOnlyEngine/selectChangeEngine";
import { RectangleSelect } from "@/core/service/controlService/rectangleSelectEngine/rectangleSelectEngine";
import { KeyBinds } from "@/core/service/controlService/shortcutKeysEngine/KeyBinds";
import { KeyBindsRegistrar } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import { MouseInteraction } from "@/core/service/controlService/stageMouseInteractionCore/stageMouseInteractionCore";
import { AutoComputeUtils } from "@/core/service/dataGenerateService/autoComputeEngine/AutoComputeUtils";
import { AutoCompute } from "@/core/service/dataGenerateService/autoComputeEngine/mainTick";
import { GenerateFromFolder } from "@/core/service/dataGenerateService/generateFromFolderEngine/GenerateFromFolderEngine";
import { StageExport } from "@/core/service/dataGenerateService/stageExportEngine/stageExportEngine";
import { StageExportPng } from "@/core/service/dataGenerateService/stageExportEngine/StageExportPng";
import { StageExportSvg } from "@/core/service/dataGenerateService/stageExportEngine/StageExportSvg";
import { AIEngine } from "@/core/service/dataManageService/aiEngine/AIEngine";
import { ComplexityDetector } from "@/core/service/dataManageService/ComplexityDetector";
import { ContentSearch } from "@/core/service/dataManageService/contentSearchEngine/contentSearchEngine";
import { CopyEngine } from "@/core/service/dataManageService/copyEngine/copyEngine";
import { Effects } from "@/core/service/feedbackService/effectEngine/effectMachine";
import { StageStyleManager } from "@/core/service/feedbackService/stageStyle/StageStyleManager";
import { Camera } from "@/core/stage/Camera";
import { Canvas } from "@/core/stage/Canvas";
import { GraphMethods } from "@/core/stage/stageManager/basicMethods/GraphMethods";
import { SectionMethods } from "@/core/stage/stageManager/basicMethods/SectionMethods";
import { LayoutManager } from "@/core/stage/stageManager/concreteMethods/LayoutManager";
import { AutoAlign } from "@/core/stage/stageManager/concreteMethods/StageAutoAlignManager";
import { DeleteManager } from "@/core/stage/stageManager/concreteMethods/StageDeleteManager";
import { EntityMoveManager } from "@/core/stage/stageManager/concreteMethods/StageEntityMoveManager";
import { StageUtils } from "@/core/stage/stageManager/concreteMethods/StageManagerUtils";
import { MultiTargetEdgeMove } from "@/core/stage/stageManager/concreteMethods/StageMultiTargetEdgeMove";
import { NodeAdder } from "@/core/stage/stageManager/concreteMethods/StageNodeAdder";
import { NodeConnector } from "@/core/stage/stageManager/concreteMethods/StageNodeConnector";
import { StageNodeRotate } from "@/core/stage/stageManager/concreteMethods/stageNodeRotate";
import { StageObjectColorManager } from "@/core/stage/stageManager/concreteMethods/StageObjectColorManager";
import { StageObjectSelectCounter } from "@/core/stage/stageManager/concreteMethods/StageObjectSelectCounter";
import { SectionInOutManager } from "@/core/stage/stageManager/concreteMethods/StageSectionInOutManager";
import { SectionPackManager } from "@/core/stage/stageManager/concreteMethods/StageSectionPackManager";
import { TagManager } from "@/core/stage/stageManager/concreteMethods/StageTagManager";
import { HistoryManager } from "@/core/stage/stageManager/StageHistoryManager";
import { StageManager } from "@/core/stage/stageManager/StageManager";
import { AutoSaveBackupService } from "./service/dataFileService/AutoSaveBackupService";

/**
 * 以下方法在项目初始化之前加载所有服务
 * @param project
 */
export function initProjectWithAllServices(project: Project) {
  return project.init(
    {
      file: FileSystemProviderFile,
      draft: FileSystemProviderDraft,
    },
    // prettier-ignore
    [
      Canvas, InputElement, StageStyleManager, KeyBinds, ControllerUtils,
      SectionMethods, GraphMethods, Controller, AutoComputeUtils, RenderUtils,
      WorldRenderUtils, StageManager, AutoCompute, Camera, Renderer,
      Effects, RectangleSelect, StageNodeRotate, ComplexityDetector, AIEngine,
      CopyEngine, AutoLayout, AutoLayoutFastTree, LayoutManager, AutoAlign,
      MouseInteraction, ContentSearch, DeleteManager, NodeAdder, EntityMoveManager,
      StageUtils, MultiTargetEdgeMove, NodeConnector, StageObjectColorManager, StageObjectSelectCounter,
      SectionInOutManager, SectionPackManager, TagManager, KeyboardOnlyEngine, KeyboardOnlyGraphEngine,
      KeyboardOnlyTreeEngine, SelectChangeEngine, TextRenderer, ImageRenderer, ShapeRenderer,
      EntityRenderer, MultiTargetUndirectedEdgeRenderer, CurveRenderer, SvgRenderer, DrawingControllerRenderer,
      CollisionBoxRenderer, EntityDetailsButtonRenderer, StraightEdgeRenderer, SymmetryCurveEdgeRenderer, VerticalPolyEdgeRenderer,
      EdgeRenderer, SectionRenderer, SvgNodeRenderer, TextNodeRenderer, UrlNodeRenderer,
      BackgroundRenderer, SearchContentHighlightRenderer, StageExport, StageExportPng, StageExportSvg,
      GenerateFromFolder, KeyBindsRegistrar, AutoSaveBackupService,
    ],
    [HistoryManager],
  );
}
