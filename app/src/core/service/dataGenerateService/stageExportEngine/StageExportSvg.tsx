import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { SvgUtils } from "@/core/render/svg/SvgUtils";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Path } from "@/utils/path";
import { Color, colorInvert, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { writeFile } from "@tauri-apps/plugin-fs";
import mime from "mime";

export interface SvgExportConfig {
  imageMode: "absolutePath" | "relativePath" | "base64";
}

/**
 * 将舞台当前内容导出为SVG
 *
 *
 */
@service("stageExportSvg")
export class StageExportSvg {
  constructor(private readonly project: Project) {}

  private svgConfig: SvgExportConfig = {
    imageMode: "relativePath",
  };

  private exportContext: {
    outputDir: string;
    imageMap: Map<string, string>; // attachmentId -> relative file path
  } | null = null;

  setConfig(config: SvgExportConfig) {
    this.svgConfig = config;
  }

  dumpNode(node: TextNode) {
    if (node.isHiddenBySectionCollapse) {
      return <></>;
    }
    return (
      <>
        {SvgUtils.rectangle(
          node.rectangle,
          node.color,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2,
        )}

        {SvgUtils.multiLineTextFromLeftTop(
          node.text,
          node.rectangle.leftTop.add(
            // 2025年1月23日 晚上，对这个地方进行了微调，但还没弄懂原理，只是看上去像是加了点偏移
            // 着急发布节点多行文本的功能，所以先这样吧
            new Vector(0, Renderer.NODE_PADDING + Renderer.FONT_SIZE / 4),
          ),
          Renderer.FONT_SIZE,
          node.color.a === 1
            ? colorInvert(node.color)
            : colorInvert(this.project.stageStyleManager.currentStyle.Background),
        )}
      </>
    );
  }

  /**
   * 渲染Section顶部颜色
   * @param section
   * @returns
   */
  dumpSection(section: Section) {
    if (section.isHiddenBySectionCollapse) {
      return <></>;
    }
    return (
      <>
        {SvgUtils.rectangle(
          section.rectangle,
          Color.Transparent,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2,
        )}
        {SvgUtils.textFromLeftTop(
          section.text,
          section.rectangle.leftTop,
          Renderer.FONT_SIZE,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
        )}
      </>
    );
  }

  /**
   * 只渲染Section的底部颜色
   * @param section
   * @returns
   */
  dumpSectionBase(section: Section) {
    if (section.isHiddenBySectionCollapse) {
      return <></>;
    }
    return <>{SvgUtils.rectangle(section.rectangle, section.color, Color.Transparent, 0)}</>;
  }

  dumpEdge(edge: LineEdge): React.ReactNode {
    return this.project.edgeRenderer.getEdgeSvg(edge);
  }
  /**
   *
   * @param node
   * @param svgConfigObject 配置对象
   * @returns
   */
  dumpImageNode(node: ImageNode, svgConfigObject: SvgExportConfig) {
    if (node.isHiddenBySectionCollapse) {
      return <></>;
    }
    let href = "";
    const attachmentId = node.attachmentId;
    if (attachmentId) {
      // 检查是否有导出上下文
      if (this.exportContext && this.exportContext.imageMap.has(attachmentId)) {
        // 使用导出的图片相对路径
        href = this.exportContext.imageMap.get(attachmentId)!;
      } else {
        const blob = this.project.attachments.get(attachmentId);
        if (blob) {
          if (svgConfigObject.imageMode === "base64") {
            // 转换为base64数据URI
            // 暂时返回空，后续实现
            href = "";
          } else {
            // 相对路径或绝对路径模式，但没有导出上下文，无法生成有效路径
            // 返回透明矩形占位符
            return (
              <>
                {SvgUtils.rectangle(
                  node.rectangle,
                  Color.Transparent,
                  this.project.stageStyleManager.currentStyle.StageObjectBorder,
                  2,
                )}
              </>
            );
          }
        }
      }
    }
    // 如果href为空，则返回一个透明矩形占位符
    if (!href) {
      return (
        <>
          {SvgUtils.rectangle(
            node.rectangle,
            Color.Transparent,
            this.project.stageStyleManager.currentStyle.StageObjectBorder,
            2,
          )}
        </>
      );
    }

    return (
      <>
        {SvgUtils.rectangle(
          node.rectangle,
          Color.Transparent,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2,
        )}
        <image
          href={href}
          x={node.rectangle.leftTop.x}
          y={node.rectangle.leftTop.y}
          width={node.rectangle.size.x}
          height={node.rectangle.size.y}
        />
      </>
    );
  }

  private getEntitiesOuterRectangle(entities: Entity[], padding: number): Rectangle {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const entity of entities) {
      if (entity.collisionBox.getRectangle().location.x < minX) {
        minX = entity.collisionBox.getRectangle().location.x - padding;
      }
      if (entity.collisionBox.getRectangle().location.y < minY) {
        minY = entity.collisionBox.getRectangle().location.y - padding;
      }
      if (entity.collisionBox.getRectangle().location.x + entity.collisionBox.getRectangle().size.x > maxX) {
        maxX = entity.collisionBox.getRectangle().location.x + entity.collisionBox.getRectangle().size.x + padding;
      }
      if (entity.collisionBox.getRectangle().location.y + entity.collisionBox.getRectangle().size.y > maxY) {
        maxY = entity.collisionBox.getRectangle().location.y + entity.collisionBox.getRectangle().size.y + padding;
      }
    }
    return new Rectangle(new Vector(minX, minY), new Vector(maxX - minX, maxY - minY));
  }

  private dumpSelected(): React.ReactNode {
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    if (selectedEntities.length === 0) {
      return "";
    }
    const padding = 30; // 留白
    const viewRectangle = this.getEntitiesOuterRectangle(selectedEntities, padding);
    // 计算画布的大小
    const width = viewRectangle.size.x;
    const height = viewRectangle.size.y;
    // 计算画布的 viewBox
    const viewBox = `${viewRectangle.location.x} ${viewRectangle.location.y} ${width} ${height}`;
    // fix:bug section选中了，但是内部的东西没有追加进入
    const newEntities = this.project.sectionMethods.getAllEntitiesInSelectedSectionsOrEntities(selectedEntities);
    // 合并两个数组并更新
    for (const entity of newEntities) {
      if (selectedEntities.indexOf(entity) === -1) {
        selectedEntities.push(entity);
      }
    }
    // 所有实际包含的uuid集合
    const selectedEntitiesUUIDSet = new Set<string>();
    for (const entity of selectedEntities) {
      selectedEntitiesUUIDSet.add(entity.uuid);
    }

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox={viewBox}
        style={{
          backgroundColor: this.project.stageStyleManager.currentStyle.Background.toString(),
        }}
      >
        {/* 选中的部分 */}
        {this.project.sectionMethods
          .getSortedSectionsByZ(selectedEntities.filter((entity) => entity instanceof Section))
          .map((entity) => {
            if (entity instanceof Section) {
              return this.dumpSectionBase(entity);
            }
          })}
        {selectedEntities.map((entity) => {
          if (entity instanceof TextNode) {
            return this.dumpNode(entity);
          } else if (entity instanceof LineEdge) {
            return this.dumpEdge(entity);
          } else if (entity instanceof Section) {
            return this.dumpSection(entity);
          } else if (entity instanceof ImageNode) {
            return this.dumpImageNode(entity, this.svgConfig);
          }
        })}

        {/* 构建连线 */}
        {this.project.stageManager
          .getLineEdges()
          .filter(
            (edge) => selectedEntitiesUUIDSet.has(edge.source.uuid) && selectedEntitiesUUIDSet.has(edge.target.uuid),
          )
          .map((edge) => this.dumpEdge(edge))}
      </svg>
    );
  }

  private dumpStage(): React.ReactNode {
    // 如果没有任何节点，则抛出一个异常
    if (this.project.stageManager.isNoEntity()) {
      throw new Error("No nodes in stage.");
    }
    const padding = 30; // 留白
    const viewRectangle = this.getEntitiesOuterRectangle(this.project.stageManager.getEntities(), padding);
    // 计算画布的大小
    const width = viewRectangle.size.x;
    const height = viewRectangle.size.y;
    // 计算画布的 viewBox
    const viewBox = `${viewRectangle.location.x} ${viewRectangle.location.y} ${width} ${height}`;

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox={viewBox}
        style={{
          backgroundColor: this.project.stageStyleManager.currentStyle.Background.toString(),
        }}
      >
        {this.project.sectionMethods
          .getSortedSectionsByZ(this.project.stageManager.getSections())
          .map((section) => this.dumpSectionBase(section))}
        {this.project.stageManager.getTextNodes().map((node) => this.dumpNode(node))}
        {this.project.stageManager.getLineEdges().map((edge) => this.dumpEdge(edge))}
        {this.project.stageManager.getSections().map((section) => this.dumpSection(section))}
        {this.project.stageManager.getImageNodes().map((imageNode) => this.dumpImageNode(imageNode, this.svgConfig))}
      </svg>
    );
  }

  /**
   * 将整个舞台导出为SVG字符串
   * @returns
   */
  dumpStageToSVGString(): string {
    return ReactDOMServer.renderToStaticMarkup(this.dumpStage());
  }

  /**
   * 将选中的节点导出为SVG字符串
   * @returns
   */
  dumpSelectedToSVGString(): string {
    return ReactDOMServer.renderToStaticMarkup(this.dumpSelected());
  }

  /**
   * 将整个舞台导出为SVG文件，并导出所有图片附件
   * @param filePath SVG文件保存路径
   */
  async exportStageToSVGFile(filePath: string): Promise<void> {
    const outputDir = new Path(filePath).parent.toString();
    const imageNodes = this.project.stageManager.getImageNodes();
    const imageMap = new Map<string, string>();

    // 导出所有图片附件
    for (const imageNode of imageNodes) {
      const attachmentId = imageNode.attachmentId;
      if (!attachmentId || imageMap.has(attachmentId)) continue;

      const blob = this.project.attachments.get(attachmentId);
      if (!blob) continue;

      // 生成文件名
      const extension = mime.getExtension(blob.type) || "bin";
      const fileName = `${attachmentId}.${extension}`;
      const relativePath = fileName;
      const outputPath = new Path(outputDir).join(fileName).toString();

      // 写入文件
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(outputPath, new Uint8Array(arrayBuffer));

      imageMap.set(attachmentId, relativePath);
    }

    // 设置导出上下文
    this.exportContext = {
      outputDir,
      imageMap,
    };

    try {
      // 生成SVG字符串并保存
      const svgString = this.dumpStageToSVGString();
      await writeFile(filePath, new TextEncoder().encode(svgString));
    } finally {
      // 清除导出上下文
      this.exportContext = null;
    }
  }

  /**
   * 将选中的节点导出为SVG文件，并导出相关图片附件
   * @param filePath SVG文件保存路径
   */
  async exportSelectedToSVGFile(filePath: string): Promise<void> {
    const outputDir = new Path(filePath).parent.toString();
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    const imageNodes = selectedEntities.filter((entity): entity is ImageNode => entity instanceof ImageNode);
    const imageMap = new Map<string, string>();

    // 导出所有图片附件
    for (const imageNode of imageNodes) {
      const attachmentId = imageNode.attachmentId;
      if (!attachmentId || imageMap.has(attachmentId)) continue;

      const blob = this.project.attachments.get(attachmentId);
      if (!blob) continue;

      // 生成文件名
      const extension = mime.getExtension(blob.type) || "bin";
      const fileName = `${attachmentId}.${extension}`;
      const relativePath = fileName;
      const outputPath = new Path(outputDir).join(fileName).toString();

      // 写入文件
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(outputPath, new Uint8Array(arrayBuffer));

      imageMap.set(attachmentId, relativePath);
    }

    // 设置导出上下文
    this.exportContext = {
      outputDir,
      imageMap,
    };

    try {
      // 生成SVG字符串并保存
      const svgString = this.dumpSelectedToSVGString();
      await writeFile(filePath, new TextEncoder().encode(svgString));
    } finally {
      // 清除导出上下文
      this.exportContext = null;
    }
  }
}
