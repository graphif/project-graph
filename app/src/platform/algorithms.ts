import { isMyGo } from "mygo-runtime";
import { Algorithms as MyGoAlgorithms } from "@/generated/mygo";
import type { LayoutDAGRequest, LayoutDAGResponse } from "@/generated/mygo";

export type DAGLayoutTransport = (request: LayoutDAGRequest) => Promise<LayoutDAGResponse>;

let companionTransport: DAGLayoutTransport | null = null;

/**
 * 独立 CLI 没有 MyGo 宿主，由装配层注入 Go companion 传输，
 * 让 CLI 与桌面端调用同一个纯算法包，而不是维护两套实现。
 */
export function registerDAGLayoutCompanion(transport: DAGLayoutTransport): void {
  companionTransport = transport;
}

export async function requestDAGLayout(request: LayoutDAGRequest): Promise<LayoutDAGResponse> {
  if (isMyGo()) return MyGoAlgorithms.layoutDAG(request);
  if (companionTransport) return companionTransport(request);
  throw new Error("DAG布局需要MyGo桌面宿主或Go companion助手。");
}
