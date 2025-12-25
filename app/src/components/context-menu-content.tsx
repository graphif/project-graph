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
  ListEnd,
  Grip,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  MoveUpRight,
  Network,
  Package,
  Palette,
  RefreshCcw,
  Slash,
  Spline,
  SquareDot,
  SquareRoundCorner,
  SquareSquare,
  TextSelect,
  Trash,
  Undo,
  SquaresUnite,
  SquareSplitHorizontal,
  Repeat2,
  ArrowLeftFromLine,
  Check,
  GitPullRequestCreateArrow,
  LayoutPanelTop,
  Rabbit,
  MoveDown,
  MoveRight,
  PaintBucket,
  ChevronUp,
  MoveUp,
  ChevronDown,
  Sun,
  SunDim,
  Ellipsis,
  SquareDashedBottomCode,
  RefreshCcwDot,
  CornerUpRight,
  Workflow,
  Equal,
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
import { ConnectNodeSmartTools } from "@/core/service/dataManageService/connectNodeSmartTools";
import { ColorSmartTools } from "@/core/service/dataManageService/colorSmartTools";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";

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

  // 简化判断，只要选中了两个及以上的节点就显示按钮
  const hasMultipleSelectedEntities = () => {
    const selectedEntities = p.stageManager.getSelectedEntities();
    return selectedEntities.length >= 2 && selectedEntities.every((entity) => entity instanceof ConnectableEntity);
  };

  return (
    <Content>
      {/* 第一行 Ctrl+c/v/x del */}
      <Item className="bg-transparent! gap-0 p-0">
        <KeyTooltip keyId="copy">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              p.copyEngine.copy();
            }}
          >
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
          <ContextMenuTooltip keyId="treeGraphAdjust">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() =>
                p.autoAlign.autoLayoutSelectedFastTreeMode(p.stageManager.getSelectedEntities()[0] as ConnectableEntity)
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

      {/* DAG面板 */}
      {hasMultipleSelectedEntities() && (
        <Item className="bg-transparent! gap-0 p-0">
          <ContextMenuTooltip keyId="dagGraphAdjust">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                const selectedEntities = p.stageManager
                  .getSelectedEntities()
                  .filter((entity) => entity instanceof ConnectableEntity);
                if (p.graphMethods.isDAGByNodes(selectedEntities)) {
                  p.autoLayout.autoLayoutDAG(selectedEntities);
                } else {
                  toast.error("选中的节点不构成有向无环图（DAG）");
                }
              }}
            >
              <Workflow />
            </Button>
          </ContextMenuTooltip>
        </Item>
      )}

      <p className="pl-1 text-xs opacity-50">{contextMenuTooltipWords || "暂无提示"}</p>

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
              <Rabbit />
              文本节点 巧妙操作
            </SubTrigger>
            <SubContent>
              <Item onClick={() => TextNodeSmartTools.ttt(p)}>
                <ListEnd />
                切换换行模式
                <span className="text-xs opacity-50">[t, t, t]</span>
              </Item>
              <Item onClick={() => TextNodeSmartTools.rua(p)}>
                <SquaresUnite />
                ruá成一个
                <span className="text-xs opacity-50">[r, u, a]</span>
              </Item>
              <Item onClick={() => TextNodeSmartTools.kei(p)}>
                <SquareSplitHorizontal />
                kēi成多个
                <span className="text-xs opacity-50">[k, e, i]</span>
              </Item>
              <Item onClick={() => TextNodeSmartTools.exchangeTextAndDetails(p)}>
                <Repeat2 />
                详略交换
                <span className="text-xs opacity-50">[e, e, e, e, e]</span>
              </Item>
              <Item onClick={() => TextNodeSmartTools.removeFirstCharFromSelectedTextNodes(p)}>
                <ArrowLeftFromLine />
                削头
                <span className="text-xs opacity-50">[ctrl+backspace]</span>
              </Item>
              <Item onClick={() => TextNodeSmartTools.removeLastCharFromSelectedTextNodes(p)}>
                <ArrowRightFromLine />
                剃尾
                <span className="text-xs opacity-50">[ctrl+delete]</span>
              </Item>

              <Item onClick={() => TextNodeSmartTools.okk(p)}>
                <Check />
                打勾勾
                <span className="text-xs opacity-50">[o, k, k]</span>
              </Item>

              <Item
                onClick={() =>
                  p.stageManager
                    .getSelectedEntities()
                    .filter((it) => it instanceof TextNode)
                    .map((it) => p.sectionPackManager.targetTextNodeToSection(it, false, true))
                }
              >
                <Package />
                {t("convertToSection")}
                <span className="text-xs opacity-50">[ctrl+shift+G]</span>
              </Item>
              <Sub>
                <SubTrigger>
                  <Network />
                  连接相关
                </SubTrigger>
                <SubContent>
                  <Item onClick={() => ConnectNodeSmartTools.insertNodeToTree(p)}>
                    <GitPullRequestCreateArrow />
                    嫁接到连线中
                    <span className="text-xs opacity-50">[q, e]</span>
                  </Item>
                  <Item onClick={() => ConnectNodeSmartTools.removeNodeFromTree(p)}>
                    <ArrowLeftFromLine />
                    从连线中摘除
                    <span className="text-xs opacity-50">[q, r]</span>
                  </Item>
                  <Item onClick={() => ConnectNodeSmartTools.connectDown(p)}>
                    <MoveDown />
                    向下连一串
                    <span className="text-xs opacity-50">[-, -, d, o, w, n]</span>
                  </Item>
                  <Item onClick={() => ConnectNodeSmartTools.connectRight(p)}>
                    <MoveRight />
                    向右连一串
                    <span className="text-xs opacity-50">[-, -, r, i, g, h, t]</span>
                  </Item>
                  <Item onClick={() => ConnectNodeSmartTools.connectAll(p)}>
                    <Asterisk />
                    全连接
                    <span className="text-xs opacity-50">[-, -, a, l, l]</span>
                  </Item>
                </SubContent>
              </Sub>
              <Sub>
                <SubTrigger>
                  <PaintBucket />
                  颜色相关
                </SubTrigger>
                <SubContent>
                  <Item onClick={() => ColorSmartTools.increaseBrightness(p)}>
                    <Sun />
                    增加亮度
                    <span className="text-xs opacity-50">[b, .]</span>
                  </Item>
                  <Item onClick={() => ColorSmartTools.decreaseBrightness(p)}>
                    <SunDim />
                    降低亮度
                    <span className="text-xs opacity-50">[b, ,]</span>
                  </Item>
                  <Item onClick={() => ColorSmartTools.changeColorHueUp(p)}>
                    <ChevronUp />
                    增加色相值
                    <span className="text-xs opacity-50">[Alt+Shift+⬆]</span>
                  </Item>
                  <Item onClick={() => ColorSmartTools.changeColorHueDown(p)}>
                    <ChevronDown />
                    降低色相值
                    <span className="text-xs opacity-50">[Alt+Shift+⬇]</span>
                  </Item>
                  <Item onClick={() => ColorSmartTools.changeColorHueMajorUp(p)}>
                    <MoveUp />
                    大幅度增加色相值
                    <span className="text-xs opacity-50">[Alt+Shift+Home]</span>
                  </Item>
                  <Item onClick={() => ColorSmartTools.changeColorHueMajorDown(p)}>
                    <MoveDown />
                    大幅度降低色相值
                    <span className="text-xs opacity-50">[Alt+Shift+End]</span>
                  </Item>
                </SubContent>
              </Sub>
              <Sub>
                <SubTrigger>
                  <Ellipsis />
                  其他
                </SubTrigger>
                <SubContent>
                  <Item onClick={() => TextNodeSmartTools.changeTextNodeToReferenceBlock(p)}>
                    <SquareDashedBottomCode />
                    将选中的文本节点转换为引用块
                  </Item>
                </SubContent>
              </Sub>
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
      {/* 存在选中 引用块 */}
      {p.stageManager.getSelectedEntities().filter((it) => it instanceof ReferenceBlockNode).length > 0 && (
        <>
          <Item
            onClick={() => {
              p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ReferenceBlockNode)
                .filter((it) => it.isSelected)
                .forEach((it) => {
                  it.refresh();
                });
            }}
          >
            <RefreshCcwDot />
            刷新引用块
          </Item>
          <Item
            onClick={() => {
              p.stageManager
                .getSelectedEntities()
                .filter((it) => it instanceof ReferenceBlockNode)
                .filter((it) => it.isSelected)
                .forEach((it) => {
                  it.goToSource();
                });
            }}
          >
            <CornerUpRight />
            进入该引用块所在的源头位置
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
          <Sub>
            <SubTrigger>
              <ArrowRightFromLine />
              线条类型
            </SubTrigger>
            <SubContent>
              <Item
                onClick={() => {
                  p.stageManager.setSelectedEdgeLineType("solid");
                  p.historyManager.recordStep();
                }}
              >
                <SquareSquare />
                实线
              </Item>
              <Item
                onClick={() => {
                  p.stageManager.setSelectedEdgeLineType("dashed");
                  p.historyManager.recordStep();
                }}
              >
                <SquareDashedBottomCode />
                虚线
              </Item>
              <Item
                onClick={() => {
                  p.stageManager.setSelectedEdgeLineType("double");
                  p.historyManager.recordStep();
                }}
              >
                <Equal />
                双实线
              </Item>
            </SubContent>
          </Sub>
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
          }
          if (seq.meta) {
            res += "Meta+";
          }
          if (seq.shift) {
            res += "Shift+";
          }
          if (seq.alt) {
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
