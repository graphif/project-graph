import { JSDOM } from "jsdom";
import { finalizeRuntimeCleanup } from "../core/RuntimeCleanup";
import type { ClosedProjectInvocationResult } from "./ClosedProjectInvocation";

export async function runClosedProjectRuntime(
  execute: () => Promise<ClosedProjectInvocationResult>,
  cleanupTasks: readonly (() => void | Promise<void>)[] = [],
): Promise<ClosedProjectInvocationResult> {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({ measureText: (text: string) => ({ width: text.length * 50 }) }),
  });

  let result: ClosedProjectInvocationResult;
  try {
    result = await execute();
  } catch {
    result = {
      ok: false,
      error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
    };
  }
  return finalizeRuntimeCleanup(result, [
    ...cleanupTasks,
    () => dom.window.close(),
    () => Object.assign(globalThis, { window: previousWindow, document: previousDocument }),
  ]);
}
