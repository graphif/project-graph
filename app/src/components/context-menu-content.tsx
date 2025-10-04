import { Button } from "@/components/ui/button";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeProjectAtom, contextMenuTooltipWordsAtom } from "@/state";
import { Color } from "@graphif/data-structures";
import { useAtom } from "jotai";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  ArrowDownUp,
  ArrowLeftRight,
  ArrowRightFromLine,
  ArrowUpRight,
  ArrowUpToLine,
  Asterisk,
  Box,
  ChevronsRightLeft,
  Clipboard,
  Code,
  Copy,
  Dot,
  ExternalLink,
  FlaskConical,
  ListEnd,
  Grip,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  MousePointer,
  MoveHorizontal,
  MoveUpRight,
  Network,
  Package,
  Palette,
  Pencil,
  RefreshCcw,
  Slash,
  Spline,
  SquareDot,
  SquareRoundCorner,
  SquareSquare,
  TextSelect,
  Trash,
  Undo,
  Waypoints,
  SquaresUnite,
  SquareSplitHorizontal,
  Repeat2,
  ArrowLeftFromLine,
  Check,
  GitPullRequestCreateArrow,
  LayoutPanelTop,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import tailwindColors from "tailwindcss/colors";
import KeyTooltip from "./key-tooltip";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { Direction } from "@/types/directions";
import { openBrowserOrFile } from "@/utils/externalOpen";
import { ReactNode, useEffect, useState } from "react";
import { ColorManager } from "@/core/service/feedbackService/ColorManager";
import ColorWindow from "@/sub/ColorWindow";
import { TextNodeSmartTools } from "@/core/service/dataManageService/textNodeSmartTools";
import { parseEmacsKey } from "@/utils/emacs";

const Content = ContextMenuContent;
const Item = ContextMenuItem;
const Sub = ContextMenuSub;
const SubTrigger = ContextMenuSubTrigger;
const SubContent = ContextMenuSubContent;
// const Separator = ContextMenuSeparator;

/**
 * 右键菜单
 * @returns
 */
export default function MyContextMenuContent() {
  const [p] = useAtom(activeProjectAtom);
  const [contextMenuTooltipWords] = useAtom(contextMenuTooltipWordsAtom);
  const { t } = useTranslation("contextMenu");
  if (!p) return <></>;

  const isSelectedTreeRoots = () => {
    const selectedEntities = p.stageManager.getSelectedEntities();
    if (selectedEntities.length === 0) return false;
    return selectedEntities.every((entity) => {
      return entity instanceof ConnectableEntity && p.graphMethods.isTree(entity);
    });
  };

  return (
    <Content>
      {/* 第一行 Ctrl+c/v/x del */}
      <Item className="bg-transparent! gap-0 p-0">
        <KeyTooltip keyId="copy">
          <Button variant="ghost" size="icon" onClick={() => p.copyEngine.copy()}>
            <Copy />
          </Button>
        </KeyTooltip>
        <KeyTooltip keyId="paste">
          <Button variant="ghost" size="icon" onClick={() => p.copyEngine.paste()}>
            <Clipboard />
          </Button>
        </KeyTooltip>
        {p.stageManager.getSelectedStageObjects().length > 0 && (
          <KeyTooltip keyId="deleteSelectedStageObjects">
            <Button variant="ghost" size="icon" onClick={() => p.stageManager.deleteSelectedStageObjects()}>
              <Trash className="text-destructive" />
            </Button>
          </KeyTooltip>
        )}
        <KeyTooltip keyId="undo">
          <Button variant="ghost" size="icon" onClick={() => p.historyManager.undo()}>
            <Undo />
          </Button>
        </KeyTooltip>

        {/* 先不放cut，感觉不常用，可能还很容易出bug */}
        {/* <KeyTooltip keyId="cut">
          <Button variant="ghost" size="icon" onClick={() => p.copyEngine.cut()}>
            <Scissors />
          </Button>
        </KeyTooltip> */}
      </Item>

      {/* 对齐面板 */}
      <Item className="bg-transparent! gap-0 p-0">
        {p.stageManager.getSelectedEntities().length >= 2 && (
          <div className="grid grid-cols-3 grid-rows-3">
            <ContextMenuTooltip keyId="alignTop">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManager.alignTop()}>
                <AlignStartHorizontal />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="alignTopToBottomNoSpace">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignTopToBottomNoSpace()}
              >
                <AlignVerticalJustifyStart />
              </Button>
            </ContextMenuTooltip>
            <div />
            <ContextMenuTooltip keyId="alignCenterHorizontal">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignCenterHorizontal()}
              >
                <AlignCenterHorizontal />
              </Button>
            </ContextMenuTooltip>

            <ContextMenuTooltip keyId="alignVerticalSpaceBetween">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignVerticalSpaceBetween()}
              >
                <AlignVerticalSpaceBetween />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="layoutToSquare">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.layoutToSquare(p.stageManager.getSelectedEntities())}
              >
                <Grip />
              </Button>
            </ContextMenuTooltip>

            <ContextMenuTooltip keyId="alignBottom">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManager.alignBottom()}>
                <AlignEndHorizontal />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="layoutToTightSquare">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.layoutToTightSquare(p.stageManager.getSelectedEntities())}
              >
                <LayoutDashboard />
              </Button>
            </ContextMenuTooltip>
            <div />
          </div>
        )}
        {p.stageManager.getSelectedEntities().length >= 2 && (
          <div className="grid grid-cols-3 grid-rows-3">
            <ContextMenuTooltip keyId="alignLeft">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManager.alignLeft()}>
                <AlignStartVertical />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="alignCenterVertical">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignCenterVertical()}
              >
                <AlignCenterVertical />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="alignRight">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => p.layoutManager.alignRight()}>
                <AlignEndVertical />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="alignLeftToRightNoSpace">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignLeftToRightNoSpace()}
              >
                <AlignHorizontalJustifyStart />
              </Button>
            </ContextMenuTooltip>

            <ContextMenuTooltip keyId="alignHorizontalSpaceBetween">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.alignHorizontalSpaceBetween()}
              >
                <AlignHorizontalSpaceBetween />
              </Button>
            </ContextMenuTooltip>

            <div />

            <ContextMenuTooltip keyId="adjustSelectedTextNodeWidthMin">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.adjustSelectedTextNodeWidth("minWidth")}
              >
                <ChevronsRightLeft />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="adjustSelectedTextNodeWidthAverage">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.adjustSelectedTextNodeWidth("average")}
              >
                <MoveHorizontal />
              </Button>
            </ContextMenuTooltip>
            <ContextMenuTooltip keyId="adjustSelectedTextNodeWidthMax">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.layoutManager.adjustSelectedTextNodeWidth("maxWidth")}
              >
                <Code />
              </Button>
            </ContextMenuTooltip>
          </div>
        )}
      </Item>
      {/* 树形面板 */}
      {isSelectedTreeRoots() && (
        <Item className="bg-transparent! gap-0 p-0">
          <ContextMenuTooltip keyId="autoLayoutSelectedFastTreeModeRight">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() =>
                p.autoAlign.autoLayoutSelectedFastTreeModeRight(
                  p.stageManager.getSelectedEntities()[0] as ConnectableEntity,
                )
              }
            >
              <Network className="-rotate-90" />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="treeReverseX">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() =>
                p.autoLayoutFastTree.treeReverseX(p.stageManager.getSelectedEntities()[0] as ConnectableEntity)
              }
            >
              <ArrowLeftRight />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="autoLayoutSelectedFastTreeModeDown">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() =>
                p.autoAlign.autoLayoutSelectedFastTreeModeDown(
                  p.stageManager.getSelectedEntities()[0] as ConnectableEntity,
                )
              }
            >
              <Network />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="treeReverseY">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() =>
                p.autoLayoutFastTree.treeReverseY(p.stageManager.getSelectedEntities()[0] as ConnectableEntity)
              }
            >
              <ArrowDownUp />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="textNodeTreeToSection">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                const textNodes = p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode);
                for (const textNode of textNodes) {
                  p.sectionPackManager.textNodeTreeToSection(textNode);
                }
              }}
            >
              <LayoutPanelTop />
            </Button>
          </ContextMenuTooltip>
          <ContextMenuTooltip keyId="layoutToTightSquareDeep">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => p.layoutManager.layoutBySelected(p.layoutManager.layoutToTightSquare, true)}
            >
              <SquareSquare />
            </Button>
          </ContextMenuTooltip>
        </Item>
      )}

      <p className="pl-1 text-xs opacity-50">{contextMenuTooltipWords}</p>

      {/* 存在选中实体 */}
      {p.stageManager.getSelectedStageObjects().length > 0 &&
        p.stageManager.getSelectedStageObjects().some((it) => "color" in it) && (
          <>
            {/* 更改更简单的颜色 */}
            <ColorLine />
            {/* 更改更详细的颜色 */}
            <Sub>
              <SubTrigger>
                <Palette />
                {t("changeColor")}
              </SubTrigger>
              <SubContent>
                <Item onClick={() => p.stageObjectColorManager.setSelectedStageObjectColor(Color.Transparent)}>
                  <Slash />
                  {t("resetColor")}
                </Item>
                <Item className="bg-transparent! grid grid-cols-11 gap-0">
                  {Object.values(tailwindColors)
                    .filter((it) => typeof it !== "string")
                    .slice(4)
                    .flatMap((it) => Object.values(it).map(Color.fromCss))
                    .map((color, index) => (
                      <div
                        key={index}
                        className="hover:outline-accent-foreground size-4 -outline-offset-2 hover:outline-2"
                        style={{ backgroundColor: color.toString() }}
                        onMouseEnter={() => p.stageObjectColorManager.setSelectedStageObjectColor(color)}
                      />
                    ))}
                </Item>
                <Item onClick={() => p.stageObjectColorManager.setSelectedStageObjectColor(new Color(11, 45, 14, 0))}>
                  改为强制特殊透明色
                </Item>
                <Item
                  onClick={() => {
                    ColorWindow.open();
                  }}
                >
                  打开调色板
                </Item>
              </SubContent>
            </Sub>
          </>
        )}
      {/* 存在两个及以上选中实体 */}
      {p.stageManager.getSelectedEntities().length >= 2 && (
        <>
          <Item onClick={() => p.stageManager.packEntityToSectionBySelected()}>
            <Box />
            {t("packToSection")}
          </Item>
          <Item
            onClick={() => {
              const selectedNodes = p.stageManager
                .getSelectedEntities()
                .filter((node) => node instanceof ConnectableEntity);
              if (selectedNodes.length <= 1) {
                toast.error("至少选择两个可连接节点");
                return;
              }
              const edge = MultiTargetUndirectedEdge.createFromSomeEntity(p, selectedNodes);
              p.stageManager.add(edge);
            }}
          >
            <Asterisk />
            {t("createMTUEdgeLine")}
          </Item>
          <Item
            onClick={() => {
              const selectedNodes = p.stageManager
                .getSelectedEntities()
                .filter((node) => node instanceof ConnectableEntity);
              if (selectedNodes.length <= 1) {
                toast.error("至少选择两个可连接节点");
                return;
              }
              const edge = MultiTargetUndirectedEdge.createFromSomeEntity(p, selectedNodes);
              edge.renderType = "convex";
              p.stageManager.add(edge);
            }}
          >
            <SquareRoundCorner />
            {t("createMTUEdgeConvex")}
          </Item>
        </>
      )}
      {/* 没有选中实体，提示用户可以创建实体 */}
      {p.stageManager.getSelectedStageObjects().length === 0 && (
        <>
          <Item
            onClick={() =>
              p.controllerUtils.addTextNodeByLocation(p.renderer.transformView2World(MouseLocation.vector()), true)
            }
          >
            <TextSelect />
            {t("createTextNode")}
          </Item>
          <Item
            onClick={() => p.controllerUtils.createConnectPoint(p.renderer.transformView2World(MouseLocation.vector()))}
          >
            <Dot />
            {t("createConnectPoint")}
          </Item>
        </>
      )}
      {/* 存在选中 TextNode */}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof TextNode).length > 0 && (
        <>
          <Sub>
            <SubTrigger>
              <FlaskConical />
              文本节点 巧妙操作
            </SubTrigger>
            <SubContent>
              <Item onClick={() => TextNodeSmartTools.ttt(p)}>
                <ListEnd />
                切换换行模式
              </Item>
              <Item onClick={() => TextNodeSmartTools.rua(p)}>
                <SquaresUnite />
                ruá成一个
              </Item>
              <Item onClick={() => TextNodeSmartTools.kei(p)}>
                <SquareSplitHorizontal />
                kēi成多个
              </Item>
              <Item onClick={() => TextNodeSmartTools.exchangeTextAndDetails(p)}>
                <Repeat2 />
                详略交换
              </Item>
              <Item onClick={() => TextNodeSmartTools.removeFirstCharFromSelectedTextNodes(p)}>
                <ArrowLeftFromLine />
                削头
              </Item>
              <Item onClick={() => TextNodeSmartTools.removeLastCharFromSelectedTextNodes(p)}>
                <ArrowRightFromLine />
                剃尾
              </Item>
              <Item onClick={() => TextNodeSmartTools.insertNodeToTree(p)}>
                <GitPullRequestCreateArrow />
                接入树
              </Item>
              <Item onClick={() => TextNodeSmartTools.okk(p)}>
                <Check />
                打勾勾
              </Item>
              <Item
                onClick={() =>
                  p.stageManager
                    .getSelectedEntities()
                    .filter((it) => it instanceof TextNode)
                    .map((it) => p.sectionPackManager.targetTextNodeToSection(it))
                }
              >
                <Package />
                {t("convertToSection")}
              </Item>
            </SubContent>
          </Sub>

          <Item onClick={() => openBrowserOrFile(p)}>
            <ExternalLink />
            将内容视为路径并打开
          </Item>
        </>
      )}
      {/* 存在选中 Section */}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof Section).length > 0 && (
        <>
          <Item onClick={() => p.stageManager.sectionSwitchCollapse()}>
            <Package />
            {t("toggleSectionCollapse")}
          </Item>
        </>
      )}
      {/* 存在选中的 Edge */}
      {p.stageManager.getSelectedAssociations().filter((it) => it instanceof Edge).length > 0 && (
        <>
          <Item
            onClick={() => {
              p.stageManager.switchEdgeToUndirectedEdge();
              p.historyManager.recordStep();
            }}
          >
            <Spline />
            转换为无向边
          </Item>
          <Item className="bg-transparent! gap-0 p-0">
            <div className="grid grid-cols-3 grid-rows-3">
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Up, true)}
              >
                <ArrowRightFromLine className="-rotate-90" />
              </Button>
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Left, true)}
              >
                <ArrowRightFromLine className="-rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(null, true)}
              >
                <SquareDot />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Right, true)}
              >
                <ArrowRightFromLine />
              </Button>
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Down, true)}
              >
                <ArrowRightFromLine className="rotate-90" />
              </Button>
              <div></div>
            </div>
            <div className="grid grid-cols-3 grid-rows-3">
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Up)}
              >
                <ArrowUpToLine className="rotate-180" />
              </Button>
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Left)}
              >
                <ArrowUpToLine className="rotate-90" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(null)}
              >
                <SquareDot />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Right)}
              >
                <ArrowUpToLine className="-rotate-90" />
              </Button>
              <div></div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => p.stageManager.changeSelectedEdgeConnectLocation(Direction.Down)}
              >
                <ArrowUpToLine />
              </Button>
              <div></div>
            </div>
          </Item>
        </>
      )}

      {/* 存在选中的 MTUEdge */}
      {p.stageManager.getSelectedAssociations().filter((it) => it instanceof MultiTargetUndirectedEdge).length > 0 && (
        <>
          <Sub>
            <SubTrigger>
              <ArrowUpRight />
              {t("switchMTUEdgeArrow")}
            </SubTrigger>
            <SubContent>
              <Item
                onClick={() => {
                  const selectedMTUEdges = p.stageManager
                    .getSelectedAssociations()
                    .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
                  for (const multi_target_undirected_edge of selectedMTUEdges) {
                    multi_target_undirected_edge.arrow = "outer";
                  }
                  p.historyManager.recordStep();
                }}
              >
                <Maximize2 />
                {t("mtuEdgeArrowOuter")}
              </Item>
              <Item
                onClick={() => {
                  const selectedMTUEdges = p.stageManager
                    .getSelectedAssociations()
                    .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
                  for (const multi_target_undirected_edge of selectedMTUEdges) {
                    multi_target_undirected_edge.arrow = "inner";
                  }
                  p.historyManager.recordStep();
                }}
              >
                <Minimize2 />
                {t("mtuEdgeArrowInner")}
              </Item>
              <Item
                onClick={() => {
                  const selectedMTUEdges = p.stageManager
                    .getSelectedAssociations()
                    .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
                  for (const multi_target_undirected_edge of selectedMTUEdges) {
                    multi_target_undirected_edge.arrow = "none";
                  }
                  p.historyManager.recordStep();
                }}
              >
                <Slash />
                {t("mtuEdgeArrowNone")}
              </Item>
            </SubContent>
          </Sub>

          <Item
            onClick={() => {
              const selectedMTUEdge = p.stageManager
                .getSelectedAssociations()
                .filter((edge) => edge instanceof MultiTargetUndirectedEdge);
              for (const multi_target_undirected_edge of selectedMTUEdge) {
                if (multi_target_undirected_edge.renderType === "line") {
                  multi_target_undirected_edge.renderType = "convex";
                } else if (multi_target_undirected_edge.renderType === "convex") {
                  multi_target_undirected_edge.renderType = "circle";
                } else if (multi_target_undirected_edge.renderType === "circle") {
                  multi_target_undirected_edge.renderType = "line";
                }
              }
              p.historyManager.recordStep();
            }}
          >
            <RefreshCcw />
            {t("switchMTUEdgeRenderType")}
          </Item>

          <Item
            onClick={() => {
              p.stageManager.switchUndirectedEdgeToEdge();
              p.historyManager.recordStep();
            }}
          >
            <MoveUpRight />
            {t("convertToDirectedEdge")}
          </Item>
        </>
      )}

      {/* 涂鸦模式增加修改画笔颜色 */}
      {Settings.mouseLeftMode === "draw" && (
        <Sub>
          <SubTrigger>
            <Palette />
            改变画笔颜色
          </SubTrigger>
          <SubContent>
            <Item onClick={() => (Settings.autoFillPenStrokeColor = Color.Transparent.toArray())}>
              <Slash />
              {t("resetColor")}
            </Item>
            <Item className="bg-transparent! grid grid-cols-11 gap-0">
              {Object.values(tailwindColors)
                .filter((it) => typeof it !== "string")
                .flatMap((it) => Object.values(it).map(Color.fromCss))
                .map((color, index) => (
                  <div
                    key={index}
                    className="hover:outline-accent-foreground size-4 -outline-offset-2 hover:outline-2"
                    style={{ backgroundColor: color.toString() }}
                    onMouseEnter={() => (Settings.autoFillPenStrokeColor = color.toArray())}
                  />
                ))}
            </Item>
          </SubContent>
        </Sub>
      )}

      {/* 鼠标模式 */}
      <Item className="bg-transparent! gap-0 p-0">
        <KeyTooltip keyId="checkoutLeftMouseToSelectAndMove">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              Settings.mouseLeftMode = "selectAndMove";
            }}
          >
            <MousePointer />
          </Button>
        </KeyTooltip>

        <KeyTooltip keyId="checkoutLeftMouseToDrawing">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              Settings.mouseLeftMode = "draw";
            }}
          >
            <Pencil />
          </Button>
        </KeyTooltip>
        <KeyTooltip keyId="checkoutLeftMouseToConnectAndCutting">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              Settings.mouseLeftMode = "connectAndCut";
            }}
          >
            <Waypoints />
          </Button>
        </KeyTooltip>
      </Item>
    </Content>
  );
}

function ContextMenuTooltip({ keyId, children = <></> }: { keyId: string; children: ReactNode }) {
  const [keySeq, setKeySeq] = useState<ReturnType<typeof parseEmacsKey>[number][]>();
  const [activeProject] = useAtom(activeProjectAtom);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setContextMenuTooltipWords] = useAtom(contextMenuTooltipWordsAtom);
  const { t } = useTranslation("keyBinds");

  useEffect(() => {
    activeProject?.keyBinds.get(keyId)?.then((key) => {
      if (key) {
        const parsed = parseEmacsKey(key);
        if (parsed.length > 0) {
          setKeySeq(parsed);
        } else {
          setKeySeq(undefined);
        }
      } else {
        setKeySeq(undefined);
      }
    });
  }, [keyId, activeProject]);

  const onMouseEnter = () => {
    const title = t(`${keyId}.title`);
    let keyTips = "";
    if (keySeq) {
      keyTips = keySeq
        .map((seq) => {
          let res = "";
          if (seq.control) {
            res += "Ctrl+";
          } else if (seq.meta) {
            res += "Meta+";
          } else if (seq.shift) {
            res += "Shift+";
          } else if (seq.alt) {
            res += "Alt+";
          }
          return res + seq.key.toUpperCase();
        })
        .join(",");
    } else {
      keyTips = "未绑定快捷键";
    }
    setContextMenuTooltipWords(`${title} [${keyTips}]`);
  };

  const onMouseLeave = () => {
    setContextMenuTooltipWords("");
  };

  return (
    <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </span>
  );
}

const ColorLine: React.FC = () => {
  const [currentColors, setCurrentColors] = useState<Color[]>([]);
  const [project] = useAtom(activeProjectAtom);

  useEffect(() => {
    ColorManager.getUserEntityFillColors().then((colors) => {
      setCurrentColors(colors);
    });
  }, []);

  const handleChangeColor = (color: Color) => {
    project?.stageObjectColorManager.setSelectedStageObjectColor(color);
  };

  return (
    <div className="flex max-w-64 overflow-x-auto">
      {currentColors.map((color) => {
        return (
          <div
            className="hover:outline-accent-foreground size-4 cursor-pointer -outline-offset-2 hover:outline-2"
            key={color.toString()}
            style={{
              backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
            }}
            onClick={() => {
              handleChangeColor(color);
            }}
          />
        );
      })}
    </div>
  );
};
