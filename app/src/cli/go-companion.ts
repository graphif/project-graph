import { spawn } from "node:child_process";
import type { LayoutDAGRequest, LayoutDAGResponse } from "@/generated/mygo";
import { helperCommand } from "./helper-command";

/**
 * Go companion 与所有权助手是同一个可执行文件：开发环境指向 Go 源码，
 * 发布环境指向随 CLI 一起分发的二进制。
 */
export function goCompanionPath(): string {
  const path = process.env.PROJECT_GRAPH_GO_COMPANION_PATH ?? process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH;
  if (!path) throw new Error("Go companion helper is unavailable.");
  return path;
}

/**
 * 独立 CLI 没有 MyGo 宿主，通过 companion 的 layout-dag 子命令调用同一个纯算法包。
 */
export async function callGoCompanionDAGLayout(request: LayoutDAGRequest): Promise<LayoutDAGResponse> {
  const invocation = helperCommand(goCompanionPath(), ["layout-dag"]);
  const child = spawn(invocation.command, invocation.args, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const exited = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code));
  });
  child.stdin.end(JSON.stringify(request));
  const code = await exited;
  if (code !== 0) {
    throw new Error(stderr.trim() || "Go companion helper failed.");
  }
  const newline = stdout.indexOf("\n");
  const payload = newline === -1 ? stdout : stdout.slice(0, newline);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("Go companion helper returned an invalid response.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Go companion helper returned an invalid response.");
  }
  return parsed as LayoutDAGResponse;
}
