import { Color } from "@graphif/color";
import { ProgressNumber } from "@graphif/data-structures";
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
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";

@service("tagManager")
export class TagManager {
  constructor(private readonly project: Project) {}

  /**
   * 将所有选择的实体添加或移除标签
   *
   * 目前先仅支持TextNode
   */
  changeTagBySelected() {
    for (const selectedEntities of this.project.stageManager.getSelectedStageObjects()) {
      // 若有则删，若无则加
      if (this.project.stageManager.TagOptions.hasTag(selectedEntities.uuid)) {
        this.project.stageManager.TagOptions.removeTag(selectedEntities.uuid);
      } else {
        this.project.stageManager.TagOptions.addTag(selectedEntities.uuid);
      }
    }
  }

  /**
   * 用于ui渲染
   * @returns 所有标签对应的名字
   */
  refreshTagNamesUI() {
    const res: { tagName: string; uuid: string; color: [number, number, number, number] }[] = [];
    const tagUUIDs = this.project.stageManager.TagOptions.getTagUUIDs();
    const tagObjectList: StageObject[] = [];
    for (const tagUUID of tagUUIDs) {
      const stageObject = this.project.stageManager.get(tagUUID);
      if (stageObject) {
        tagObjectList.push(stageObject);
      }
    }
    // 排序，从上到下，从左到右
    // tagObjectList.sort((a, b) => {
    //   const topDiff = a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top;
    //   if (topDiff === 0) {
    //     return a.collisionBox.getRectangle().left - b.collisionBox.getRectangle().left;
    //   }
    //   return topDiff;
    // });

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
        title = tagObject.details.slice(0, 20).trim();
        if (title.length === 0) {
          title = "Connect Point: " + tagObject.uuid.slice(0, 4);
        }
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
