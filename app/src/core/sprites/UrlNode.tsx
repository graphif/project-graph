import { Project } from "@/core/Project";
import { Entity } from "@/core/sprites/abstract/Entity";
import { passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Assets, Color, ColorSource, Point, PointData, Sprite } from "pixi.js";
import { Value } from "platejs";
import { MyText } from "./MyText";

@passExtraAtArg1
@passObject
export class UrlNode extends Entity {
  private _url = "";
  @serializable
  get url() {
    return this._url;
  }
  set url(v: string) {
    this._url = v;
    this.refresh();
  }

  @serializable
  color: Color = new Color("transparent");

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      url = "",
      details = [],
      color = new Color("transparent"),
      position = new Point(0, 0),
    }: {
      uuid?: string;
      url?: string;
      details?: Value;
      color?: ColorSource;
      position?: PointData;
    },
  ) {
    super(project);
    this.uuid = uuid;
    this.url = url;
    this.details = details;
    this.color = new Color(color);
    this.position.copyFrom(position);
  }

  async refresh() {
    this.removeChildren();
    this.layout = {
      borderRadius: 16,
      padding: 16,
      gap: 8,
      borderWidth: 2,
      borderColor: 0xffffff,
      flexDirection: "column",
    };
    this.addChild(new MyText("Loading..."), new MyText(this.url));
    const meta = await (await fetch(`https://url-meta.graphif.dev/v1/meta?url=${encodeURIComponent(this.url)}`)).json();
    this.removeChildren();
    this.addChild(
      new MyText(meta.openGraph.title ?? meta.meta.title),
      new MyText(meta.openGraph.description ?? meta.meta.description, { style: { fontSize: 16 } }),
      new MyText(meta.openGraph.site_name ?? this.url.split("/")[2], { style: { fontSize: 14, fill: "#fff8" } }),
    );
    if (meta.openGraph.image) {
      const loadingText = this.addChildAt(new MyText("正在加载图片...", { style: { fill: "#fff8" } }), 0);
      const texture = await Assets.load({
        src: `https://url-meta.graphif.dev/v1/proxy?url=${encodeURIComponent(meta.openGraph.image)}`,
        parser: "texture",
      });
      const img = new Sprite({
        texture,
        layout: {
          width: this.width - 32,
          height: (this.width - 32) * (texture.height / texture.width),
          borderRadius: 16,
        },
      });
      loadingText.removeFromParent();
      this.addChildAt(img, 0);
    }
  }
}
