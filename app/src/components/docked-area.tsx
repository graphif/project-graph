import { ProjectTabs } from "@/ProjectTabs";
import { Project, ProjectState } from "@/core/Project";
import { Tab } from "@/core/Tab";
import { TabGroupNode } from "@/core/TabGroup";
import { TabWorkspace } from "@/core/TabWorkspace";
import { activeGroupIdAtom, activeTabAtom, store, tabDropTargetAtom, tabGroupRootAtom, tabsAtom } from "@/state";
import { cn } from "@/utils/cn";
import { isMac } from "@/utils/platform";
import { useAtomValue } from "jotai";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

function ProjectStatus({ project, isClassroomMode }: { project: Project; isClassroomMode: boolean }) {
  const { t } = useTranslation("projectStatus");
  const [text, setText] = useState("");
  const [viewHint, setViewHint] = useState("");

  useEffect(() => {
    const update = () => {
      const manager = project.stageManager;
      const entities = manager.getEntities();
      const view = project.renderer.getCoverWorldRectangle();
      const hasVisibleNode = entities.some((entity) => {
        if (entity.isHiddenBySectionCollapse) return false;
        const rect = entity.collisionBox.getRectangle();
        return view.isCollideWith(rect) && Math.max(rect.width, rect.height) * project.camera.currentScale >= 1;
      });
      setViewHint(entities.length === 0 ? t("emptyCanvas") : hasVisibleNode ? "" : t("noVisibleNodes"));
      const state = {
        [ProjectState.Saved]: "saved",
        [ProjectState.Stashed]: "stashed",
        [ProjectState.Unsaved]: "unsaved",
      }[project.projectState];
      setText(
        `${t("nodes", { count: manager.getEntities().length })} · ${t("edges", { count: manager.getAssociations().length })} · ${t("selected", { count: manager.getSelectedStageObjects().length })}  |  ${Math.round(project.camera.currentScale * 100)}%  |  ${t(state)}`,
      );
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [project, t]);

  return (
    <div
      className={cn(
        "bg-background text-muted-foreground absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-xs transition-opacity hover:opacity-100",
        isClassroomMode && "opacity-0",
      )}
    >
      <span className="truncate">{viewHint || text}</span>
      <Button variant="ghost" size="sm" className="h-6 shrink-0 px-2 text-xs" onClick={() => project.camera.reset()}>
        {t("fitView")}
      </Button>
    </div>
  );
}

function SplitView({
  node,
  renderNode,
}: {
  node: Extract<TabGroupNode, { type: "split" }>;
  renderNode: (node: TabGroupNode) => React.ReactNode;
}) {
  const horizontal = node.direction === "horizontal";
  return (
    <div className={cn("flex size-full min-h-0 min-w-0", horizontal ? "flex-row" : "flex-col")}>
      <div className="min-h-0 min-w-0" style={{ flexBasis: `${node.sizes[0]}%`, flexGrow: 0, flexShrink: 1 }}>
        {renderNode(node.children[0])}
      </div>
      <div
        className={cn(
          "bg-background z-20 shrink-0 touch-none",
          horizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
        )}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const parent = event.currentTarget.parentElement;
          if (!parent) return;
          const rect = parent.getBoundingClientRect();
          const update = (clientX: number, clientY: number) => {
            const total = horizontal ? rect.width : rect.height;
            const position = horizontal ? clientX - rect.left : clientY - rect.top;
            const first = Math.max(10, Math.min(90, (position / total) * 100));
            TabWorkspace.resizeSplit(node.id, [first, 100 - first]);
          };
          const onMove = (moveEvent: PointerEvent) => update(moveEvent.clientX, moveEvent.clientY);
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
      >
        <div className="bg-border hover:bg-primary size-full cursor-[inherit] transition-colors" />
      </div>
      <div className="min-h-0 min-w-0 flex-1">{renderNode(node.children[1])}</div>
    </div>
  );
}

function DropPreview({ groupId }: { groupId: string }) {
  const target = useAtomValue(tabDropTargetAtom);
  if (target?.groupId !== groupId) return null;
  if (target.edge) {
    const edgeClass = {
      left: "top-0 bottom-0 left-0 w-1/2",
      right: "top-0 right-0 bottom-0 w-1/2",
      top: "top-0 right-0 left-0 h-1/2",
      bottom: "right-0 bottom-0 left-0 h-1/2",
    }[target.edge];
    return <div className={cn("bg-primary/25 border-primary pointer-events-none absolute z-30 border-2", edgeClass)} />;
  }

  const group = Array.from(document.querySelectorAll<HTMLElement>("[data-pg-tab-group-id]")).find(
    (candidate) => candidate.dataset.pgTabGroupId === groupId,
  );
  const tabBar = group?.querySelector<HTMLElement>("[data-pg-tab-bar]");
  if (!group || !tabBar) return null;
  const tabs = Array.from(tabBar.querySelectorAll<HTMLElement>("[data-pg-docked-tab-id]"));
  const groupRect = group.getBoundingClientRect();
  const tabBarRect = tabBar.getBoundingClientRect();
  const nextTab = tabs[target.index ?? tabs.length];
  const previousTab = tabs[Math.min((target.index ?? tabs.length) - 1, tabs.length - 1)];
  const left = nextTab
    ? nextTab.getBoundingClientRect().left - groupRect.left
    : previousTab
      ? previousTab.getBoundingClientRect().right - groupRect.left
      : tabBarRect.left - groupRect.left;

  return (
    <div
      className="bg-primary pointer-events-none absolute z-30 w-0.5"
      style={{ left, top: tabBarRect.top - groupRect.top, height: tabBarRect.height }}
    />
  );
}

export default function DockedArea({
  onTabClick,
  onTabClose,
  onTitleBarMouseDown,
  isClassroomMode,
}: {
  onTabClick: (tab: Tab) => void;
  onTabClose: (tab: Tab) => void;
  onTitleBarMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  isClassroomMode: boolean;
}) {
  const root = useAtomValue(tabGroupRootAtom);
  const tabs = useAtomValue(tabsAtom);
  const activeGroupId = useAtomValue(activeGroupIdAtom);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const tabSpace = document.querySelector<HTMLElement>("[data-pg-titlebar-tab-space]");
    if (!container || !tabSpace) return;
    const topBars = container.querySelectorAll<HTMLElement>("[data-pg-window-top-tabs]");
    const update = () => {
      const space = tabSpace.getBoundingClientRect();
      const minimumWidth = 96 * (Number(getComputedStyle(container).getPropertyValue("--pg-ui-scale")) || 1);
      for (const bar of topBars) {
        const rect = bar.getBoundingClientRect();
        const left = Math.min(rect.right, Math.max(rect.left, space.left));
        const right = Math.max(left, Math.min(rect.right, space.right));
        const separateRow = right - left < Math.min(rect.width, minimumWidth);
        bar.toggleAttribute("data-pg-tabs-separate-row", separateRow);
        bar.style.paddingLeft = separateRow ? "" : `${left - rect.left}px`;
        bar.style.paddingRight = separateRow ? "" : `${rect.right - right}px`;
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(tabSpace);
    update();
    return () => observer.disconnect();
  }, [root]);

  const renderNode = (node: TabGroupNode, atWindowTop = true): React.ReactNode => {
    if (node.type === "split") {
      return (
        <SplitView
          key={node.id}
          node={node}
          renderNode={(child) =>
            renderNode(child, atWindowTop && (node.direction === "horizontal" || child === node.children[0]))
          }
        />
      );
    }
    const groupTabs = node.tabIds.flatMap((id) => {
      const tab = tabs.find((candidate) => candidate.id === id && candidate.layout === "docked");
      return tab ? [tab] : [];
    });
    const activeTab = groupTabs.find((tab) => tab.id === node.activeTabId) ?? groupTabs.at(-1);
    return (
      <section
        key={node.id}
        data-pg-tab-group-id={node.id}
        className={cn(
          "relative flex size-full min-h-0 min-w-0 flex-col overflow-hidden",
          activeTab && !(activeTab instanceof Project) && "bg-background has-[[data-pg-settings-view]]:bg-transparent",
          root?.type === "split" && "border-background outline-border border outline-1 -outline-offset-1",
          root?.type === "split" && activeGroupId === node.id && "outline-primary/60",
        )}
        onPointerDownCapture={() => {
          if (activeTab && store.get(activeTabAtom) !== activeTab) TabWorkspace.focus(activeTab.id);
        }}
      >
        <div
          data-pg-window-top-tabs={atWindowTop ? "" : undefined}
          className={cn(
            "pointer-events-none relative z-10 flex shrink-0 items-center",
            atWindowTop &&
              "h-[calc(2rem*var(--pg-ui-scale,1))] data-[pg-tabs-separate-row]:h-auto data-[pg-tabs-separate-row]:pt-[calc(2rem*var(--pg-ui-scale,1))] sm:h-[calc(3.5rem*var(--pg-ui-scale,1))] sm:data-[pg-tabs-separate-row]:pt-[calc(3.5rem*var(--pg-ui-scale,1))]",
            atWindowTop && isMac && "sm:pt-[calc(1.5rem*var(--pg-ui-scale,1))]",
          )}
          onMouseDown={(event) => {
            if (atWindowTop && !(event.target as Element).closest("[data-pg-docked-tab-id]")) {
              onTitleBarMouseDown(event);
            }
          }}
        >
          <div data-pg-tab-bar-drop-zone className="min-w-0 flex-1" style={{ zoom: "var(--pg-ui-scale, 1)" }}>
            <ProjectTabs
              groupId={node.id}
              tabs={groupTabs}
              activeTab={activeTab}
              onTabClick={onTabClick}
              onTabClose={onTabClose}
              isClassroomMode={isClassroomMode}
            />
          </div>
        </div>
        <div
          className={cn(
            "min-h-0 min-w-0 overflow-hidden",
            activeTab instanceof Project ? "absolute inset-0" : "relative flex-1",
          )}
        >
          {activeTab && React.createElement(activeTab.getComponent())}
          {activeTab instanceof Project && (
            <ProjectStatus key={activeTab.id} project={activeTab} isClassroomMode={isClassroomMode} />
          )}
        </div>
        <DropPreview groupId={node.id} />
      </section>
    );
  };

  return (
    <div ref={containerRef} className="absolute inset-0 min-h-0 min-w-0 overflow-hidden">
      {root && renderNode(root)}
    </div>
  );
}
