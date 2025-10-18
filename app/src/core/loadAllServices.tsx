import { FileSystemProviderDraft } from "@/core/fileSystemProvider/FileSystemProviderDraft";
import { FileSystemProviderFile } from "@/core/fileSystemProvider/FileSystemProviderFile";
import { Project } from "@/core/Project";
import { Settings } from "./service/Settings";
import { BackgroundGrid } from "./sprites/BackgroundGrid";
import { Cutter } from "./sprites/Cutter";
import { GlobalContextMenuTrigger } from "./sprites/GlobalContextMenuTrigger";
import { MouseTrail } from "./sprites/MouseTrail";
import { NodeAdder } from "./sprites/NodeAdder";
import { RegionPicker } from "./sprites/RegionPicker";

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
    [],
    [BackgroundGrid, Settings.mouseTrail && MouseTrail, NodeAdder, RegionPicker, GlobalContextMenuTrigger, Cutter],
  );
}
