import { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { Color, Vector } from "@graphif/data-structures";
import { serialize } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import OpenAI from "openai";
import z from "zod/v4";

export namespace AITools {
  export const tools: OpenAI.ChatCompletionTool[] = [];
  export const handlers: Map<string, (project: Project, data: any) => any> = new Map();

  function addTool<A extends z.ZodObject>(
    name: string,
    description: string,
    parameters: A,
    fn: (project: Project, data: z.infer<A>) => any,
  ) {
    tools.push({
      type: "function",
      function: {
        name,
        description,
        parameters: z.toJSONSchema(parameters),
        strict: true,
      },
    });
    handlers.set(name, fn);
  }

  addTool("get_all_nodes", "获取舞台上所有节点以及uuid", z.object({}), (project) => serialize(project.stage));
  addTool("delete_node", "根据uuid删除节点", z.object({ uuid: z.string() }), (project, { uuid }) => {
    project.stageManager.delete(project.stageManager.get(uuid)!);
    project.historyManager.recordStep();
  });
  addTool(
    "edit_text_node",
    "根据uuid编辑TextNode",
    z.object({
      uuid: z.string(),
      data: z.object({
        text: z.string().optional(),
        color: z.array(z.number()).optional().describe("[255,255,255,1]"),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        sizeAdjust: z
          .union([
            z.string("auto").describe("自动调整宽度"),
            z.string("manual").describe("宽度由width字段定义，文本自动换行"),
          ])
          .optional()
          .default("auto"),
      }),
    }),
    (project, { uuid, data }) => {
      const node = project.stageManager.get(uuid);
      if (!(node instanceof TextNode)) return;
      node.text = data.text ?? node.text;
      node.color = data.color ? new Color(...(data.color as [number, number, number, number])) : node.color;
      node.collisionBox.updateShapeList([
        new Rectangle(
          new Vector(
            data.x ?? node.collisionBox.getRectangle().location.x,
            data.y ?? node.collisionBox.getRectangle().location.y,
          ),
          new Vector(data.width ?? node.collisionBox.getRectangle().size.x, node.collisionBox.getRectangle().size.y),
        ),
      ]);
      node.sizeAdjust = data.sizeAdjust ?? node.sizeAdjust;
      node.forceAdjustSizeByText();
      project.historyManager.recordStep();
    },
  );
  addTool(
    "create_text_node",
    "创建TextNode",
    z.object({
      text: z.string(),
      color: z.array(z.number()).describe("[R,G,B,A]，RGB为0~255，A为0~1，正常情况下为透明[0,0,0,0]"),
      x: z.number(),
      y: z.number().describe("文本框默认高度=75"),
      width: z.number().describe("如果sizeAdjust为manual，则定义文本框宽度，否则可以写0"),
      sizeAdjust: z
        .union([
          z.string("auto").describe("自动调整宽度"),
          z.string("manual").describe("宽度由width字段定义，文本自动换行"),
        ])
        .optional()
        .describe("建议用auto"),
    }),
    (project, { text, color, x, y, width, sizeAdjust }) => {
      const node = new TextNode(project, {
        text,
        color: new Color(...(color as [number, number, number, number])),
        collisionBox: new CollisionBox([new Rectangle(new Vector(x, y), new Vector(width, 50))]),
        sizeAdjust: (sizeAdjust ?? "auto") as "auto" | "manual",
      });
      project.stageManager.add(node);
      project.historyManager.recordStep();
      return { uuid: node.uuid };
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
    "从指定节点开始进行树形扩展，传入一个uuid和缩进文本，在该节点下生成树状子节点",
    z.object({
      uuid: z.string().describe("根节点的UUID"),
      text: z.string().describe("包含缩进结构的文本，每一层缩进2个空格，例如：'child1\\n  grandchild\\nchild2'"),
    }),
    (project, { uuid, text }) => {
      const result = project.stageImport.addNodeTreeByTextFromNode(uuid, text, 2);
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
    (project, { regex }) => {
      const results: { text: string; uuid: string }[] = [];
      const regexObj = new RegExp(regex);
      for (const entity of project.stageManager.getEntities()) {
        if (entity instanceof TextNode && regexObj.test(entity.text)) {
          results.push({ text: entity.text, uuid: entity.uuid });
        }
      }
      return results;
    },
  );
  addTool(
    "get_children_by_uuid",
    "通过UUID获取一个节点的所有第一层子集节点（基于连接关系）",
    z.object({
      uuid: z.string(),
    }),
    (project, { uuid }) => {
      const node = project.stageManager.getConnectableEntityByUUID(uuid);
      if (!node) return [];
      const children = project.graphMethods.nodeChildrenArray(node);
      const results: { text: string; uuid: string }[] = [];
      for (const child of children) {
        if (child instanceof TextNode) {
          results.push({ text: child.text, uuid: child.uuid });
        }
      }
      return results;
    },
  );
  addTool(
    "get_parents_by_uuid",
    "通过UUID获取一个节点的所有父级节点（基于连接关系）",
    z.object({
      uuid: z.string(),
    }),
    (project, { uuid }) => {
      const node = project.stageManager.getConnectableEntityByUUID(uuid);
      if (!node) return [];
      const parents = project.graphMethods.nodeParentArray(node);
      const results: { text: string; uuid: string }[] = [];
      for (const parent of parents) {
        if (parent instanceof TextNode) {
          results.push({ text: parent.text, uuid: parent.uuid });
        }
      }
      return results;
    },
  );
  addTool(
    "batch_change_color",
    "批量给物体更改颜色",
    z.object({
      uuids: z.array(z.string()).describe("UUID数组"),
      color: z.array(z.number()).describe("[R,G,B,A]，RGB为0~255，A为0~1"),
    }),
    (project, { uuids, color }) => {
      const colorObj = new Color(...(color as [number, number, number, number]));
      let changedCount = 0;
      for (const uuid of uuids) {
        const obj = project.stageManager.get(uuid);
        if (obj && "color" in obj && obj.color instanceof Color) {
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
    "get_serialized_info",
    "通过uuid数组获取对应内容的详细序列化信息",
    z.object({
      uuids: z.array(z.string()).describe("UUID数组"),
    }),
    (project, { uuids }) => {
      const results: { uuid: string; serialized: any }[] = [];
      for (const uuid of uuids) {
        const obj = project.stageManager.get(uuid);
        if (obj) {
          results.push({
            uuid,
            serialized: serialize(obj),
          });
        }
      }
      return results;
    },
  );
  addTool(
    "check_connections",
    "检查节点是否是通过Edge直接连接的",
    z.object({
      pairs: z.array(z.array(z.string()).length(2)).describe("UUID对儿数组，例如[[uuid1, uuid2], [uuid3, uuid4]]"),
    }),
    (project, { pairs }) => {
      const results: { from: string; to: string; connected: boolean }[] = [];
      for (const [fromUuid, toUuid] of pairs) {
        const fromNode = project.stageManager.getConnectableEntityByUUID(fromUuid);
        const toNode = project.stageManager.getConnectableEntityByUUID(toUuid);
        if (fromNode && toNode) {
          const connected = project.graphMethods.isConnected(fromNode, toNode);
          results.push({ from: fromUuid, to: toUuid, connected });
        } else {
          results.push({ from: fromUuid, to: toUuid, connected: false });
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
          sourceUuid: z.string(),
          targetUuid: z.string(),
          text: z.string().optional().default(""),
        }),
      ),
    }),
    (project, { edges }) => {
      const results: Array<{
        sourceUuid: string;
        targetUuid: string;
        success: boolean;
        edgeUuid?: string;
        error?: string;
      }> = [];
      for (const edgeData of edges) {
        const sourceNode = project.stageManager.getConnectableEntityByUUID(edgeData.sourceUuid);
        const targetNode = project.stageManager.getConnectableEntityByUUID(edgeData.targetUuid);
        if (!sourceNode) {
          results.push({
            sourceUuid: edgeData.sourceUuid,
            targetUuid: edgeData.targetUuid,
            success: false,
            error: `源节点不存在或不是可连接对象`,
          });
          continue;
        }
        if (!targetNode) {
          results.push({
            sourceUuid: edgeData.sourceUuid,
            targetUuid: edgeData.targetUuid,
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
              sourceUuid: edgeData.sourceUuid,
              targetUuid: edgeData.targetUuid,
              success: true,
              edgeUuid: newEdge.uuid,
            });
          } else {
            results.push({
              sourceUuid: edgeData.sourceUuid,
              targetUuid: edgeData.targetUuid,
              success: false,
              error: `连线创建失败，未知原因`,
            });
          }
        } catch (error) {
          results.push({
            sourceUuid: edgeData.sourceUuid,
            targetUuid: edgeData.targetUuid,
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
      edgeUuid: z.string(),
      text: z.string(),
    }),
    (project, { edgeUuid, text }) => {
      const edge = project.stageManager.get(edgeUuid);
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
    "通过一些UUID，选中一些舞台对象",
    z.object({
      uuids: z.array(z.string()).describe("要选中的对象UUID数组"),
      clearOthers: z.boolean().optional().default(false).describe("是否清除其他对象的选中状态"),
    }),
    (project, { uuids, clearOthers }) => {
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
      for (const uuid of uuids) {
        const obj = project.stageManager.get(uuid);
        if (obj) {
          obj.isSelected = true;
          selectedCount++;
        }
      }
      if (selectedCount > 0) {
        project.historyManager.recordStep();
      }
      return { selectedCount };
    },
  );
  addTool("get_selected_nodes", "获取用户当前所有选中的节点的详细信息", z.object({}), (project) => {
    const results: Array<{
      uuid: string;
      type: string;
      text?: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
    }> = [];

    for (const entity of project.stageManager.getSelectedEntities()) {
      const rect = entity.collisionBox.getRectangle();
      const info = {
        uuid: entity.uuid,
        type: entity.constructor.name,
        position: { x: rect.location.x, y: rect.location.y },
        size: { width: rect.size.x, height: rect.size.y },
      };
      if (entity instanceof TextNode) {
        (info as any).text = entity.text;
      }
      results.push(info);
    }

    for (const assoc of project.stageManager.getSelectedAssociations()) {
      const rect = assoc.collisionBox.getRectangle();
      const info = {
        uuid: assoc.uuid,
        type: assoc.constructor.name,
        position: { x: rect.location.x, y: rect.location.y },
        size: { width: rect.size.x, height: rect.size.y },
      };
      if (assoc instanceof Edge) {
        (info as any).sourceUuid = assoc.source.uuid;
        (info as any).targetUuid = assoc.target.uuid;
        (info as any).text = assoc.text;
      }
      results.push(info);
    }

    return { nodes: results };
  });

  addTool("get_nodes_in_viewport", "获取当前视野范围中被完全覆盖住的节点", z.object({}), (project) => {
    const viewRect = project.renderer.getCoverWorldRectangle();
    const results: Array<{
      uuid: string;
      type: string;
      text?: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
    }> = [];

    for (const entity of project.stageManager.getEntities()) {
      const rect = entity.collisionBox.getRectangle();
      if (rect.isAbsoluteIn(viewRect)) {
        const info = {
          uuid: entity.uuid,
          type: entity.constructor.name,
          position: { x: rect.location.x, y: rect.location.y },
          size: { width: rect.size.x, height: rect.size.y },
        };
        if (entity instanceof TextNode) {
          (info as any).text = entity.text;
        }
        results.push(info);
      }
    }

    return { nodes: results };
  });
  addTool("get_selected_uuids", "获取用户当前所有选中的物体的uuid们", z.object({}), (project) => {
    const selectedEntities = project.stageManager.getSelectedEntities();
    const selectedAssociations = project.stageManager.getSelectedAssociations();
    const uuids = [...selectedEntities.map((e) => e.uuid), ...selectedAssociations.map((a) => a.uuid)];
    return { uuids };
  });

  addTool(
    "breadth_expand_node",
    "广度扩展一个节点，传入一个uuid和一个字符串数组，自动根据字符串数组给这个节点添加一层子节点",
    z.object({
      uuid: z.string().describe("源节点的UUID"),
      texts: z.array(z.string()).describe("要添加的子节点文本数组"),
    }),
    (project, { uuid, texts }) => {
      const sourceNode = project.stageManager.getConnectableEntityByUUID(uuid);
      if (!sourceNode) {
        return { success: false, error: "源节点不存在或不是可连接对象" };
      }

      const sourceRect = sourceNode.collisionBox.getRectangle();
      const startX = sourceRect.location.x + sourceRect.size.x + 100; // 右侧100像素
      const startY = sourceRect.location.y;
      const verticalSpacing = 60;

      const results: Array<{ text: string; uuid: string; success: boolean; error?: string }> = [];

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

          results.push({ text, uuid: node.uuid, success: true });
        } catch (error) {
          results.push({
            text,
            uuid: "",
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
    "深度扩展一个节点，传入一个uuid作为根节点，根据字符串数组在这个节点上扩展出一个链式结构",
    z.object({
      uuid: z.string().describe("根节点的UUID"),
      texts: z.array(z.string()).describe("要添加的链式节点文本数组"),
    }),
    (project, { uuid, texts }) => {
      const rootNode = project.stageManager.getConnectableEntityByUUID(uuid);
      if (!rootNode) {
        return { success: false, error: "根节点不存在或不是可连接对象" };
      }

      const results: Array<{ text: string; uuid: string; success: boolean; error?: string }> = [];
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

          results.push({ text, uuid: node.uuid, success: true });
          currentNode = node; // 更新当前节点为新建的节点，继续链式扩展
        } catch (error) {
          results.push({
            text,
            uuid: "",
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
}
