import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Entity } from "@/core/sprites/abstract/Entity";
import { isSvgString } from "@/utils/svg";
import { passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Color, ColorSource, DestroyOptions, Point, PointData } from "pixi.js";
import { Value } from "platejs";
import { Fulcrum } from "./Fulcrum";
import { ImageNode } from "./ImageNode";
import { LatexNode } from "./LatexNode";
import { SvgNode } from "./SvgNode";
import { TextInput } from "./TextInput";
import { UrlNode } from "./UrlNode";

@passExtraAtArg1
@passObject
export class TextNode extends Entity {
  @serializable
  text: string;
  @serializable
  color: Color = new Color("transparent");
  @serializable
  sizeAdjust: "auto" | "manual" = "auto";

  textInput: TextInput;
  private onTextChange: ((value: string) => void) | null = null;
  private onFinishEdit: (() => void) | null = null;

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      details = [],
      color = new Color("transparent"),
      sizeAdjust = "auto",
      position = new Point(0, 0),
    }: {
      uuid?: string;
      text?: string;
      details?: Value;
      color?: ColorSource;
      sizeAdjust?: "auto" | "manual";
      position?: PointData;
    },
  ) {
    super(project);
    this.uuid = uuid;
    this.text = text;
    this.details = details;
    this.color = new Color(color);
    this.sizeAdjust = sizeAdjust;
    this.position.copyFrom(position);
    this.layout = {
      borderRadius: 8,
      padding: 8,
      borderWidth: 2,
      borderColor: 0xffffff,
    };

    this.onTextChange = (value) => {
      this.text = value;
    };

    this.onFinishEdit = () => {
      if (this.text.startsWith("$$") && this.text.endsWith("$$")) {
        // 转换为LatexNode
        this.project.stage.push(
          new LatexNode(this.project, {
            latex: this.text.slice(2, -2).trim(),
            position: this.position,
            color: this.color,
          }),
        );
        this.destroy();
      }
      if (isSvgString(this.text)) {
        // 转换为SvgNode
        this.project.stage.push(
          new SvgNode(this.project, {
            svg: this.text,
            position: this.position,
            color: this.color,
          }),
        );
        this.destroy();
      }
      if (this.text === "`") {
        // 转换为Fulcrum
        this.project.stage.push(
          new Fulcrum(this.project, {
            position: this.position,
          }),
        );
        this.destroy();
      }
      // TODO: 可以换成正则匹配
      if (this.text.startsWith("https://")) {
        // 转换为UrlNode
        this.project.stage.push(
          new UrlNode(this.project, {
            url: this.text,
            position: this.position,
          }),
        );
        this.destroy();
      }
      if (this.text.startsWith("%")) {
        // 转换为ImageNode，%后面是attachmentId
        const attachmentId = this.text.slice(1).trim();
        this.project.stage.push(
          new ImageNode(this.project, {
            attachmentId,
            position: this.position,
          }),
        );
        this.destroy();
      }
      if (this.text.startsWith("x")) {
        // 原点100范围内随机位置创建x后面数字个节点、
        const count = parseInt(this.text.slice(1).trim()) || 1;
        for (let i = 0; i < count; i++) {
          const offsetX = Math.random() * 200 - 100;
          const offsetY = Math.random() * 200 - 100;
          this.project.stage.push(
            new TextNode(this.project, {
              text: "New Node",
              position: {
                x: this.position.x + offsetX,
                y: this.position.y + offsetY,
              },
            }),
          );
        }
        this.destroy();
      }
    };

    this.textInput = new TextInput(
      this.project.viewport,
      {
        text: this.text,
        style: {
          fill: "white",
          fontFamily: "system-ui",
        },
        interactive: true,
        resolution: Settings.textResolution,
        layout: true,
      },
      // padding8+border2
      10,
    )
      .on("textchange", this.onTextChange)
      .on("finishedit", this.onFinishEdit);
    this.addChild(this.textInput);
  }

  override destroy(options?: DestroyOptions): void {
    // 移除 TextInput 事件监听器
    if (this.onTextChange) {
      this.textInput.off("textchange", this.onTextChange);
    }
    if (this.onFinishEdit) {
      this.textInput.off("finishedit", this.onFinishEdit);
    }

    this.onTextChange = null;
    this.onFinishEdit = null;

    // 清理 TextInput
    if (this.textInput) {
      this.textInput.destroy();
    }

    super.destroy(options);
  }
}
