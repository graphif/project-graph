import { Dialog } from "@/components/ui/dialog";
import { serializable } from "@graphif/serializer";
import { Assets, Point } from "pixi.js";
import { Value } from "platejs";
import { Project } from "../Project";
import { TextureNode } from "./abstract/TextureNode";

export class ImageNode extends TextureNode {
  private lastObjectUrl: string | null = null;

  private _attachmentId: string = "";
  @serializable
  get attachmentId() {
    return this._attachmentId;
  }
  set attachmentId(value: string) {
    this._attachmentId = value;
    if (!this.blob) return;
    if (this.lastObjectUrl) {
      URL.revokeObjectURL(this.lastObjectUrl);
    }
    this.lastObjectUrl = URL.createObjectURL(this.blob);
    Assets.load({
      src: this.lastObjectUrl,
      parser: "texture",
    }).then((texture) => {
      console.log(this.lastObjectUrl, texture);
      this.texture = texture;
    });
  }

  get blob() {
    return this.project.attachments.get(this.attachmentId);
  }

  constructor(
    protected readonly project: Project,
    {
      attachmentId = "",
      uuid = crypto.randomUUID() as string,
      details = [],
      position = new Point(0, 0),
    }: {
      attachmentId?: string;
      uuid?: string;
      details?: Value;
      position?: Point;
    },
  ) {
    super(project);
    this.uuid = uuid;
    this.attachmentId = attachmentId;
    this.details = details;
    this.position.copyFrom(position);
  }

  edit() {
    Dialog.input("绑定附件", "", { defaultValue: this.attachmentId }).then((result) => {
      if (result) {
        this.attachmentId = result;
      }
    });
  }
}
