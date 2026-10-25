import { describe, expect, it, vi } from "vitest";
import { finalizeRuntimeCleanup } from "../core/RuntimeCleanup";

describe("Project Graph CLI Runtime cleanup", () => {
  it("runs every cleanup and preserves a simultaneous execution failure for diagnosis", async () => {
    const finalCleanup = vi.fn();
    const executionResult = {
      ok: false as const,
      error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
    };

    const result = await finalizeRuntimeCleanup(executionResult, [
      () => {
        throw new Error("service cleanup failed");
      },
      async () => {
        throw new Error("async cleanup failed");
      },
      finalCleanup,
    ]);

    expect(finalCleanup).toHaveBeenCalledOnce();
    expect(result).toEqual({
      ok: false,
      error: {
        code: "RUNTIME_CLEANUP_FAILED",
        message: "Project Runtime Host cleanup failed.",
        details: { executionError: executionResult.error },
      },
    });
  });

  it("returns the original result when every cleanup succeeds", async () => {
    const result = { ok: true as const, value: { objects: [] } };

    await expect(finalizeRuntimeCleanup(result, [async () => undefined])).resolves.toBe(result);
  });
});
