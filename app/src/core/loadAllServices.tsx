import { FileSystemProviderDraft } from "@/core/fileSystemProvider/FileSystemProviderDraft";
import { FileSystemProviderFile } from "@/core/fileSystemProvider/FileSystemProviderFile";
import { Project } from "@/core/Project";
import { BackgroundGrid } from "./sprites/BackgroundGrid";
import { NodeAdder } from "./sprites/NodeAdder";
import { RegionPicker } from "./sprites/RegionPicker";
import { GlobalContextMenuTrigger } from "./sprites/GlobalContextMenuTrigger";

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
    [BackgroundGrid, NodeAdder, RegionPicker, GlobalContextMenuTrigger],
  );
}
