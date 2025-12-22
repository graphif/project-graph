import { Project } from "@/core/Project";
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
  return project.init([], [BackgroundGrid, MouseTrail, NodeAdder, RegionPicker, GlobalContextMenuTrigger, Cutter]);
}
