import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  analyzeGraphStructures,
  GRAPH_STRUCTURE_TYPE_LABELS,
  type GraphStructure,
  type GraphStructureType,
} from "@/core/algorithm/graphStructureAnalysis";
import { Project } from "@/core/Project";
import { ConnectableAssociation } from "@/core/stage/stageObject/abstract/Association";
import { createSubWindow } from "@/core/subWindowOpen";
import { activeResourceTabAtom } from "@/state";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { ListTree, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const TYPE_BADGE_CLASS: Record<GraphStructureType, string> = {
  isolated: "bg-muted text-muted-foreground",
  path: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  star: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  tree: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  dag: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  cyclic: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export default function OutlineWindow() {
  const [tab] = useAtom(activeResourceTabAtom);
  const project = tab instanceof Project ? tab : undefined;
  const [structures, setStructures] = useState<GraphStructure[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!project) {
      setStructures([]);
      return;
    }
    const entities = project.stageManager.getConnectableEntity();
    const associations = project.stageManager
      .getAssociations()
      .filter((item): item is ConnectableAssociation => item instanceof ConnectableAssociation);
    const result = analyzeGraphStructures(entities, associations, (entity) =>
      project.contentSearch.getStageObjectText(entity),
    );
    setStructures(result);
  }, [project]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!project) return;
    let lastHash = project.stageHash;
    const timer = window.setInterval(() => {
      const currentHash = project.stageHash;
      if (currentHash !== lastHash) {
        lastHash = currentHash;
        refresh();
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [project, refresh]);

  const focusStructure = (structure: GraphStructure) => {
    if (!project) return;
    project.controller.resetCountdownTimer();
    project.stageManager.clearSelectAll();
    for (const node of structure.nodes) {
      node.isSelected = true;
    }
    for (const association of structure.associations) {
      association.isSelected = true;
    }
    setActiveId(structure.id);
    const rectangles = [
      ...structure.nodes.map((node) => node.collisionBox.getRectangle()),
      ...structure.associations.filter((item) => item.isPhysical).map((item) => item.collisionBox.getRectangle()),
    ];
    if (rectangles.length === 0) return;
    const bounding = Rectangle.getBoundingRectangle(rectangles);
    project.camera.resetByRectangle(bounding);
  };

  if (!project) return <></>;

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <ListTree className="size-3.5" />
          <span>
            {structures.length} 个结构
            {structures.length > 0 && ` · ${structures.reduce((sum, item) => sum + item.nodeCount, 0)} 节点`}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="size-7" onClick={refresh}>
              <RefreshCcw className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>刷新大纲</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {structures.length === 0 && (
          <div className="text-muted-foreground py-8 text-center text-sm">画布上暂无节点</div>
        )}
        {structures.map((structure, index) => (
          <button
            key={structure.id}
            type="button"
            className={cn(
              "hover:bg-accent/50 flex w-full flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-colors",
              activeId === structure.id && "bg-accent/60 ring-accent ring-1 ring-inset",
            )}
            onClick={() => focusStructure(structure)}
          >
            <div className="flex items-center gap-2">
              <span className="bg-secondary text-muted-foreground rounded px-1.5 text-[10px] tabular-nums">
                {index + 1}
              </span>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", TYPE_BADGE_CLASS[structure.type])}>
                {GRAPH_STRUCTURE_TYPE_LABELS[structure.type]}
              </span>
              <span className="text-muted-foreground ml-auto text-[10px] tabular-nums">
                {structure.nodeCount} 节点
                {structure.edgeCount > 0 && ` · ${structure.edgeCount} 关联`}
              </span>
            </div>
            <div className="truncate text-xs">{structure.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

OutlineWindow.open = () => {
  createSubWindow("OutlineWindow", {
    title: "大纲",
    contextTarget: "activeResourceTab",
    children: <OutlineWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(320, 600)),
  });
};
