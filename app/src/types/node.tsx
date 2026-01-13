import { Project } from "@/core/Project";

// version 在 StageDumper里
export namespace Serialized {
  export type Vector = [number, number];
  export type Color = [number, number, number, number];

  export type StageObject = {
    uuid: string;
    type: string;
  };

  export type Entity = StageObject & {
    location: Vector;
    details: string;
  };
  /**
   * 调整大小的模式
   * auto：自动缩紧
   * manual：手动调整宽度，高度自动撑开。
   */
  export type TextNodeSizeAdjust = "auto" | "manual";
  export type TextNode = Entity & {
    type: "core:text_node";
    size: Vector;
    text: string;
    color: Color;
    sizeAdjust: TextNodeSizeAdjust;
  };

  export function isTextNode(obj: StageObject): obj is TextNode {
    return obj.type === "core:text_node";
  }

  export type Section = Entity & {
    type: "core:section";
    size: Vector;
    text: string;
    color: Color;

    children: string[]; // uuid[]
    isHidden: boolean;
    isCollapsed: boolean;
  };

  export function isSection(obj: StageObject): obj is Section {
    return obj.type === "core:section";
  }

  export type ConnectPoint = Entity & {
    type: "core:connect_point";
  };
  export function isConnectPoint(obj: StageObject): obj is ConnectPoint {
    return obj.type === "core:connect_point";
  }
  export type ImageNode = Entity & {
    path: string;
    size: Vector;
    scale: number;
    type: "core:image_node";
  };
  export function isImageNode(obj: StageObject): obj is ImageNode {
    return obj.type === "core:image_node";
  }
  export type UrlNode = Entity & {
    url: string;
    title: string;
    size: Vector;
    color: Color;
    type: "core:url_node";
  };
  export function isUrlNode(obj: StageObject): obj is UrlNode {
    return obj.type === "core:url_node";
  }
  export type PortalNode = Entity & {
    // 连接的文件
    portalFilePath: string;
    targetLocation: Vector;
    cameraScale: number;
    // 显示的可更改标题
    title: string;
    // 传送门的大小
    size: Vector;
    // 颜色
    color: Color;
    type: "core:portal_node";
  };
  export function isPortalNode(obj: StageObject): obj is PortalNode {
    return obj.type === "core:portal_node";
  }
  export type PenStroke = Entity & {
    type: "core:pen_stroke";
    content: string;
    color: Color;
  };
  export function isPenStroke(obj: StageObject): obj is PenStroke {
    return obj.type === "core:pen_stroke";
  }
  export type SvgNode = Entity & {
    type: "core:svg_node";
    content: string;
    size: Vector;
    color: Color;
    scale: number;
  };
  export function isSvgNode(obj: StageObject): obj is SvgNode {
    return obj.type === "core:svg_node";
  }
  export type DiamondNode = Entity & {
    type: "core:diamond_node";
    size: Vector;
    text: string;
    color: Color;
    sizeAdjust: TextNodeSizeAdjust;
  };
  export function isDiamondNode(obj: StageObject): obj is DiamondNode {
    return obj.type === "core:diamond_node";
  }
  export type CircleNode = Entity & {
    type: "core:circle_node";
    radius: number;
    text: string;
    color: Color;
    sizeAdjust: TextNodeSizeAdjust;
  };
  export function isCircleNode(obj: StageObject): obj is CircleNode {
    return obj.type === "core:circle_node";
  }
  // export type Edge = StageObject & {
  //   type: "core:edge";
  //   source: string;
  //   target: string;
  //   text: string;
  // };
  export type Association = StageObject & {
    text: string;
    color: Color;
  };

  /**
   * 无向边的箭头类型
   * inner：--> xxx <--
   * outer：<-- xxx -->
   * none： --- xxx ---
   */
  export type UndirectedEdgeArrowType = "inner" | "outer" | "none";
  /**
   * 无向边的渲染方式
   * line：内部连线式渲染
   * convex：凸包连线式渲染
   */
  export type MultiTargetUndirectedEdgeRenderType = "line" | "convex";
  export type MultiTargetUndirectedEdge = Association & {
    type: "core:multi_target_undirected_edge";
    targets: string[];
    arrow: UndirectedEdgeArrowType;
    rectRates: [number, number][]; // 默认中心 0.5, 0.5
    centerRate: [number, number]; // 默认中心 0.5, 0.5
    padding: number;
    renderType: MultiTargetUndirectedEdgeRenderType;
  };
  export function isMultiTargetUndirectedEdge(obj: StageObject): obj is MultiTargetUndirectedEdge {
    return obj.type === "core:multi_target_undirected_edge";
  }
  export type Edge = Association & {
    source: string;
    target: string;
    sourceRectRate: [number, number]; // 默认中心 0.5, 0.5
    targetRectRate: [number, number]; // 默认中心 0.5, 0.5
  };
  export function isEdge(obj: StageObject): obj is Edge {
    return "source" in obj && "target" in obj;
  }
  export type LineEdge = Edge & {
    type: "core:line_edge";
    color: Color;
    text: string;
  };
  export function isLineEdge(obj: StageObject): obj is LineEdge {
    return obj.type === "core:line_edge";
  }
  export function isCubicCatmullRomSplineEdge(obj: StageObject): obj is CubicCatmullRomSplineEdge {
    return obj.type === "core:cublic_catmull_rom_spline_edge";
  }
  export type CubicCatmullRomSplineEdge = Edge & {
    type: "core:cublic_catmull_rom_spline_edge";
    text: string;
    controlPoints: Vector[];
    alpha: number;
    tension: number;
  };

  export type CoreEntity =
    | TextNode
    | Section
    | ConnectPoint
    | ImageNode
    | UrlNode
    | PenStroke
    | PortalNode
    | SvgNode
    | DiamondNode
    | CircleNode;
  export function isCoreEntity(obj: StageObject): obj is CoreEntity {
    return obj.type.startsWith("core:");
  }
  export type CoreAssociation = LineEdge | CubicCatmullRomSplineEdge | MultiTargetUndirectedEdge;

  export type File = {
    version: typeof Project.latestVersion;
    entities: CoreEntity[];
    associations: CoreAssociation[];
    tags: string[];
  };
}
