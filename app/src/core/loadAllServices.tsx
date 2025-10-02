import { FileSystemProviderDraft } from "@/core/fileSystemProvider/FileSystemProviderDraft";
import { FileSystemProviderFile } from "@/core/fileSystemProvider/FileSystemProviderFile";
import { Project } from "@/core/Project";
// import { KeyBinds } from "@/core/service/controlService/shortcutKeysEngine/KeyBinds";
// import { KeyBindsRegistrar } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
// import { AutoComputeUtils } from "@/core/service/dataGenerateService/autoComputeEngine/AutoComputeUtils";
// import { AutoCompute } from "@/core/service/dataGenerateService/autoComputeEngine/mainTick";
// import { GenerateFromFolder } from "@/core/service/dataGenerateService/generateFromFolderEngine/GenerateFromFolderEngine";
// import { StageExport } from "@/core/service/dataGenerateService/stageExportEngine/stageExportEngine";
// import { StageExportPng } from "@/core/service/dataGenerateService/stageExportEngine/StageExportPng";
// import { AIEngine } from "@/core/service/dataManageService/aiEngine/AIEngine";
// import { ComplexityDetector } from "@/core/service/dataManageService/ComplexityDetector";
// import { ContentSearch } from "@/core/service/dataManageService/contentSearchEngine/contentSearchEngine";
// import { CopyEngine } from "@/core/service/dataManageService/copyEngine/copyEngine";
// import { StageStyleManager } from "@/core/service/feedbackService/stageStyle/StageStyleManager";
// import { GraphMethods } from "@/core/stage/stageManager/basicMethods/GraphMethods";
// import { SectionMethods } from "@/core/stage/stageManager/basicMethods/SectionMethods";
// import { LayoutManager } from "@/core/stage/stageManager/concreteMethods/LayoutManager";
// import { AutoAlign } from "@/core/stage/stageManager/concreteMethods/StageAutoAlignManager";
// import { StageUtils } from "@/core/stage/stageManager/concreteMethods/StageManagerUtils";
// import { MultiTargetEdgeMove } from "@/core/stage/stageManager/concreteMethods/StageMultiTargetEdgeMove";
// import { NodeConnector } from "@/core/stage/stageManager/concreteMethods/StageNodeConnector";
// import { StageNodeRotate } from "@/core/stage/stageManager/concreteMethods/stageNodeRotate";
// import { StageObjectColorManager } from "@/core/stage/stageManager/concreteMethods/StageObjectColorManager";
// import { StageObjectSelectCounter } from "@/core/stage/stageManager/concreteMethods/StageObjectSelectCounter";
// import { SectionInOutManager } from "@/core/stage/stageManager/concreteMethods/StageSectionInOutManager";
// import { SectionPackManager } from "@/core/stage/stageManager/concreteMethods/StageSectionPackManager";
// import { TagManager } from "@/core/stage/stageManager/concreteMethods/StageTagManager";
import { HistoryManager } from "@/core/stage/stageManager/StageHistoryManager";
// import { StageManager } from "@/core/stage/stageManager/StageManager";
// import { AutoSaveBackupService } from "./service/dataFileService/AutoSaveBackupService";

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
      // StageStyleManager, KeyBinds,
      // SectionMethods, GraphMethods, AutoComputeUtils,
      // StageManager, AutoCompute,
      // StageNodeRotate, ComplexityDetector, AIEngine,
      // CopyEngine, LayoutManager, AutoAlign,
      // ContentSearch,
      // StageUtils, MultiTargetEdgeMove, NodeConnector, StageObjectColorManager, StageObjectSelectCounter,
      // SectionInOutManager, SectionPackManager, TagManager,
      // StageExport, StageExportPng,
      // GenerateFromFolder, KeyBindsRegistrar, AutoSaveBackupService,
    ],
    [HistoryManager],
  );
}
