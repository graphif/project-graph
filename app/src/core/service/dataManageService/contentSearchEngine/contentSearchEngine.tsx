import { Project, service } from "@/core/Project";
import { RectangleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";

/**
 * 搜索范围枚举
 */
export enum SearchScope {
  /**
   * 搜索整个舞台
   */
  ALL = "all",
  /**
   * 只搜索选中的内容
   */
  SELECTED = "selected",
  /**
   * 搜索选中内容的外接矩形范围内的所有实体
   */
  SELECTED_BOUNDS = "selectedBounds",
}

@service("contentSearch")
export class ContentSearch {
  constructor(private readonly project: Project) {}

  /**
   * 搜索结果
   */
  public searchResultNodes: StageObject[] = [];

  /**
   * 是否忽略大小写
   */
  public isCaseSensitive = false;

  /**
   * 搜索范围
   */
  public searchScope = SearchScope.ALL;

  /**
   * 搜索结果的索引
   */
  public currentSearchResultIndex = 0;

  /**
   * 抽取一个舞台对象的被搜索文本
   * @param stageObject
   * @returns
   */
  public getStageObjectText(stageObject: StageObject): string {
    if (stageObject instanceof TextNode) {
      return stageObject.text + "　" + stageObject.detailsManager.getBeSearchingText();
    } else if (stageObject instanceof Section) {
      return stageObject.text + "　" + stageObject.detailsManager.getBeSearchingText();
    } else if (stageObject instanceof UrlNode) {
      return stageObject.title + "　" + stageObject.detailsManager.getBeSearchingText() + "　" + stageObject.url;
    }
    // 任何实体上都可能会写details
    if (stageObject instanceof Entity) {
      // 不对，这样还是返回"[Object object]" 字符串，但仅仅只是能防止一下报错
      return stageObject.detailsManager.getBeSearchingText();
    }
    // 线上的字
    if (stageObject instanceof Edge) {
      return stageObject.text;
    }
    return "";
  }

  /**
   * 获取选中对象的外接矩形
   * @returns 外接矩形，如果没有选中对象则返回null
   */
  private getSelectedObjectsBounds(): Rectangle | null {
    const selectedObjects = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    if (selectedObjects.length === 0) {
      return null;
    }

    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;

    for (const obj of selectedObjects) {
      const rect = obj.collisionBox.getRectangle();
      minX = Math.min(minX, rect.location.x);
      minY = Math.min(minY, rect.location.y);
      maxX = Math.max(maxX, rect.location.x + rect.size.x);
      maxY = Math.max(maxY, rect.location.y + rect.size.y);
    }

    return new Rectangle(new Vector(minX, minY), new Vector(maxX - minX, maxY - minY));
  }

  /**
   * 判断对象是否在指定范围内
   * @param obj 要判断的对象
   * @param bounds 范围矩形
   * @returns 是否在范围内
   */
  private isObjectInBounds(obj: StageObject, bounds: Rectangle): boolean {
    const objRect = obj.collisionBox.getRectangle();
    return (
      objRect.location.x >= bounds.location.x &&
      objRect.location.y >= bounds.location.y &&
      objRect.location.x + objRect.size.x <= bounds.location.x + bounds.size.x &&
      objRect.location.y + objRect.size.y <= bounds.location.y + bounds.size.y
    );
  }

  public startSearch(searchString: string, autoFocus = true): boolean {
    // 开始搜索
    this.searchResultNodes = [];
    if (searchString === "") {
      return false;
    }

    // 获取要搜索的对象列表
    let objectsToSearch: StageObject[] = [];

    switch (this.searchScope) {
      case SearchScope.SELECTED:
        // 只搜索选中的对象
        objectsToSearch = this.project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
        break;

      case SearchScope.SELECTED_BOUNDS: {
        // 搜索选中对象外接矩形范围内的所有对象
        const bounds = this.getSelectedObjectsBounds();
        if (bounds) {
          objectsToSearch = this.project.stageManager
            .getStageObjects()
            .filter((obj) => this.isObjectInBounds(obj, bounds));
        } else {
          // 如果没有选中对象，搜索所有对象
          objectsToSearch = this.project.stageManager.getStageObjects();
        }
        break;
      }

      case SearchScope.ALL:
      default:
        // 搜索所有对象
        objectsToSearch = this.project.stageManager.getStageObjects();
        break;
    }

    // 执行搜索
    for (const node of objectsToSearch) {
      const text = this.getStageObjectText(node);
      if (this.isCaseSensitive) {
        if (text.includes(searchString)) {
          this.searchResultNodes.push(node);
        }
      } else {
        if (text.toLowerCase().includes(searchString.toLowerCase())) {
          this.searchResultNodes.push(node);
        }
      }
    }
    this.currentSearchResultIndex = 0;

    if (this.searchResultNodes.length > 0) {
      if (autoFocus) {
        // 选择第一个搜索结果节点
        const currentNode = this.searchResultNodes[this.currentSearchResultIndex];
        // currentNode.isSelected = true;
        this.project.effects.addEffect(
          new RectangleNoteEffect(new ProgressNumber(0, 50), currentNode.collisionBox.getRectangle(), Color.Green),
        );
        // 摄像机对准现在的节点
        this.project.camera.location = currentNode.collisionBox.getRectangle().center.clone();
      }

      return true;
    }
    return false;
  }

  /**
   * 切换下一个
   */
  public nextSearchResult() {
    if (this.currentSearchResultIndex < this.searchResultNodes.length - 1) {
      this.currentSearchResultIndex++;
    } else {
      toast("已经到底了");
      return;
    }
    // 取消选择所有节点
    for (const node of this.project.stageManager.getTextNodes()) {
      node.isSelected = false;
    }
    // 选择当前搜索结果节点
    const currentNode = this.searchResultNodes[this.currentSearchResultIndex];
    if (currentNode) {
      this.project.effects.addEffect(
        new RectangleNoteEffect(new ProgressNumber(0, 50), currentNode.collisionBox.getRectangle(), Color.Green),
      );
      // 摄像机对准现在的节点
      this.project.camera.location = currentNode.collisionBox.getRectangle().center.clone();
    }
  }

  /**
   * 切换上一个
   */
  public previousSearchResult() {
    if (this.currentSearchResultIndex > 0) {
      this.currentSearchResultIndex--;
    } else {
      toast("已经到头了");
    }
    // 取消选择所有节点
    for (const node of this.project.stageManager.getTextNodes()) {
      node.isSelected = false;
    }
    // 选择当前搜索结果节点
    const currentNode = this.searchResultNodes[this.currentSearchResultIndex];
    if (currentNode) {
      this.project.effects.addEffect(
        new RectangleNoteEffect(new ProgressNumber(0, 50), currentNode.collisionBox.getRectangle(), Color.Green),
      );
      // 摄像机对准现在的节点
      this.project.camera.location = currentNode.collisionBox.getRectangle().center.clone();
    }
  }
}
