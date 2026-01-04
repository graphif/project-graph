import { Project } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { PathString } from "@/utils/pathString";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { MouseLocation } from "../../controlService/MouseLocation";
import { RectanglePushInEffect } from "../../feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { isMermaidGraphString, isSvgString } from "./stringValidTools";
import { toast } from "sonner";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { Settings } from "@/core/service/Settings";

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
            text: "粘贴板文字过长（超过3000字符），已写入节点详细信息",
            collisionBox,
            details: DetailsManager.markdownToDetails(item),
          });
        } else {
          let collisionBox = new CollisionBox([
            new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), Vector.getZero()),
          ]);
          const threshold = Settings.textNodeBigContentThresholdWhenPaste;
          const pasteMode = Settings.textNodePasteSizeAdjustMode;

          let sizeAdjust: "auto" | "manual";
          let isBigContent = false;

          switch (pasteMode) {
            case "manual":
              sizeAdjust = "manual";
              collisionBox = new CollisionBox([
                new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), new Vector(400, 100)),
              ]);
              break;
            case "auto":
              sizeAdjust = "auto";
              break;
            case "autoByLength":
            default:
              isBigContent = item.length > threshold;
              sizeAdjust = isBigContent ? "manual" : "auto";
              if (isBigContent) {
                collisionBox = new CollisionBox([
                  new Rectangle(
                    this.project.renderer.transformView2World(MouseLocation.vector()),
                    new Vector(400, 100),
                  ),
                ]);
              }
              break;
          }

          // Debug mode toast
          if (Settings.showDebug) {
            toast.info(
              `粘贴内容长度: ${item.length}, 阈值: ${threshold}, 粘贴模式: ${pasteMode}, 最终换行模式: ${sizeAdjust === "manual" ? "手动换行" : "自动换行"}`,
            );
          }

          entity = new TextNode(this.project, {
            text: item,
            collisionBox,
            sizeAdjust,
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
