import type { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import {
  AIObjectReferenceError,
  AIObjectReferenceRegistry,
} from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { blobToCompressedDataUrl, prepareImageBlobForImport } from "@/core/service/dataManageService/imageUtils";
import { calculateImageDisplaySize, createImageNodeFromBlob } from "@/core/service/dataManageService/imageNodeFactory";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import type { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { fetch } from "@tauri-apps/plugin-http";
import { encode } from "@toon-format/toon";
import { generateText, tool, type ToolSet } from "ai";
import z from "zod/v4";
import { findFirstImageInChildren } from "./imageNodeFinder";
import {
  findDownloadableOpenverseImage,
  type ImageOrientation,
  type OpenverseImageCandidate,
} from "./OpenverseImageSearch";

export namespace AITools {
  export type ToolDefinition = {
    name: string;
    description: string;
    parameters: z.ZodObject;
  };

  type InternalToolDefinition = ToolDefinition & {
    fn: (project: Project, data: any, references: AIObjectReferenceRegistry, context: ToolExecutionContext) => any;
    toModelOutput?: (output: any) => { type: "content"; value: any[] };
  };

  type ToolExecutionContext = {
    abortSignal?: AbortSignal;
  };

  const toolDefinitions: InternalToolDefinition[] = [];
  export const tools: ToolDefinition[] = toolDefinitions;

  function addTool<A extends z.ZodObject>(
    name: string,
    description: string,
    parameters: A,
    fn: (
      project: Project,
      data: z.infer<A>,
      references: AIObjectReferenceRegistry,
      context: ToolExecutionContext,
    ) => any,
    toModelOutput?: (output: any) => { type: "content"; value: any[] },
  ) {
    toolDefinitions.push({
      name,
      description,
      parameters,
      fn: fn as InternalToolDefinition["fn"],
      toModelOutput,
    });
  }

  export function createTools(project: Project, references: AIObjectReferenceRegistry): ToolSet {
    return Object.fromEntries(
      toolDefinitions.map((definition) => [
        definition.name,
        tool({
          description: definition.description,
          inputSchema: definition.parameters as any,
          execute: async (data: any, executionOptions?: ToolExecutionContext) => {
            try {
              const result = await definition.fn(project, data as any, references, {
                abortSignal: executionOptions?.abortSignal,
              });
              return result ? encode(result) : "ok";
            } catch (error) {
              if (error instanceof AIObjectReferenceError) {
                return encode({
                  success: false,
                  error: { code: error.code, ref: error.ref, message: error.message },
                });
              }
              throw error;
            }
          },
          ...(definition.toModelOutput
            ? {
                toModelOutput: ({ output }: { output: any }) => definition.toModelOutput!(output),
              }
            : {}),
        }),
      ]),
    ) as ToolSet;
  }

  const objectRefSchema = z
    .string()
    .regex(/^(?:n|e)[1-9]\d*$/)
    .describe("当前项目中的对象引用，例如n1或e1");
  const nodeRefSchema = z
    .string()
    .regex(/^n[1-9]\d*$/)
    .describe("当前项目中的节点引用，例如n1");
  const edgeRefSchema = z
    .string()
    .regex(/^e[1-9]\d*$/)
    .describe("当前项目中的连线引用，例如e1");

  function toAgentObjectInfo(object: StageObject, references: AIObjectReferenceRegistry) {
    const rect = object.collisionBox.getRectangle();
    const info: Record<string, unknown> = {
      ref: references.getOrCreateRef(object),
      type: object.constructor.name,
      position: { x: rect.location.x, y: rect.location.y },
      size: { width: rect.size.x, height: rect.size.y },
    };
    if (object instanceof TextNode) info.text = object.text;
    if (object instanceof ImageNode) {
      info.isBackground = object.isBackground;
      info.imageState = object.state;
    }
    if ("color" in object && object.color instanceof Color) info.color = object.color.toArray();
    if (object instanceof Section) {
      info.childRefs = object.children.map((child) => references.getOrCreateRef(child));
    }
    if (object instanceof Edge) {
      info.sourceRef = references.getOrCreateRef(object.source);
      info.targetRef = references.getOrCreateRef(object.target);
      info.text = object.text;
    }
    return info;
  }

  function sanitizeImageSourceText(value: string | null | undefined): string | undefined {
    const sanitized = value
      ?.replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 500)
      .replace(/([\\`*_[\]{}()#+\-.!|>])/g, "\\$1");
    return sanitized || undefined;
  }

  function sanitizeImageSourceUrl(value: string | null | undefined): string | undefined {
    if (!value || !URL.canParse(value)) return undefined;
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  }

  function createOpenverseImageDetails(candidate: OpenverseImageCandidate) {
    const lines = ["## 网络图片来源"];
    const title = sanitizeImageSourceText(candidate.title);
    const creator = sanitizeImageSourceText(candidate.creator);
    const license = sanitizeImageSourceText(candidate.license);
    const sourceUrl = sanitizeImageSourceUrl(candidate.foreign_landing_url);
    const licenseUrl = sanitizeImageSourceUrl(candidate.license_url);
    if (title) lines.push(`标题：${title}`);
    if (creator) lines.push(`作者：${creator}`);
    if (license) lines.push(`许可证：${license}`);
    if (sourceUrl) lines.push(`来源页面：<${sourceUrl}>`);
    if (licenseUrl) lines.push(`许可证页面：<${licenseUrl}>`);
    lines.push("搜索服务：Openverse");
    return DetailsManager.markdownToDetails(lines.join("\n\n"));
  }

  function getViewportCenteredLocation(project: Project, size: Vector): Vector {
    return project.renderer.getCoverWorldRectangle().center.subtract(size.clone().multiply(0.5));
  }

  addTool("get_all_nodes", "获取舞台上所有对象及其项目级引用", z.object({}), (project, _data, references) => ({
    objects: project.stage.map((object) => toAgentObjectInfo(object, references)),
  }));
  addTool(
    "delete_node",
    "根据项目级引用删除对象",
    z.object({ ref: objectRefSchema }),
    (project, { ref }, references) => {
      project.stageManager.delete(references.resolve(ref));
      project.historyManager.recordStep();
    },
  );
  addTool(
    "delete_nodes",
    "批量删除指定项目级引用对应的对象",
    z.object({
      refs: z.array(objectRefSchema).describe("要删除的对象引用数组"),
    }),
    (project, { refs }, references) => {
      let deletedCount = 0;
      for (const ref of refs) {
        project.stageManager.delete(references.resolve(ref));
        deletedCount++;
      }
      if (deletedCount > 0) {
        project.historyManager.recordStep();
      }
      return { deletedCount };
    },
  );
  addTool("delete_selected_nodes", "删除当前所有选中的节点", z.object({}), (project) => {
    const selected = project.stageManager.getSelectedEntities();
    const count = selected.length;
    for (const entity of [...selected]) {
      project.stageManager.delete(entity);
    }
    if (count > 0) {
      project.historyManager.recordStep();
    }
    return { deletedCount: count };
  });
  addTool("delete_all_nodes", "删除舞台上所有的节点和连线（清空舞台）", z.object({}), (project) => {
    const entities = [...project.stageManager.getEntities()];
    const associations = [...project.stageManager.getAssociations()];
    for (const assoc of associations) {
      project.stageManager.delete(assoc);
    }
    for (const entity of entities) {
      project.stageManager.delete(entity);
    }
    const total = entities.length + associations.length;
    if (total > 0) {
      project.historyManager.recordStep();
    }
    return { deletedEntities: entities.length, deletedAssociations: associations.length };
  });
  addTool(
    "edit_text_node",
    "编辑 TextNode 的内容、颜色和尺寸。此工具不会移动节点。",
    z.object({
      ref: nodeRefSchema,
      data: z.object({
        text: z.string().optional(),
        color: z.array(z.number()).optional().describe("[255,255,255,1]"),
        width: z.number().min(16).max(4096).optional(),
        sizeAdjust: z
          .union([
            z.literal("auto").describe("自动调整宽度"),
            z.literal("manual").describe("宽度由width字段定义，文本自动换行"),
          ])
          .optional(),
      }),
    }),
    (project, { ref, data }, references) => {
      const node = references.resolve(ref, "node");
      if (!(node instanceof TextNode)) {
        return {
          success: false,
          error: { code: "wrong_node_type", ref, expected: "TextNode", actual: node.constructor.name },
        };
      }
      if (
        data.text === undefined &&
        data.color === undefined &&
        data.width === undefined &&
        data.sizeAdjust === undefined
      ) {
        return { success: false, error: { code: "no_changes", ref, message: "没有提供要修改的字段" } };
      }

      if (data.width !== undefined && data.sizeAdjust === "auto") {
        return {
          success: false,
          error: { code: "invalid_size_mode", ref, message: "width 只能在 manual 宽度模式下使用" },
        };
      }

      const previous = {
        text: node.text,
        color: node.color,
        sizeAdjust: node.sizeAdjust,
        rectangle: node.collisionBox.getRectangle().clone(),
      };
      try {
        node.text = data.text ?? node.text;
        node.color = data.color ? new Color(...(data.color as [number, number, number, number])) : node.color;
        node.sizeAdjust = data.sizeAdjust ?? (data.width !== undefined ? "manual" : node.sizeAdjust);
        if (data.width !== undefined) {
          const rect = node.collisionBox.getRectangle();
          node.collisionBox.updateShapeList([
            new Rectangle(rect.location.clone(), new Vector(data.width, rect.size.y)),
          ]);
        }
        if (node.sizeAdjust === "manual") {
          node.forceAdjustHeightByText();
        } else {
          node.forceAdjustSizeByText();
        }

        project.historyManager.recordStep();
        const finalRect = node.collisionBox.getRectangle();
        return {
          success: true,
          ref,
          text: node.text,
          size: { width: finalRect.size.x, height: finalRect.size.y },
          sizeAdjust: node.sizeAdjust,
        };
      } catch (error) {
        node.text = previous.text;
        node.color = previous.color;
        node.sizeAdjust = previous.sizeAdjust;
        node.collisionBox.updateShapeList([previous.rectangle]);
        throw error;
      }
    },
  );
  addTool(
    "edit_image_node",
    "编辑 ImageNode 的显示尺寸和背景状态。图片始终保持原始宽高比；此工具不会移动节点。",
    z.object({
      ref: nodeRefSchema,
      data: z.object({
        displaySize: z
          .object({
            basis: z
              .union([z.literal("width"), z.literal("height"), z.literal("longest_edge")])
              .describe("按照宽度、高度或最长边设置显示尺寸"),
            value: z.number().min(16).max(4096).describe("目标显示尺寸"),
          })
          .optional(),
        isBackground: z.boolean().optional().describe("是否把图片作为背景图片"),
      }),
    }),
    (project, { ref, data }, references) => {
      const node = references.resolve(ref, "node");
      if (!(node instanceof ImageNode)) {
        return {
          success: false,
          error: { code: "wrong_node_type", ref, expected: "ImageNode", actual: node.constructor.name },
        };
      }
      if (data.displaySize === undefined && data.isBackground === undefined) {
        return { success: false, error: { code: "no_changes", ref, message: "没有提供要修改的字段" } };
      }

      const previous = {
        scale: node.scale,
        isBackground: node.isBackground,
        rectangle: node.collisionBox.getRectangle().clone(),
      };
      try {
        const currentRect = node.collisionBox.getRectangle();
        if (data.displaySize) {
          const intrinsicWidth = node.bitmap?.width ?? currentRect.width / node.scale;
          const intrinsicHeight = node.bitmap?.height ?? currentRect.height / node.scale;
          if (
            !Number.isFinite(intrinsicWidth) ||
            !Number.isFinite(intrinsicHeight) ||
            intrinsicWidth <= 0 ||
            intrinsicHeight <= 0
          ) {
            return {
              success: false,
              error: { code: "invalid_image_size", ref, message: "无法确定图片的原始尺寸" },
            };
          }

          const basisSize =
            data.displaySize.basis === "width"
              ? intrinsicWidth
              : data.displaySize.basis === "height"
                ? intrinsicHeight
                : Math.max(intrinsicWidth, intrinsicHeight);
          const nextScale = data.displaySize.value / basisSize;
          if (nextScale < 0.1 || nextScale > 10) {
            return {
              success: false,
              error: {
                code: "scale_out_of_range",
                ref,
                message: "目标尺寸超出 ImageNode 支持的 0.1 到 10 倍缩放范围",
              },
            };
          }
          node.scaleUpdate(nextScale - node.scale);
          if (!node.bitmap) {
            node.collisionBox.updateShapeList([
              new Rectangle(
                currentRect.location.clone(),
                new Vector(intrinsicWidth * nextScale, intrinsicHeight * nextScale),
              ),
            ]);
          }
        }

        node.isBackground = data.isBackground ?? node.isBackground;
        project.historyManager.recordStep();
        const finalRect = node.collisionBox.getRectangle();
        return {
          success: true,
          ref,
          displaySize: { width: finalRect.width, height: finalRect.height },
          isBackground: node.isBackground,
        };
      } catch (error) {
        node.scale = previous.scale;
        node.isBackground = previous.isBackground;
        node.collisionBox.updateShapeList([previous.rectangle]);
        throw error;
      }
    },
  );
  addTool(
    "auto_layout_dag",
    "将同一分组层级中已经通过有向连线连接的普通节点，按从左到右的 DAG 分层方式整体布局。创建并连线完成后调用一次；不能用于 Section、孤立节点或有环图。",
    z.object({
      refs: z.array(nodeRefSchema).min(2).describe("需要整体布局的节点项目级引用"),
    }),
    (project, { refs }, references) => {
      const uniqueRefs = [...new Set(refs)];
      if (uniqueRefs.length !== refs.length) {
        return { success: false, error: { code: "duplicate_refs", message: "refs 不能包含重复节点引用" } };
      }

      const nodes = uniqueRefs.map((ref) => ({ ref, node: references.resolve(ref, "node") }));
      const invalidNode = nodes.find(({ node }) => !(node instanceof ConnectableEntity) || node instanceof Section);
      if (invalidNode) {
        return {
          success: false,
          error: {
            code: "unsupported_node_type",
            ref: invalidNode.ref,
            message: "DAG 布局目前只支持非 Section 的可连接节点",
          },
        };
      }

      const entities = nodes.map(({ node }) => node as ConnectableEntity);
      const parentSection = entities[0].parentSection;
      if (!entities.every((entity) => entity.parentSection === parentSection)) {
        return {
          success: false,
          error: { code: "mixed_containers", message: "DAG 布局的节点必须位于同一直属 Section 层级" },
        };
      }

      const nodeIds = new Set(entities.map((entity) => entity.uuid));
      const internalEdgeCount = project.stageManager
        .getEdges()
        .filter((edge) => nodeIds.has(edge.source.uuid) && nodeIds.has(edge.target.uuid)).length;
      if (internalEdgeCount === 0) {
        return {
          success: false,
          error: { code: "no_internal_edges", message: "DAG 布局至少需要一条位于 refs 范围内的有向连线" },
        };
      }
      if (!project.graphMethods.isDAGByNodes(entities)) {
        return { success: false, error: { code: "not_dag", message: "指定节点不构成有向无环图" } };
      }

      const result = project.autoLayout.autoLayoutDAG(entities);
      return { success: true, ...result };
    },
  );
  addTool(
    "create_text_node",
    "创建 TextNode。节点会插入到当前视野中心；完成连线后使用 auto_layout_dag 整体整理，不要尝试提供坐标。",
    z.object({
      text: z.string(),
      color: z.array(z.number()).optional().describe("[R,G,B,A]，不填写时使用透明色"),
      width: z.number().min(16).max(4096).optional().describe("手动宽度模式下的文本框宽度"),
      sizeAdjust: z
        .union([
          z.literal("auto").describe("自动调整宽度"),
          z.literal("manual").describe("宽度由width字段定义，文本自动换行"),
        ])
        .optional(),
    }),
    (project, { text, color, width, sizeAdjust }, references) => {
      if (width !== undefined && sizeAdjust === "auto") {
        return {
          success: false,
          error: { code: "invalid_size_mode", message: "width 只能在 manual 宽度模式下使用" },
        };
      }
      if (sizeAdjust === "manual" && width === undefined) {
        return {
          success: false,
          error: { code: "missing_width", message: "manual 宽度模式必须提供 width" },
        };
      }

      const resolvedSizeAdjust = sizeAdjust ?? (width === undefined ? "auto" : "manual");
      const node = new TextNode(project, {
        text,
        color: color ? new Color(...(color as [number, number, number, number])) : Color.Transparent,
        collisionBox: new CollisionBox([new Rectangle(Vector.getZero(), new Vector(width ?? 100, 50))]),
        sizeAdjust: resolvedSizeAdjust,
      });
      node.moveTo(getViewportCenteredLocation(project, node.collisionBox.getRectangle().size));
      project.stageManager.add(node);
      project.historyManager.recordStep();
      const rect = node.collisionBox.getRectangle();
      return {
        success: true,
        ref: references.getOrCreateRef(node),
        size: { width: rect.width, height: rect.height },
        sizeAdjust: node.sizeAdjust,
      };
    },
  );
  addTool(
    "generate_node_tree_by_text",
    "根据纯文本缩进结构生成树状节点",
    z.object({
      text: z
        .string()
        .describe("包含缩进结构的文本，每一层缩进2个空格，例如：'root\\n  child1\\n  child2\\n    grandchild'"),
    }),
    (project, { text }) => {
      project.stageManager.generateNodeTreeByText(text, 2);
    },
  );
  addTool(
    "expand_node_tree_from_node",
    "从指定节点开始进行树形扩展，传入一个节点引用和缩进文本，在该节点下生成树状子节点",
    z.object({
      ref: nodeRefSchema.describe("根节点引用"),
      text: z.string().describe("包含缩进结构的文本，每一层缩进2个空格，例如：'child1\\n  grandchild\\nchild2'"),
    }),
    (project, { ref, text }, references) => {
      const root = references.resolve(ref, "node");
      const result = project.stageImport.addNodeTreeByTextFromNode(root.uuid, text, 2);
      if (result.success && result.nodeCount && result.nodeCount > 0) {
        project.historyManager.recordStep();
      }
      return result;
    },
  );
  addTool(
    "search_text_nodes_by_regex",
    "根据正则表达式搜索文本节点",
    z.object({
      regex: z.string().describe("正则表达式字符串"),
    }),
    (project, { regex }, references) => {
      const results: { text: string; ref: string }[] = [];
      const regexObj = new RegExp(regex);
      for (const entity of project.stageManager.getEntities()) {
        if (entity instanceof TextNode && regexObj.test(entity.text)) {
          results.push({ text: entity.text, ref: references.getOrCreateRef(entity) });
        }
      }
      return results;
    },
  );
  addTool(
    "get_children",
    "通过项目级引用获取一个节点的所有第一层子节点（基于连接关系）",
    z.object({
      ref: nodeRefSchema,
    }),
    (project, { ref }, references) => {
      const object = references.resolve(ref, "node");
      const node = project.stageManager.getConnectableEntityByUUID(object.uuid);
      if (!node) return [];
      const children = project.graphMethods.nodeChildrenArray(node);
      const results: { text: string; ref: string }[] = [];
      for (const child of children) {
        if (child instanceof TextNode) {
          results.push({ text: child.text, ref: references.getOrCreateRef(child) });
        }
      }
      return results;
    },
  );
  addTool(
    "get_parents",
    "通过项目级引用获取一个节点的所有父级节点（基于连接关系）",
    z.object({
      ref: nodeRefSchema,
    }),
    (project, { ref }, references) => {
      const object = references.resolve(ref, "node");
      const node = project.stageManager.getConnectableEntityByUUID(object.uuid);
      if (!node) return [];
      const parents = project.graphMethods.nodeParentArray(node);
      const results: { text: string; ref: string }[] = [];
      for (const parent of parents) {
        if (parent instanceof TextNode) {
          results.push({ text: parent.text, ref: references.getOrCreateRef(parent) });
        }
      }
      return results;
    },
  );
  addTool(
    "batch_change_color",
    "批量给物体更改颜色",
    z.object({
      refs: z.array(objectRefSchema).describe("对象引用数组"),
      color: z.array(z.number()).describe("[R,G,B,A]，RGB为0~255，A为0~1"),
    }),
    (project, { refs, color }, references) => {
      const colorObj = new Color(...(color as [number, number, number, number]));
      let changedCount = 0;
      for (const ref of refs) {
        const obj = references.resolve(ref);
        if ("color" in obj && obj.color instanceof Color) {
          obj.color = colorObj;
          changedCount++;
        }
      }
      if (changedCount > 0) {
        project.historyManager.recordStep();
      }
      return { changedCount };
    },
  );
  addTool(
    "get_object_details",
    "通过项目级引用数组获取对象的模型可读详细信息",
    z.object({
      refs: z.array(objectRefSchema).describe("对象引用数组"),
    }),
    (_project, { refs }, references) => refs.map((ref) => toAgentObjectInfo(references.resolve(ref), references)),
  );
  addTool(
    "check_connections",
    "检查节点是否是通过Edge直接连接的",
    z.object({
      pairs: z.array(z.array(nodeRefSchema).length(2)).describe("节点引用对数组，例如[[n1,n2],[n3,n4]]"),
    }),
    (project, { pairs }, references) => {
      const results: { fromRef: string; toRef: string; connected: boolean }[] = [];
      for (const [fromRef, toRef] of pairs) {
        const fromObject = references.resolve(fromRef, "node");
        const toObject = references.resolve(toRef, "node");
        const fromNode = project.stageManager.getConnectableEntityByUUID(fromObject.uuid);
        const toNode = project.stageManager.getConnectableEntityByUUID(toObject.uuid);
        if (fromNode && toNode) {
          const connected = project.graphMethods.isConnected(fromNode, toNode);
          results.push({ fromRef, toRef, connected });
        } else {
          results.push({ fromRef, toRef, connected: false });
        }
      }
      return results;
    },
  );
  addTool(
    "create_edges",
    "创建一些连线连接多个物体",
    z.object({
      edges: z.array(
        z.object({
          sourceRef: nodeRefSchema,
          targetRef: nodeRefSchema,
          text: z.string().optional().default(""),
        }),
      ),
    }),
    (project, { edges }, references) => {
      const results: Array<{
        sourceRef: string;
        targetRef: string;
        success: boolean;
        edgeRef?: string;
        error?: string;
      }> = [];
      for (const edgeData of edges) {
        const sourceObject = references.resolve(edgeData.sourceRef, "node");
        const targetObject = references.resolve(edgeData.targetRef, "node");
        const sourceNode = project.stageManager.getConnectableEntityByUUID(sourceObject.uuid);
        const targetNode = project.stageManager.getConnectableEntityByUUID(targetObject.uuid);
        if (!sourceNode) {
          results.push({
            sourceRef: edgeData.sourceRef,
            targetRef: edgeData.targetRef,
            success: false,
            error: `源节点不存在或不是可连接对象`,
          });
          continue;
        }
        if (!targetNode) {
          results.push({
            sourceRef: edgeData.sourceRef,
            targetRef: edgeData.targetRef,
            success: false,
            error: `目标节点不存在或不是可连接对象`,
          });
          continue;
        }
        try {
          project.nodeConnector.connectConnectableEntity(sourceNode, targetNode, edgeData.text || "");
          // 获取新创建的边的UUID（可能需要通过查找最新的边）
          const newEdge = project.stageManager
            .getAssociations()
            .find((edge) => edge instanceof Edge && edge.source === sourceNode && edge.target === targetNode);
          if (newEdge) {
            results.push({
              sourceRef: edgeData.sourceRef,
              targetRef: edgeData.targetRef,
              success: true,
              edgeRef: references.getOrCreateRef(newEdge),
            });
          } else {
            results.push({
              sourceRef: edgeData.sourceRef,
              targetRef: edgeData.targetRef,
              success: false,
              error: `连线创建失败，未知原因`,
            });
          }
        } catch (error) {
          results.push({
            sourceRef: edgeData.sourceRef,
            targetRef: edgeData.targetRef,
            success: false,
            error: error instanceof Error ? error.message : "连线创建失败",
          });
        }
      }
      if (results.some((r) => r.success)) {
        project.historyManager.recordStep();
      }
      return results;
    },
  );
  addTool(
    "change_edge_text",
    "更改连线上的文字",
    z.object({
      edgeRef: edgeRefSchema,
      text: z.string(),
    }),
    (project, { edgeRef, text }, references) => {
      const edge = references.resolve(edgeRef, "edge");
      if (!(edge instanceof Edge)) {
        return { success: false, error: "连线不存在或不是Edge类型" };
      }
      edge.rename(text);
      project.historyManager.recordStep();
      return { success: true };
    },
  );
  addTool(
    "select_objects",
    "通过项目级引用选中一些舞台对象",
    z.object({
      refs: z.array(objectRefSchema).describe("要选中的对象引用数组"),
      clearOthers: z.boolean().optional().default(false).describe("是否清除其他对象的选中状态"),
    }),
    (project, { refs, clearOthers }, references) => {
      if (clearOthers) {
        // 清除所有对象的选中状态
        for (const obj of project.stageManager.getEntities()) {
          obj.isSelected = false;
        }
        for (const assoc of project.stageManager.getAssociations()) {
          assoc.isSelected = false;
        }
      }
      let selectedCount = 0;
      for (const ref of refs) {
        const obj = references.resolve(ref);
        obj.isSelected = true;
        selectedCount++;
      }
      if (selectedCount > 0) {
        project.historyManager.recordStep();
      }
      return { selectedCount };
    },
  );
  addTool(
    "get_selected_nodes",
    "获取用户当前所有选中对象的详细信息和项目级引用",
    z.object({}),
    (project, _data, references) => ({
      objects: [...project.stageManager.getSelectedEntities(), ...project.stageManager.getSelectedAssociations()].map(
        (object) => toAgentObjectInfo(object, references),
      ),
    }),
  );

  addTool(
    "get_nodes_in_viewport",
    "获取当前视野范围中被完全覆盖住的节点",
    z.object({}),
    (project, _data, references) => {
      const viewRect = project.renderer.getCoverWorldRectangle();
      const results: Array<Record<string, unknown>> = [];

      for (const entity of project.stageManager.getEntities()) {
        const rect = entity.collisionBox.getRectangle();
        if (rect.isAbsoluteIn(viewRect)) {
          results.push(toAgentObjectInfo(entity, references));
        }
      }

      return { nodes: results };
    },
  );
  addTool("get_selected_refs", "获取用户当前所有选中对象的项目级引用", z.object({}), (project, _data, references) => {
    const selectedEntities = project.stageManager.getSelectedEntities();
    const selectedAssociations = project.stageManager.getSelectedAssociations();
    const refs = [...selectedEntities, ...selectedAssociations].map((object) => references.getOrCreateRef(object));
    return { refs };
  });

  addTool(
    "breadth_expand_node",
    "广度扩展一个节点，传入一个节点引用和字符串数组，自动添加一层子节点",
    z.object({
      ref: nodeRefSchema.describe("源节点引用"),
      texts: z.array(z.string()).describe("要添加的子节点文本数组"),
    }),
    (project, { ref, texts }, references) => {
      const sourceObject = references.resolve(ref, "node");
      const sourceNode = project.stageManager.getConnectableEntityByUUID(sourceObject.uuid);
      if (!sourceNode) {
        return { success: false, error: "源节点不存在或不是可连接对象" };
      }

      const sourceRect = sourceNode.collisionBox.getRectangle();
      const startX = sourceRect.location.x + sourceRect.size.x + 100; // 右侧100像素
      const startY = sourceRect.location.y;
      const verticalSpacing = 60;

      const results: Array<{ text: string; ref?: string; success: boolean; error?: string }> = [];

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        try {
          const node = new TextNode(project, {
            text,
            color: new Color(0, 0, 0, 0), // 透明
            collisionBox: new CollisionBox([
              new Rectangle(new Vector(startX, startY + i * verticalSpacing), new Vector(100, 50)),
            ]),
            sizeAdjust: "auto" as "auto" | "manual",
          });
          project.stageManager.add(node);

          // 创建连线
          project.nodeConnector.connectConnectableEntity(sourceNode, node, "");

          results.push({ text, ref: references.getOrCreateRef(node), success: true });
        } catch (error) {
          results.push({
            text,
            success: false,
            error: error instanceof Error ? error.message : "创建节点失败",
          });
        }
      }

      if (results.some((r) => r.success)) {
        project.historyManager.recordStep();
      }

      return { results };
    },
  );

  addTool(
    "depth_expand_node",
    "深度扩展一个节点，传入一个节点引用作为根节点，根据字符串数组扩展出链式结构",
    z.object({
      ref: nodeRefSchema.describe("根节点引用"),
      texts: z.array(z.string()).describe("要添加的链式节点文本数组"),
    }),
    (project, { ref, texts }, references) => {
      const rootObject = references.resolve(ref, "node");
      const rootNode = project.stageManager.getConnectableEntityByUUID(rootObject.uuid);
      if (!rootNode) {
        return { success: false, error: "根节点不存在或不是可连接对象" };
      }

      const results: Array<{ text: string; ref?: string; success: boolean; error?: string }> = [];
      let currentNode = rootNode;
      const horizontalSpacing = 150;

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        try {
          const currentRect = currentNode.collisionBox.getRectangle();
          const node = new TextNode(project, {
            text,
            color: new Color(0, 0, 0, 0), // 透明
            collisionBox: new CollisionBox([
              new Rectangle(
                new Vector(currentRect.location.x + horizontalSpacing, currentRect.location.y),
                new Vector(100, 50),
              ),
            ]),
            sizeAdjust: "auto" as "auto" | "manual",
          });
          project.stageManager.add(node);

          // 创建连线：从前一个节点连接到新节点
          project.nodeConnector.connectConnectableEntity(currentNode, node, "");

          results.push({ text, ref: references.getOrCreateRef(node), success: true });
          currentNode = node; // 更新当前节点为新建的节点，继续链式扩展
        } catch (error) {
          results.push({
            text,
            success: false,
            error: error instanceof Error ? error.message : "创建节点失败",
          });
          break; // 链式结构中一旦失败就停止
        }
      }

      if (results.some((r) => r.success)) {
        project.historyManager.recordStep();
      }

      return { results };
    },
  );

  addTool(
    "sort_selected_nodes_by_y",
    "对选中的所有文本节点按照从上到下的顺序重新排列位置（y轴方向）。AI调用前需先用get_selected_nodes获取当前选中节点信息，按y坐标从小到大排列得到current_order，再根据用户期望得到desired_order。",
    z.object({
      current_order: z.array(z.string()).describe("当前选中文本节点的文本内容数组，按y坐标从上到下（从小到大）排列"),
      desired_order: z
        .array(z.string())
        .describe("期望排列的文本内容顺序数组，从上到下，必须与current_order包含完全相同的元素"),
    }),
    (project, { current_order, desired_order }) => {
      // 获取所有选中的TextNode
      const selectedTextNodes = project.stageManager
        .getSelectedEntities()
        .filter((e): e is TextNode => e instanceof TextNode);

      // 检查重复名称
      const textCounts = new Map<string, number>();
      for (const node of selectedTextNodes) {
        textCounts.set(node.text, (textCounts.get(node.text) ?? 0) + 1);
      }
      const duplicates = [...textCounts.entries()].filter(([, count]) => count > 1).map(([text]) => text);
      if (duplicates.length > 0) {
        return {
          success: false,
          error: `排序功能不能有重复名称的文本节点，重复的内容：${duplicates.join(", ")}`,
        };
      }

      // 校验 current_order 与 desired_order 元素一致
      const currentSet = new Set(current_order);
      const desiredSet = new Set(desired_order);
      if (current_order.length !== desired_order.length || [...currentSet].some((t) => !desiredSet.has(t))) {
        return { success: false, error: "current_order 与 desired_order 包含的元素不一致" };
      }

      // 构建 text -> node 映射
      const textToNode = new Map<string, TextNode>();
      for (const node of selectedTextNodes) {
        textToNode.set(node.text, node);
      }

      // 校验 current_order 是否覆盖了所有选中节点
      for (const text of current_order) {
        if (!textToNode.has(text)) {
          return { success: false, error: `current_order 中的 "${text}" 在选中节点中未找到` };
        }
      }

      // 以 current_order 第一个节点（最顶部）的 y 坐标作为起始 y
      const startNode = textToNode.get(current_order[0])!;
      let currentY = startNode.collisionBox.getRectangle().location.y;

      // 按 desired_order 顺序从上到下重新排列，保持原 x 坐标
      for (const text of desired_order) {
        const node = textToNode.get(text)!;
        const rect = node.collisionBox.getRectangle();
        node.collisionBox.updateShapeList([new Rectangle(new Vector(rect.location.x, currentY), rect.size)]);
        node.forceAdjustSizeByText();
        // 下一个节点从当前节点底部开始
        currentY += node.collisionBox.getRectangle().size.y;
      }

      project.historyManager.recordStep();
      return { success: true, movedCount: desired_order.length };
    },
  );

  addTool(
    "sort_selected_nodes_by_x",
    "对选中的所有文本节点按照从左到右的顺序重新排列位置（x轴方向）。AI调用前需先用get_selected_nodes获取当前选中节点信息，按x坐标从小到大排列得到current_order，再根据用户期望得到desired_order。",
    z.object({
      current_order: z.array(z.string()).describe("当前选中文本节点的文本内容数组，按x坐标从左到右（从小到大）排列"),
      desired_order: z
        .array(z.string())
        .describe("期望排列的文本内容顺序数组，从左到右，必须与current_order包含完全相同的元素"),
    }),
    (project, { current_order, desired_order }) => {
      // 获取所有选中的TextNode
      const selectedTextNodes = project.stageManager
        .getSelectedEntities()
        .filter((e): e is TextNode => e instanceof TextNode);

      // 检查重复名称
      const textCounts = new Map<string, number>();
      for (const node of selectedTextNodes) {
        textCounts.set(node.text, (textCounts.get(node.text) ?? 0) + 1);
      }
      const duplicates = [...textCounts.entries()].filter(([, count]) => count > 1).map(([text]) => text);
      if (duplicates.length > 0) {
        return {
          success: false,
          error: `排序功能不能有重复名称的文本节点，重复的内容：${duplicates.join(", ")}`,
        };
      }

      // 校验 current_order 与 desired_order 元素一致
      const currentSet = new Set(current_order);
      const desiredSet = new Set(desired_order);
      if (current_order.length !== desired_order.length || [...currentSet].some((t) => !desiredSet.has(t))) {
        return { success: false, error: "current_order 与 desired_order 包含的元素不一致" };
      }

      // 构建 text -> node 映射
      const textToNode = new Map<string, TextNode>();
      for (const node of selectedTextNodes) {
        textToNode.set(node.text, node);
      }

      // 校验 current_order 是否覆盖了所有选中节点
      for (const text of current_order) {
        if (!textToNode.has(text)) {
          return { success: false, error: `current_order 中的 "${text}" 在选中节点中未找到` };
        }
      }

      // 以 current_order 第一个节点（最左侧）的 x 坐标作为起始 x
      const startNode = textToNode.get(current_order[0])!;
      let currentX = startNode.collisionBox.getRectangle().location.x;

      // 按 desired_order 顺序从左到右重新排列，保持原 y 坐标
      for (const text of desired_order) {
        const node = textToNode.get(text)!;
        const rect = node.collisionBox.getRectangle();
        node.collisionBox.updateShapeList([new Rectangle(new Vector(currentX, rect.location.y), rect.size)]);
        node.forceAdjustSizeByText();
        // 下一个节点从当前节点右侧开始
        currentX += node.collisionBox.getRectangle().size.x;
      }

      project.historyManager.recordStep();
      return { success: true, movedCount: desired_order.length };
    },
  );
  addTool(
    "search_and_add_image_node",
    "从 Openverse 搜索开放授权的网络图片，下载后在当前视野中心创建 ImageNode。完成连线后使用 auto_layout_dag 整体整理；工具不返回图片 URL、附件 ID 或坐标。",
    z.object({
      query: z.string().min(1).max(400).describe("图片搜索关键词，建议包含主体、场景和风格"),
      preferredOrientation: z
        .union([z.literal("square"), z.literal("landscape"), z.literal("portrait")])
        .optional()
        .describe("偏好的图片方向，不填写时使用搜索相关度最高的结果"),
      maxDisplaySize: z.number().min(128).max(1600).optional().describe("图片节点最长边的最大画布显示尺寸，默认480"),
    }),
    async (project, { query, preferredOrientation, maxDisplaySize }, references, { abortSignal }) => {
      const { candidate, image: prepared } = await findDownloadableOpenverseImage(query, {
        orientation: preferredOrientation as ImageOrientation | undefined,
        abortSignal,
        transform: prepareImageBlobForImport,
      });
      const targetDisplaySize = calculateImageDisplaySize(prepared.width, prepared.height, maxDisplaySize ?? 480);
      const { node, width, height } = await createImageNodeFromBlob(project, prepared.blob, {
        location: getViewportCenteredLocation(project, new Vector(targetDisplaySize.width, targetDisplaySize.height)),
        intrinsicSize: prepared,
        maxDisplaySize: maxDisplaySize ?? 480,
        details: createOpenverseImageDetails(candidate),
      });
      project.historyManager.recordStep();
      const license = candidate.license?.match(/^[a-z0-9-]{1,32}$/i) ? candidate.license.toLowerCase() : undefined;
      return {
        ref: references.getOrCreateRef(node),
        intrinsicSize: { width, height },
        displaySize: { width: targetDisplaySize.width, height: targetDisplaySize.height },
        source: "openverse",
        license,
      };
    },
  );
  addTool(
    "recognize_image",
    "识别指定节点中的图片内容并返回文字描述。传入ImageNode引用或包含图片的Section引用，并用prompt描述识别目标。",
    z.object({
      ref: nodeRefSchema.describe("ImageNode引用，或包含图片的Section引用"),
      prompt: z
        .string()
        .describe('向图像识别模型提问的提示词，例如"这张图片里有哪些文字？"或"描述图片中的主要物体和场景"。'),
    }),
    async (project, { ref, prompt }, references) => {
      const obj = references.resolve(ref, "node");
      const imageNode = (
        obj instanceof ImageNode
          ? obj
          : findFirstImageInChildren(
              obj instanceof Section ? obj.children : [],
              (n) => n instanceof ImageNode,
              (n) => (n instanceof Section ? n.children : undefined),
            )
      ) as ImageNode | undefined;
      if (!imageNode) {
        return { success: false, error: "该节点不是 ImageNode，且其内部未找到图片" };
      }
      const blob = project.attachments.get(imageNode.attachmentId);
      if (!blob) {
        return { success: false, error: "图片数据未找到（附件可能已丢失）" };
      }
      try {
        const dataUrl = await blobToCompressedDataUrl(blob, Settings.maxPastedImageSize);
        const description = await recognizeImage(dataUrl, prompt);
        return { success: true, description };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "图片识别失败" };
      }
    },
  );
}

async function recognizeImage(dataUrl: string, prompt: string): Promise<string> {
  const provider = createOpenAICompatible({
    name: "project-graph",
    baseURL: Settings.aiApiBaseUrl,
    apiKey: Settings.aiApiKey || undefined,
    fetch: async (url: any, init: any) => {
      const response = await fetch(url.toString(), { ...init, mode: "cors" });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "unknown error");
        throw new Error(`图像识别请求失败 (${response.status}): ${errorText}`);
      }
      return response;
    },
  });
  const result = await generateText({
    model: provider.chatModel(Settings.aiModel),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", image: dataUrl },
        ],
      },
    ],
  });
  return result.text;
}
