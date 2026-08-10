type RuntimeError = {
  code: string;
  message: string;
  details?: unknown;
};

type RuntimeResult = { ok: true; value: unknown } | { ok: false; error: RuntimeError };

type RuntimeCleanupFailure = {
  ok: false;
  error: {
    code: "RUNTIME_CLEANUP_FAILED";
    message: "Project Runtime Host cleanup failed.";
    details?: { executionError: RuntimeError };
  };
};

export class RuntimeCleanupError extends Error {}

export async function finalizeRuntimeCleanup<T extends RuntimeResult>(
  result: T,
  cleanupTasks: readonly (() => void | Promise<void>)[],
): Promise<T | RuntimeCleanupFailure> {
  let cleanupFailed = false;
  for (const cleanup of cleanupTasks) {
    try {
      await cleanup();
    } catch {
      cleanupFailed = true;
    }
  }
  if (!cleanupFailed) return result;
  return {
    ok: false,
    error: {
      code: "RUNTIME_CLEANUP_FAILED",
      message: "Project Runtime Host cleanup failed.",
      ...(!result.ok ? { details: { executionError: result.error } } : {}),
    },
  };
}
