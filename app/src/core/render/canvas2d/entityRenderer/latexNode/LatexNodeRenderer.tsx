import { Project, service } from "@/core/Project";
import { LatexNode } from "@/core/stage/stageObject/entity/LatexNode";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 渲染 LaTeX 公式节点
 */
@service("latexNodeRenderer")
export class LatexNodeRenderer {
  constructor(private readonly project: Project) {}

  render(node: LatexNode) {
    const worldRect = node.collisionBox.getRectangle();
    const viewLocation = this.project.renderer.transformWorld2View(worldRect.location);
    const scale = this.project.camera.currentScale;

    if (node.state === "loading") {
      // 加载中：渲染灰色占位框 + 文字
      const placeholderSize = new Vector(200 * scale, 60 * scale);
      this.project.shapeRenderer.renderRect(
        new Rectangle(viewLocation, placeholderSize),
        new Color(128, 128, 128, 0.1),
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
        1 * scale,
        4 * scale,
      );
      this.project.textRenderer.renderTextFromCenter(
        "渲染中...",
        viewLocation.add(placeholderSize.multiply(0.5)),
        14 * scale,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
    } else if (node.state === "error") {
      // 错误：渲染红色占位框 + 错误提示
      const errorSize =
        worldRect.size.x > 0 && worldRect.size.y > 0
          ? worldRect.size.multiply(scale)
          : new Vector(200 * scale, 60 * scale);
      this.project.shapeRenderer.renderRect(
        new Rectangle(viewLocation, errorSize),
        new Color(255, 0, 0, 0.1),
        new Color(255, 80, 80, 0.8),
        1 * scale,
        4 * scale,
      );
      this.project.textRenderer.renderTextFromCenter(
        "LaTeX 渲染错误",
        viewLocation.add(errorSize.multiply(0.5)),
        14 * scale,
        new Color(255, 80, 80),
      );
    } else if (node.state === "success") {
      // 成功：渲染公式图片
      // renderImageElement 的 scale 参数：最终宽度 = image.width * scale * camera.currentScale
      // 所以传入 node.getScale()，即 2^(fontScaleLevel/2)
      this.project.imageRenderer.renderImageElement(node.image, viewLocation, node.getScale());
    }

    // 渲染选中框（在图片上方）
    if (node.isSelected) {
      this.project.collisionBoxRenderer.render(
        node.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }
  }
}
