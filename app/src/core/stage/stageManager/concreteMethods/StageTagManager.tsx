import { Color, ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Project, service } from "@/core/Project";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";
import { RectangleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/sprites/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";

/**
 * 标签管理器
 */
@service("tagManager")
export class TagManager {
  constructor(private readonly project: Project) {}

  /**
   * 和project.tags同步
   * 用于提高性能
   * 不要在外界修改
   */
  tagSet: Set<string> = new Set();

  reset(uuids: string[]) {
    this.project.tags = [];
    for (const uuid of uuids) {
      this.project.tags.push(uuid);
      this.tagSet.add(uuid);
    }
  }

  addTag(uuid: string) {
    this.project.tags.push(uuid);
    this.tagSet.add(uuid);
  }

  removeTag(uuid: string) {
    const index = this.project.tags.indexOf(uuid);
    if (index !== -1) {
      this.project.tags.splice(index, 1);
      this.tagSet.delete(uuid);
    }
  }

  /**
   * O(1)查询某uuid是否是标签
   * @param uuid
   * @returns
   */
  hasTag(uuid: string): boolean {
    return this.tagSet.has(uuid);
  }

  /**
   * 清理未引用的标签
   */
  updateTags() {
    const uuids = this.project.tags.slice();
    for (const uuid of uuids) {
      if (!this.project.stage.some((stageObject) => stageObject.uuid === uuid)) {
        this.project.tags.splice(this.project.tags.indexOf(uuid), 1);
        this.tagSet.delete(uuid);
      }
    }
  }

  moveUpTag(uuid: string) {
    const index = this.project.tags.indexOf(uuid);
    if (index !== -1 && index > 0) {
      const temp = this.project.tags[index - 1];
      this.project.tags[index - 1] = uuid;
      this.project.tags[index] = temp;
    }
  }

  moveDownTag(uuid: string) {
    const index = this.project.tags.indexOf(uuid);
    if (index !== -1 && index < this.project.tags.length - 1) {
      const temp = this.project.tags[index + 1];
      this.project.tags[index + 1] = uuid;
      this.project.tags[index] = temp;
    }
  }

  /**
   * 将所有选择的实体添加或移除标签
   *
   * 目前先仅支持TextNode
   */
  changeTagBySelected() {
    for (const selectedEntities of this.project.stageManager.getSelectedStageObjects()) {
      // 若有则删，若无则加
      if (this.hasTag(selectedEntities.uuid)) {
        this.removeTag(selectedEntities.uuid);
      } else {
        this.addTag(selectedEntities.uuid);
      }
    }
  }

  /**
   * 用于ui渲染
   * @returns 所有标签对应的名字
   */
  refreshTagNamesUI() {
    const res: { tagName: string; uuid: string; color: [number, number, number, number] }[] = [];
    const tagObjectList: StageObject[] = this.project.tags
      .map((tagUUID) => this.project.stageManager.get(tagUUID))
      .filter((stageObject): stageObject is StageObject => stageObject !== undefined);

    for (const tagObject of tagObjectList) {
      let title = "";
      let colorItem: [number, number, number, number] = [0, 0, 0, 0];
      if (tagObject instanceof TextNode) {
        title = tagObject.text;
        colorItem = tagObject.color.toArray();
      } else if (tagObject instanceof Section) {
        title = tagObject.text;
        colorItem = tagObject.color.toArray();
      } else if (tagObject instanceof UrlNode) {
        title = tagObject.title;
      } else if (tagObject instanceof ImageNode) {
        title = "Image: " + tagObject.uuid.slice(0, 4);
      } else if (tagObject instanceof Edge) {
        title = tagObject.text.slice(0, 20).trim();
        if (title.length === 0) {
          title = "未命名连线";
        }
        if (tagObject instanceof LineEdge) {
          colorItem = tagObject.color.toArray();
        }
      } else if (tagObject instanceof ConnectPoint) {
        title = "Connect Point: " + tagObject.uuid.slice(0, 4);
      } else {
        title = "Unknown: " + tagObject.uuid.slice(0, 4);
      }
      res.push({ tagName: title, uuid: tagObject.uuid, color: colorItem });
    }
    return res;
  }

  /**
   * 跳转到标签位置
   * @param tagUUID
   * @returns
   */
  moveCameraToTag(tagUUID: string) {
    const tagObject = this.project.stageManager.get(tagUUID);
    if (!tagObject) {
      return;
    }
    if (tagObject instanceof ConnectableEntity) {
      const childNodes = this.project.graphMethods.getSuccessorSet(tagObject);
      const boundingRect = Rectangle.getBoundingRectangle(
        childNodes.map((childNode) => childNode.collisionBox.getRectangle()),
      );
      this.project.camera.resetByRectangle(boundingRect);
      this.project.effects.addEffect(
        new LineCuttingEffect(
          new ProgressNumber(0, 10),
          this.project.renderer.transformView2World(MouseLocation.vector()),
          tagObject.collisionBox.getRectangle().center,
          Color.Green,
          Color.Green,
        ),
      );
      this.project.effects.addEffect(
        new RectangleNoteEffect(
          new ProgressNumber(0, 30),
          boundingRect,
          this.project.stageStyleManager.currentStyle.CollideBoxPreSelected,
        ),
      );
    } else {
      const location = tagObject.collisionBox.getRectangle().center;
      this.project.camera.location = location;
      this.project.effects.addEffect(
        new LineCuttingEffect(
          new ProgressNumber(0, 10),
          this.project.renderer.transformView2World(MouseLocation.vector()),
          location,
          Color.Green,
          Color.Green,
        ),
      );
    }
  }
}
