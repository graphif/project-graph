import { Project } from "@/core/Project";
import { TextNode } from "@/core/sprites/TextNode";
import { Entity } from "@/core/sprites/abstract/Entity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { PathString } from "@/utils/pathString";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";
import { MouseLocation } from "../../controlService/MouseLocation";
import { isMermaidGraphString, isSvgString } from "./stringValidTools";

/**
 * 专门处理文本粘贴的服务
 */
export class CopyEngineText {
  constructor(private project: Project) {}

  async copyEnginePastePlainText(item: string) {
    let entity: Entity | null = null;
    const collisionBox = new CollisionBox([
      new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), Vector.getZero()),
    ]);

    if (isSvgString(item)) {
      // 是SVG类型
      const attachmentId = this.project.addAttachment(new Blob([item], { type: "image/svg+xml" }));
      entity = new SvgNode(this.project, {
        attachmentId,
        collisionBox,
      });
    } else if (PathString.isValidURL(item)) {
      // 是URL类型
      entity = new UrlNode(this.project, {
        title: "链接",
        url: item,
        collisionBox: new CollisionBox([
          new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), new Vector(300, 150)),
        ]),
      });
      entity.move(
        new Vector(-entity.collisionBox.getRectangle().width / 2, -entity.collisionBox.getRectangle().height / 2),
      );
    } else if (isMermaidGraphString(item)) {
      // 是Mermaid图表类型
      entity = new TextNode(this.project, {
        text: "mermaid图表，目前暂不支持",
        // details: "```mermaid\n" + item + "\n```",
        collisionBox,
      });
    } else {
      const { valid, text, url } = PathString.isMarkdownUrl(item);
      if (valid) {
        // 是Markdown链接类型
        // [text](https://www.example.text.com)
        entity = new UrlNode(this.project, {
          title: text,
          uuid: crypto.randomUUID(),
          url: url,
          collisionBox: new CollisionBox([
            new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), new Vector(300, 150)),
          ]),
        });
        entity.move(
          new Vector(-entity.collisionBox.getRectangle().width / 2, -entity.collisionBox.getRectangle().height / 2),
        );
      } else {
        if (item === "") {
          toast.warning("粘贴板中没有内容，若想快速复制多个文本节点，请交替按ctrl c、ctrl v");
          return;
        }
        // 只是普通的文本
        if (item.length > 3000) {
          entity = new TextNode(this.project, {
            text: "粘贴板文字过长（超过3000字符），已写入节点详细信息，但详细信息目前还在重构中",
            collisionBox,
            // [ { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
            // details: item.split("\n").map((line) => ({ type: "p", children: [{ text: line }] })),
            // TODO: 将超长文本写入详细信息
          });
        } else {
          entity = new TextNode(this.project, {
            text: item,
            collisionBox,
          });
          entity.move(
            new Vector(-entity.collisionBox.getRectangle().width / 2, -entity.collisionBox.getRectangle().height / 2),
          );
        }
      }
    }

    if (entity !== null) {
      this.project.stageManager.add(entity);
      // 添加到section

      const mouseSections = this.project.sectionMethods.getSectionsByInnerLocation(
        this.project.renderer.transformView2World(MouseLocation.vector()),
      );

      if (mouseSections.length > 0) {
        this.project.stageManager.goInSection([entity], mouseSections[0]);
        this.project.effects.addEffect(
          RectanglePushInEffect.sectionGoInGoOut(
            entity.collisionBox.getRectangle(),
            mouseSections[0].collisionBox.getRectangle(),
          ),
        );
      }
    }
  }
}
