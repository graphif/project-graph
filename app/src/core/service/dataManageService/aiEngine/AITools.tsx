import { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/sprites/TextNode";
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

  addTool("get_all_nodes", "获取所有节点以及uuid", z.object({}), (project) => serialize(project.stage));
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
}
