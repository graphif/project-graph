import { Dialog } from "@/components/ui/dialog";
import { serializable } from "@graphif/serializer";
import { LayoutContainer } from "@pixi/layout/components";
import { Assets, Color, type ColorSource, ObservablePoint, Point, Sprite } from "pixi.js";
import { Value } from "platejs";
import { Project } from "../Project";
import { Entity } from "./abstract/Entity";
import { StageObject } from "./abstract/StageObject";

export class SvgNode extends Entity {
  static RESIZE_HANDLE_SIZE = 16;

  private _svg: string = "";
  @serializable
  get svg() {
    return this._svg;
  }
  set svg(value: string) {
    this._svg = value;
    this.refresh();
  }

  @serializable
  get scale(): ObservablePoint {
    return super.scale;
  }
  set scale(value: ObservablePoint) {
    super.scale = value;
  }

  private _color: Color = new Color(0xffffff);
  @serializable
  get color(): Color {
    return this._color;
  }
  set color(source: ColorSource) {
    this._color = new Color(source);
    this.refresh();
  }

  private showResizeHandle = false;

  constructor(
    protected readonly project: Project,
    {
      svg = "",
      uuid = crypto.randomUUID() as string,
      details = [],
      position = new Point(0, 0),
      color = 0xffffff,
    }: {
      svg?: string;
      uuid?: string;
      details?: Value;
      position?: Point;
      color?: ColorSource;
    },
  ) {
    super();
    this.uuid = uuid;
    this.svg = svg;
    this.details = details;
    this.position.copyFrom(position);
    this.color = color;

    let lastClickTime = 0;
    this.on("click", (e) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastClickTime < 300) {
        // 双击
        lastClickTime = 0;
        this.edit();
      } else {
        lastClickTime = now;
        return;
      }
    });
  }

  refresh(showResizeHandle = false) {
    for (const child of this.children) {
      if (child.label !== StageObject.SELECTION_OUTLINE_LABEL) {
        child.removeFromParent();
      }
    }
    Assets.load({
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(this._svg.replaceAll("currentColor", this._color.toHexa()))}`,
      data: {
        resolution: 5,
        resourceOptions: {
          scale: 5,
        },
      },
    }).then((texture) => {
      this.addChild(new Sprite(texture));

      if (!showResizeHandle) return;
      let resizing = false;
      this.addChild(
        new LayoutContainer({
          layout: {
            width: SvgNode.RESIZE_HANDLE_SIZE,
            height: SvgNode.RESIZE_HANDLE_SIZE,
            position: "absolute",
            left: texture.width - SvgNode.RESIZE_HANDLE_SIZE,
            top: texture.height - SvgNode.RESIZE_HANDLE_SIZE,
            // backgroundColor: 0xaaaaff,
            // borderRadius: SvgNode.RESIZE_HANDLE_SIZE,
          },
          cursor: "se-resize",
          interactive: true,
        })
          .on("pointerdown", (e) => {
            e.stopPropagation();
            resizing = true;
          })
          .on("pointerup", () => {
            resizing = false;
          })
          .on("pointerupoutside", () => {
            resizing = false;
          })
          .on("globalpointermove", (e) => {
            if (resizing) {
              const offset = this.project.viewport.toWorld(e.client).subtract(this.position);
              offset.x = Math.max(offset.x, SvgNode.RESIZE_HANDLE_SIZE + 8);
              offset.y = Math.max(offset.y, SvgNode.RESIZE_HANDLE_SIZE + 8);
              if (e.shiftKey) {
                const ratio = texture.width / texture.height;
                if (offset.x / offset.y > ratio) {
                  offset.y = offset.x / ratio;
                } else {
                  offset.x = offset.y * ratio;
                }
              }
              this.scale.set(offset.x / texture.width, offset.y / texture.height);
            }
          }),
      );
    });
  }

  edit() {
    Dialog.input("编辑 SVG 节点", "", { defaultValue: this.svg, multiline: true }).then((result) => {
      if (result) {
        this.svg = result;
      }
    });
  }

  set selected(value: boolean) {
    super.selected = value;
    this.refresh(value);
  }
}
