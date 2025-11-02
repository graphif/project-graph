import { serializable } from "@graphif/serializer";
import { LayoutContainer } from "@pixi/layout/components";
import { ObservablePoint, Sprite, Texture } from "pixi.js";
import { Project } from "../../Project";
import { Entity } from "./Entity";
import { StageObject } from "./StageObject";

export abstract class TextureNode extends Entity {
  static RESIZE_HANDLE_SIZE = 16;

  private _texture: Texture = Texture.EMPTY;
  get texture() {
    return this._texture;
  }
  set texture(value: Texture) {
    this._texture = value;
    this.refresh();
  }

  @serializable
  get scale(): ObservablePoint {
    return super.scale;
  }
  set scale(value: ObservablePoint) {
    super.scale = value;
  }

  constructor(protected readonly project: Project) {
    super(project);
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
    this.addChild(new Sprite(this.texture));

    if (!showResizeHandle) return;
    let resizing = false;
    this.addChild(
      new LayoutContainer({
        layout: {
          width: TextureNode.RESIZE_HANDLE_SIZE,
          height: TextureNode.RESIZE_HANDLE_SIZE,
          position: "absolute",
          left: this.texture.width - TextureNode.RESIZE_HANDLE_SIZE,
          top: this.texture.height - TextureNode.RESIZE_HANDLE_SIZE,
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
            offset.x = Math.max(offset.x, TextureNode.RESIZE_HANDLE_SIZE + 8);
            offset.y = Math.max(offset.y, TextureNode.RESIZE_HANDLE_SIZE + 8);
            if (!e.shiftKey) {
              const ratio = this.texture.width / this.texture.height;
              if (offset.x / offset.y > ratio) {
                offset.y = offset.x / ratio;
              } else {
                offset.x = offset.y * ratio;
              }
            }
            this.scale.set(offset.x / this.texture.width, offset.y / this.texture.height);
          }
        }),
    );
  }

  /**
   * 可选实现
   * 双击时调用
   */
  abstract edit(): void;

  set selected(value: boolean) {
    super.selected = value;
    this.refresh(value);
  }
}
