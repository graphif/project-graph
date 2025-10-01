import { Project, service } from "@/core/Project";
import { RectangleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/sprites/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { Color, ProgressNumber } from "@graphif/data-structures";
import { toast } from "sonner";

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

  public startSearch(searchString: string, autoFocus = true): boolean {
    // 开始搜索
    this.searchResultNodes = [];
    if (searchString === "") {
      return false;
    }
    for (const node of this.project.stageManager.getStageObjects()) {
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
