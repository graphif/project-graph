import type { Project } from "@/core/Project";
import type { AIObjectReferenceRegistry } from "./AIObjectReferenceRegistry";
import z from "zod/v4";

export type BuiltInToolExecutionContext = {
  abortSignal?: AbortSignal;
};

export type BuiltInToolExecutor = (
  project: Project,
  input: any,
  references: AIObjectReferenceRegistry,
  context: BuiltInToolExecutionContext,
) => any;

export type BuiltInToolCapability =
  | "project"
  | "references"
  | "history"
  | "effects"
  | "delete"
  | "text"
  | "graph"
  | "layout"
  | "tree-import"
  | "node-connect"
  | "attachments"
  | "dom"
  | "viewport"
  | "selection"
  | "image"
  | "settings"
  | "network"
  | "model"
  | "abort-signal";

export type AcquiredBuiltInToolCapabilities = Readonly<
  Partial<{
    project: Project;
    references: AIObjectReferenceRegistry;
    history: true;
    effects: true;
    delete: true;
    text: true;
    graph: true;
    layout: true;
    "tree-import": true;
    "node-connect": true;
    attachments: true;
    dom: true;
    viewport: true;
    selection: true;
    image: true;
    settings: true;
    network: true;
    model: true;
    "abort-signal": AbortSignal | undefined;
  }>
>;

export type BuiltInToolRuntimeHost = {
  acquireCapabilities(
    capabilities: readonly BuiltInToolCapability[],
    context: BuiltInToolExecutionContext,
  ): AcquiredBuiltInToolCapabilities | Promise<AcquiredBuiltInToolCapabilities>;
  beforeExecutorInvoke?(): void | Promise<void>;
};

export function createLiveProjectBuiltInToolRuntimeHost(
  project: Project,
  references: AIObjectReferenceRegistry,
): BuiltInToolRuntimeHost {
  return {
    acquireCapabilities: (capabilities, context) =>
      Object.fromEntries(
        capabilities.map((capability) => [
          capability,
          capability === "project"
            ? project
            : capability === "references"
              ? references
              : capability === "abort-signal"
                ? context.abortSignal
                : true,
        ]),
      ) as AcquiredBuiltInToolCapabilities,
  };
}

export type BuiltInToolDefinition = Readonly<{
  name: string;
  description: string;
  inputSchema: z.ZodObject;
  output: Readonly<{ contract: "existing-handler-result" }>;
  effect: Readonly<{
    project: "read" | "mutate";
    selection: "none" | "read" | "mutate";
    external: "none" | "network" | "model";
  }>;
  risk: "none" | "project-mutation" | "destructive" | "external-communication";
  capabilities: readonly BuiltInToolCapability[];
  projectReferences: Readonly<{ reads: boolean; allocates: boolean }>;
  cancellation: "none" | "cooperative";
  transaction: "none" | "atomic" | "rollback-on-error" | "partial-success" | "non-transactional";
  persistence: "none" | "project" | "project-references" | "project-and-references";
  loadExecutor: () => Promise<BuiltInToolExecutor>;
  toModelOutput?: (output: any) => { type: "content"; value: any[] };
}>;

type DefinitionSource = Omit<BuiltInToolDefinition, "output" | "loadExecutor">;

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

const output = Object.freeze({ contract: "existing-handler-result" as const });

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object" || value instanceof RegExp || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key], seen);
  }
  return Object.freeze(value);
}

function defineTool(source: DefinitionSource): BuiltInToolDefinition {
  return {
    ...source,
    output,
    loadExecutor: async () => {
      const { loadBuiltInToolExecutor } = await import("./BuiltInToolExecutors");
      return loadBuiltInToolExecutor(source.name);
    },
  };
}

const definitions: BuiltInToolDefinition[] = [
  defineTool({
    name: "get_all_nodes",
    description: "获取舞台上所有对象及其项目级引用",
    inputSchema: z.object({}),
    effect: { project: "read", selection: "none", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "dom", "image", "settings"],
    projectReferences: { reads: false, allocates: true },
    cancellation: "none",
    transaction: "none",
    persistence: "project-references",
  }),
  defineTool({
    name: "delete_node",
    description: "根据项目级引用删除节点及其关联连线",
    inputSchema: z.object({ ref: nodeRefSchema }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "destructive",
    capabilities: ["project", "references", "history", "effects", "delete", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "atomic",
    persistence: "project",
  }),
  defineTool({
    name: "delete_nodes",
    description: "批量删除指定项目级引用对应的节点及其关联连线",
    inputSchema: z.object({ refs: z.array(nodeRefSchema).describe("要删除的节点引用数组") }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "destructive",
    capabilities: ["project", "references", "history", "effects", "delete", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "atomic",
    persistence: "project",
  }),
  defineTool({
    name: "delete_selected_nodes",
    description: "删除当前所有选中的节点",
    inputSchema: z.object({}),
    effect: { project: "mutate", selection: "read", external: "none" },
    risk: "destructive",
    capabilities: ["project", "selection", "history", "effects", "delete", "settings"],
    projectReferences: { reads: false, allocates: false },
    cancellation: "none",
    transaction: "atomic",
    persistence: "project",
  }),
  defineTool({
    name: "delete_all_nodes",
    description: "删除舞台上所有的节点和连线（清空舞台）",
    inputSchema: z.object({}),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "destructive",
    capabilities: ["project", "history", "effects", "delete", "settings"],
    projectReferences: { reads: false, allocates: false },
    cancellation: "none",
    transaction: "non-transactional",
    persistence: "project",
  }),
  defineTool({
    name: "edit_text_node",
    description: "编辑 TextNode 的内容、颜色和尺寸。此工具不会移动节点。",
    inputSchema: z.object({
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
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "text", "dom", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "rollback-on-error",
    persistence: "project",
  }),
  defineTool({
    name: "edit_image_node",
    description: "编辑 ImageNode 的显示尺寸和背景状态。图片始终保持原始宽高比；此工具不会移动节点。",
    inputSchema: z.object({
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
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "attachments", "image", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "rollback-on-error",
    persistence: "project",
  }),
  defineTool({
    name: "auto_layout_dag",
    description:
      "将同一分组层级中已经通过有向连线连接的普通节点，按从左到右的 DAG 分层方式整体布局。创建并连线完成后调用一次；不能用于 Section、孤立节点或有环图。",
    inputSchema: z.object({ refs: z.array(nodeRefSchema).min(2).describe("需要整体布局的节点项目级引用") }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "effects", "graph", "layout", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "non-transactional",
    persistence: "project",
  }),
  defineTool({
    name: "create_text_node",
    description: "创建 TextNode。节点会插入到当前视野中心；完成连线后使用 auto_layout_dag 整体整理，不要尝试提供坐标。",
    inputSchema: z.object({
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
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "dom", "settings", "viewport"],
    projectReferences: { reads: false, allocates: true },
    cancellation: "none",
    transaction: "non-transactional",
    persistence: "project-and-references",
  }),
  defineTool({
    name: "generate_node_tree_by_text",
    description: "根据纯文本缩进结构生成树状节点",
    inputSchema: z.object({
      text: z
        .string()
        .describe("包含缩进结构的文本，每一层缩进2个空格，例如：'root\\n  child1\\n  child2\\n    grandchild'"),
    }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "history", "effects", "graph", "tree-import", "dom", "settings", "viewport"],
    projectReferences: { reads: false, allocates: false },
    cancellation: "none",
    transaction: "non-transactional",
    persistence: "project",
  }),
  defineTool({
    name: "expand_node_tree_from_node",
    description: "从指定节点开始进行树形扩展，传入一个节点引用和缩进文本，在该节点下生成树状子节点",
    inputSchema: z.object({
      ref: nodeRefSchema.describe("根节点引用"),
      text: z.string().describe("包含缩进结构的文本，每一层缩进2个空格，例如：'child1\\n  grandchild\\nchild2'"),
    }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "effects", "graph", "tree-import", "dom", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "non-transactional",
    persistence: "project",
  }),
  defineTool({
    name: "search_text_nodes_by_regex",
    description: "根据正则表达式搜索文本节点",
    inputSchema: z.object({ regex: z.string().describe("正则表达式字符串") }),
    effect: { project: "read", selection: "none", external: "none" },
    risk: "none",
    capabilities: ["project", "references"],
    projectReferences: { reads: false, allocates: true },
    cancellation: "none",
    transaction: "none",
    persistence: "project-references",
  }),
  defineTool({
    name: "get_children",
    description: "通过项目级引用获取一个节点的所有第一层子节点（基于连接关系）",
    inputSchema: z.object({ ref: nodeRefSchema }),
    effect: { project: "read", selection: "none", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "graph"],
    projectReferences: { reads: true, allocates: true },
    cancellation: "none",
    transaction: "none",
    persistence: "project-references",
  }),
  defineTool({
    name: "get_parents",
    description: "通过项目级引用获取一个节点的所有父级节点（基于连接关系）",
    inputSchema: z.object({ ref: nodeRefSchema }),
    effect: { project: "read", selection: "none", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "graph"],
    projectReferences: { reads: true, allocates: true },
    cancellation: "none",
    transaction: "none",
    persistence: "project-references",
  }),
  defineTool({
    name: "batch_change_color",
    description: "批量给物体更改颜色",
    inputSchema: z.object({
      refs: z.array(objectRefSchema).describe("对象引用数组"),
      color: z.array(z.number()).describe("[R,G,B,A]，RGB为0~255，A为0~1"),
    }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "partial-success",
    persistence: "project",
  }),
  defineTool({
    name: "get_object_details",
    description: "通过项目级引用数组获取对象的模型可读详细信息",
    inputSchema: z.object({ refs: z.array(objectRefSchema).describe("对象引用数组") }),
    effect: { project: "read", selection: "none", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "image"],
    projectReferences: { reads: true, allocates: true },
    cancellation: "none",
    transaction: "none",
    persistence: "project-references",
  }),
  defineTool({
    name: "check_connections",
    description: "检查节点是否是通过Edge直接连接的",
    inputSchema: z.object({
      pairs: z.array(z.array(nodeRefSchema).length(2)).describe("节点引用对数组，例如[[n1,n2],[n3,n4]]"),
    }),
    effect: { project: "read", selection: "none", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "graph"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "none",
    persistence: "none",
  }),
  defineTool({
    name: "create_edges",
    description: "创建一些连线连接多个物体",
    inputSchema: z.object({
      edges: z.array(
        z.object({
          sourceRef: nodeRefSchema,
          targetRef: nodeRefSchema,
          text: z.string().optional().default(""),
        }),
      ),
    }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "node-connect", "settings"],
    projectReferences: { reads: true, allocates: true },
    cancellation: "none",
    transaction: "partial-success",
    persistence: "project-and-references",
  }),
  defineTool({
    name: "change_edge_text",
    description: "更改连线上的文字",
    inputSchema: z.object({ edgeRef: edgeRefSchema, text: z.string() }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "non-transactional",
    persistence: "project",
  }),
  defineTool({
    name: "select_objects",
    description: "通过项目级引用选中一些舞台对象",
    inputSchema: z.object({
      refs: z.array(objectRefSchema).describe("要选中的对象引用数组"),
      clearOthers: z.boolean().optional().default(false).describe("是否清除其他对象的选中状态"),
    }),
    effect: { project: "read", selection: "mutate", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "selection", "history", "settings"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "partial-success",
    persistence: "none",
  }),
  defineTool({
    name: "get_selected_nodes",
    description: "获取用户当前所有选中对象的详细信息和项目级引用",
    inputSchema: z.object({}),
    effect: { project: "read", selection: "read", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "selection"],
    projectReferences: { reads: false, allocates: true },
    cancellation: "none",
    transaction: "none",
    persistence: "project-references",
  }),
  defineTool({
    name: "get_nodes_in_viewport",
    description: "获取当前视野范围中被完全覆盖住的节点",
    inputSchema: z.object({}),
    effect: { project: "read", selection: "none", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "viewport"],
    projectReferences: { reads: false, allocates: true },
    cancellation: "none",
    transaction: "none",
    persistence: "project-references",
  }),
  defineTool({
    name: "get_selected_refs",
    description: "获取用户当前所有选中对象的项目级引用",
    inputSchema: z.object({}),
    effect: { project: "read", selection: "read", external: "none" },
    risk: "none",
    capabilities: ["project", "references", "selection"],
    projectReferences: { reads: false, allocates: true },
    cancellation: "none",
    transaction: "none",
    persistence: "project-references",
  }),
  defineTool({
    name: "breadth_expand_node",
    description: "广度扩展一个节点，传入一个节点引用和字符串数组，自动添加一层子节点",
    inputSchema: z.object({
      ref: nodeRefSchema.describe("源节点引用"),
      texts: z.array(z.string()).describe("要添加的子节点文本数组"),
    }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "effects", "node-connect", "dom", "settings"],
    projectReferences: { reads: true, allocates: true },
    cancellation: "none",
    transaction: "partial-success",
    persistence: "project-and-references",
  }),
  defineTool({
    name: "depth_expand_node",
    description: "深度扩展一个节点，传入一个节点引用作为根节点，根据字符串数组扩展出链式结构",
    inputSchema: z.object({
      ref: nodeRefSchema.describe("根节点引用"),
      texts: z.array(z.string()).describe("要添加的链式节点文本数组"),
    }),
    effect: { project: "mutate", selection: "none", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "references", "history", "effects", "node-connect", "dom", "settings"],
    projectReferences: { reads: true, allocates: true },
    cancellation: "none",
    transaction: "partial-success",
    persistence: "project-and-references",
  }),
  defineTool({
    name: "sort_selected_nodes_by_y",
    description:
      "对选中的所有文本节点按照从上到下的顺序重新排列位置（y轴方向）。AI调用前需先用get_selected_nodes获取当前选中节点信息，按y坐标从小到大排列得到current_order，再根据用户期望得到desired_order。",
    inputSchema: z.object({
      current_order: z.array(z.string()).describe("当前选中文本节点的文本内容数组，按y坐标从上到下（从小到大）排列"),
      desired_order: z
        .array(z.string())
        .describe("期望排列的文本内容顺序数组，从上到下，必须与current_order包含完全相同的元素"),
    }),
    effect: { project: "mutate", selection: "read", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "selection", "history", "effects", "dom", "settings"],
    projectReferences: { reads: false, allocates: false },
    cancellation: "none",
    transaction: "non-transactional",
    persistence: "project",
  }),
  defineTool({
    name: "sort_selected_nodes_by_x",
    description:
      "对选中的所有文本节点按照从左到右的顺序重新排列位置（x轴方向）。AI调用前需先用get_selected_nodes获取当前选中节点信息，按x坐标从小到大排列得到current_order，再根据用户期望得到desired_order。",
    inputSchema: z.object({
      current_order: z.array(z.string()).describe("当前选中文本节点的文本内容数组，按x坐标从左到右（从小到大）排列"),
      desired_order: z
        .array(z.string())
        .describe("期望排列的文本内容顺序数组，从左到右，必须与current_order包含完全相同的元素"),
    }),
    effect: { project: "mutate", selection: "read", external: "none" },
    risk: "project-mutation",
    capabilities: ["project", "selection", "history", "effects", "dom", "settings"],
    projectReferences: { reads: false, allocates: false },
    cancellation: "none",
    transaction: "non-transactional",
    persistence: "project",
  }),
  defineTool({
    name: "search_and_add_image_node",
    description:
      "从 Openverse 搜索开放授权的网络图片，下载后在当前视野中心创建 ImageNode。完成连线后使用 auto_layout_dag 整体整理；工具不返回图片 URL、附件 ID 或坐标。",
    inputSchema: z.object({
      query: z.string().min(1).max(400).describe("图片搜索关键词，建议包含主体、场景和风格"),
      preferredOrientation: z
        .union([z.literal("square"), z.literal("landscape"), z.literal("portrait")])
        .optional()
        .describe("偏好的图片方向，不填写时使用搜索相关度最高的结果"),
      maxDisplaySize: z.number().min(128).max(1600).optional().describe("图片节点最长边的最大画布显示尺寸，默认480"),
    }),
    effect: { project: "mutate", selection: "none", external: "network" },
    risk: "external-communication",
    capabilities: [
      "project",
      "references",
      "history",
      "dom",
      "settings",
      "image",
      "network",
      "viewport",
      "abort-signal",
    ],
    projectReferences: { reads: false, allocates: true },
    cancellation: "cooperative",
    transaction: "non-transactional",
    persistence: "project-and-references",
  }),
  defineTool({
    name: "recognize_image",
    description:
      "识别指定节点中的图片内容并返回文字描述。传入ImageNode引用或包含图片的Section引用，并用prompt描述识别目标。",
    inputSchema: z.object({
      ref: nodeRefSchema.describe("ImageNode引用，或包含图片的Section引用"),
      prompt: z
        .string()
        .describe('向图像识别模型提问的提示词，例如"这张图片里有哪些文字？"或"描述图片中的主要物体和场景"。'),
    }),
    effect: { project: "read", selection: "none", external: "model" },
    risk: "external-communication",
    capabilities: ["project", "references", "attachments", "dom", "settings", "image", "network", "model"],
    projectReferences: { reads: true, allocates: false },
    cancellation: "none",
    transaction: "none",
    persistence: "none",
  }),
];

export const builtInToolCatalog: readonly BuiltInToolDefinition[] = Object.freeze(
  definitions.map((definition) => deepFreeze(definition)),
);

const builtInToolsByName = new Map(builtInToolCatalog.map((definition) => [definition.name, definition]));

export function getBuiltInToolDefinition(name: string): BuiltInToolDefinition | undefined {
  return builtInToolsByName.get(name);
}

export type BuiltInToolProjectContext = "closed-capable" | "live-selection" | "live-viewport";

export function classifyBuiltInToolProjectContext(definition: BuiltInToolDefinition): BuiltInToolProjectContext {
  if (definition.capabilities.includes("selection")) return "live-selection";
  if (definition.capabilities.includes("viewport")) return "live-viewport";
  return "closed-capable";
}

export async function invokeBuiltInTool(
  name: string,
  input: unknown,
  host: BuiltInToolRuntimeHost,
  context: BuiltInToolExecutionContext = {},
): Promise<any> {
  const definition = getBuiltInToolDefinition(name);
  if (!definition) throw new Error(`Unknown built-in tool: ${name}`);
  const parsedInput = definition.inputSchema.parse(input);
  const executionContext = definition.capabilities.includes("abort-signal") ? context : {};
  const acquired = await host.acquireCapabilities(definition.capabilities, executionContext);
  for (const capability of Object.keys(acquired) as BuiltInToolCapability[]) {
    if (!definition.capabilities.includes(capability)) {
      throw new Error(`Runtime host acquired undeclared capability: ${capability}`);
    }
  }
  for (const capability of definition.capabilities) {
    if (!Object.hasOwn(acquired, capability)) {
      throw new Error(`Runtime host did not acquire required capability: ${capability}`);
    }
  }
  if (!acquired.project) throw new Error("Runtime host did not provide the Project capability");
  if (definition.capabilities.includes("references") && !acquired.references) {
    throw new Error("Runtime host did not provide the Project Object Reference capability");
  }
  const executor = await definition.loadExecutor();
  if (host.beforeExecutorInvoke) await host.beforeExecutorInvoke();
  return executor(acquired.project, parsedInput, acquired.references as AIObjectReferenceRegistry, executionContext);
}
