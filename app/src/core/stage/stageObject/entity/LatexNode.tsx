import { Project } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Color, Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import katex from "katex";
// 以 raw CSS 字符串形式 import katex 样式，用于嵌入 SVG foreignObject
import katexCssRaw from "katex/dist/katex.min.css?inline";

/**
 * LaTeX 公式节点
 *
 * 将 LaTeX 字符串渲染为公式图片显示在舞台上。
 * 持久化只存储 LaTeX 字符串，SVG 渲染结果在运行时动态生成。
 * 缩放方式与文本节点一致，使用 fontScaleLevel 指数缩放。
 */
@passExtraAtArg1
@passObject
export class LatexNode extends ConnectableEntity {
  @id
  @serializable
  uuid: string;

  /**
   * LaTeX 源代码字符串（不含 $ 符号），如 "E=mc^2"
   */
  @serializable
  latexSource: string;

  @serializable
  public collisionBox: CollisionBox;

  @serializable
  color: Color = Color.Transparent;

  /**
   * 字体缩放级别，与 TextNode 一致
   * 公式大小缩放公式：scale = 2^(fontScaleLevel / 2)
   */
  @serializable
  public fontScaleLevel: number = 0;

  isHiddenBySectionCollapse: boolean = false;

  // ── 运行时状态（不序列化）──────────────────────────────────
  /** 渲染结果图片 */
  image: HTMLImageElement = new Image();
  /** 渲染后 SVG 的原始像素尺寸 */
  svgOriginalSize: Vector = Vector.getZero();
  /** 渲染状态 */
  state: "loading" | "success" | "error" = "loading";
  /**
   * 当前图片实际渲染时使用的颜色（CSS color 字符串，如 rgba(...) / #rrggbb）。
   * LatexNodeRenderer 在每帧对比"应显示颜色"与此值，不一致时触发重新渲染。
   */
  currentRenderedColorCss: string = "";

  /** 节点是否被选中 */
  _isSelected: boolean = false;

  get isSelected() {
    return this._isSelected;
  }

  set isSelected(value: boolean) {
    this._isSelected = value;
  }

  get rectangle(): Rectangle {
    return this.collisionBox.shapes[0] as Rectangle;
  }

  public get geometryCenter(): Vector {
    return this.collisionBox.getRectangle().center;
  }

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID(),
      details = [],
      latexSource = "",
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]),
      color = Color.Transparent.clone(),
      fontScaleLevel = 0,
    }: {
      uuid?: string;
      details?: any;
      latexSource?: string;
      collisionBox?: CollisionBox;
      color?: Color;
      fontScaleLevel?: number;
    },
  ) {
    super();
    this.uuid = uuid;
    this.latexSource = latexSource;
    this.details = details;
    this.collisionBox = collisionBox;
    this.color = color;
    this.fontScaleLevel = fontScaleLevel;

    // 异步渲染 LaTeX 公式，初始颜色：透明色→主题边框色，否则→用户自定义色
    const initColor = color.a === 0 ? this.project.stageStyleManager.currentStyle.StageObjectBorder : color;
    this.renderLatexToImage(latexSource, initColor.toString());
  }

  /**
   * 获取当前缩放倍数
   * 公式：2^(fontScaleLevel / 2)
   */
  public getScale(): number {
    return Math.pow(2, this.fontScaleLevel / 2);
  }

  /**
   * 放大字体（增加 fontScaleLevel）
   */
  public increaseFontSize(anchorRate?: Vector): void {
    this.fontScaleLevel++;
    this.updateCollisionBoxByScale(anchorRate);
  }

  /**
   * 缩小字体（减少 fontScaleLevel）
   */
  public decreaseFontSize(anchorRate?: Vector): void {
    this.fontScaleLevel--;
    this.updateCollisionBoxByScale(anchorRate);
  }

  /**
   * 根据当前 fontScaleLevel 更新碰撞箱大小
   */
  private updateCollisionBoxByScale(anchorRate?: Vector): void {
    if (this.svgOriginalSize.x === 0 || this.svgOriginalSize.y === 0) return;
    const scale = this.getScale();
    const oldRect = this.rectangle.clone();
    const newSize = this.svgOriginalSize.multiply(scale);
    this.collisionBox.shapes[0] = new Rectangle(this.rectangle.location.clone(), newSize);
    if (anchorRate) {
      this._adjustLocationToKeepAnchor(oldRect, anchorRate);
    }
  }

  private _adjustLocationToKeepAnchor(oldRect: Rectangle, anchorRate: Vector): void {
    const newSize = this.rectangle.size;
    const locationDelta = new Vector(
      (oldRect.size.x - newSize.x) * anchorRate.x,
      (oldRect.size.y - newSize.y) * anchorRate.y,
    );
    this.moveTo(oldRect.location.clone().add(locationDelta));
  }

  /**
   * 更新 LaTeX 源码并重新渲染
   * @param newLatex 新的 LaTeX 字符串
   * @param colorCss 渲染颜色（CSS color 字符串，如 "rgba(255,0,0,0.5)" / "#ffffff"），不传则沿用当前已记录的颜色
   */
  public async updateLatex(newLatex: string, colorCss?: string): Promise<void> {
    this.latexSource = newLatex;
    await this.renderLatexToImage(newLatex, colorCss ?? (this.currentRenderedColorCss || "#000000"));
  }

  /**
   * 以指定颜色重新渲染当前 LaTeX（颜色变化时由 LatexNodeRenderer 调用）
   */
  public async reRenderWithColor(colorCss: string): Promise<void> {
    await this.renderLatexToImage(this.latexSource, colorCss);
  }

  /**
   * 将 LaTeX 字符串渲染为 HTMLImageElement
   * 流程：katex.renderToString → SVG foreignObject → Blob URL → Image
   * @param latex LaTeX 源码
   * @param colorCss 公式颜色（CSS color 字符串，如 "rgba(255,0,0,0.5)" / "#ffffff"）
   */
  private async renderLatexToImage(latex: string, colorCss: string = "#000000"): Promise<void> {
    if (!latex.trim()) {
      this.state = "error";
      return;
    }
    this.state = "loading";

    try {
      // 1. 使用 katex 渲染为 HTML 字符串
      const htmlContent = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
        errorColor: "#cc0000",
        output: "htmlAndMathml",
      });

      // 2. 获取 katex CSS（直接使用静态 import 的 CSS 字符串）
      const katexCss = katexCssRaw;

      // 3. 先将 HTML 注入隐藏 div，测量实际渲染尺寸
      const measureDiv = document.createElement("div");
      measureDiv.style.cssText = "position:fixed;left:-9999px;top:-9999px;visibility:hidden;font-size:32px;";
      measureDiv.innerHTML = `<style>${katexCss}</style>${htmlContent}`;
      document.body.appendChild(measureDiv);

      // 等待浏览器布局
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const measuredWidth = measureDiv.offsetWidth || 200;
      const measuredHeight = measureDiv.offsetHeight || 60;
      document.body.removeChild(measureDiv);

      // 4. 构造 SVG，用 foreignObject 包裹 katex HTML
      //    通过 color CSS 属性让 katex 公式颜色跟随传入的 colorCss
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${measuredWidth}" height="${measuredHeight}">
  <defs>
    <style>${katexCss}</style>
  </defs>
  <foreignObject width="${measuredWidth}" height="${measuredHeight}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:${colorCss};font-size:32px;display:flex;align-items:center;justify-content:center;height:100%;box-sizing:border-box;">
      ${htmlContent}
    </div>
  </foreignObject>
</svg>`;

      // 5. 转为 Blob URL 并加载为 Image
      const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.src = url;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(url);
          this.svgOriginalSize = new Vector(measuredWidth, measuredHeight);
          this.image = img;
          // 记录本次渲染使用的颜色，供 LatexNodeRenderer 对比
          this.currentRenderedColorCss = colorCss;

          // 更新碰撞箱大小
          const scale = this.getScale();
          const newSize = this.svgOriginalSize.multiply(scale);
          this.collisionBox.shapes[0] = new Rectangle(this.rectangle.location.clone(), newSize);

          this.state = "success";
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          this.state = "error";
          reject(new Error("图片加载失败"));
        };
      });
    } catch (e) {
      console.error("LaTeX 渲染失败:", e);
      this.state = "error";
    }
  }

  move(delta: Vector): void {
    const newRectangle = this.collisionBox.getRectangle().clone();
    newRectangle.location = newRectangle.location.add(delta);
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }

  moveTo(location: Vector): void {
    const newRectangle = this.collisionBox.getRectangle().clone();
    newRectangle.location = location.clone();
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }
}
