import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export type OwnershipHelperCliError =
  | {
      code: "OWNERSHIP_HELPER_UNAVAILABLE" | "OWNERSHIP_HELPER_INVALID_RESPONSE" | "OWNERSHIP_HELPER_FAILED";
      message: string;
    }
  | { code: "PROJECT_NOT_FOUND" | "PROJECT_LOAD_FAILED"; message: string };

export type ProjectOwner = { kind: "connectable"; endpoint: string } | { kind: "unconnectable_holder" };

export class OwnershipHelperError extends Error {
  readonly name = "OwnershipHelperError";

  constructor(readonly cliError: OwnershipHelperCliError) {
    super(cliError.message);
  }
}

export class OwnershipHelperLease {
  readonly exit: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  private released = false;

  constructor(private readonly child: ChildProcessWithoutNullStreams) {
    this.exit = waitForExit(child);
  }

  async release(): Promise<void> {
    if (this.released) return;
    if (this.child.exitCode !== null || this.child.signalCode !== null) throw helperProcessFailure(this.child);
    this.released = true;
    this.child.stdin.end();
    const exit = await this.exit;
    const protocolError = helperProtocolErrors.get(this.child);
    if (protocolError) throw protocolError;
    if (exit.code !== 0) throw helperFailed();
  }

  terminate(): void {
    if (!this.released) this.child.kill();
  }
}

export type ProjectOwnershipAcquisition =
  | { status: "acquired"; canonicalPath: string; lease: OwnershipHelperLease }
  | { status: "busy"; owner: ProjectOwner };

function helperUnavailable(): OwnershipHelperError {
  return new OwnershipHelperError({
    code: "OWNERSHIP_HELPER_UNAVAILABLE",
    message: "Project ownership helper is unavailable.",
  });
}

function invalidHelperResponse(): OwnershipHelperError {
  return new OwnershipHelperError({
    code: "OWNERSHIP_HELPER_INVALID_RESPONSE",
    message: "Project ownership helper returned an invalid response.",
  });
}

function helperFailed(): OwnershipHelperError {
  return new OwnershipHelperError({
    code: "OWNERSHIP_HELPER_FAILED",
    message: "Project ownership helper failed.",
  });
}

const helperProtocolErrors = new WeakMap<ChildProcessWithoutNullStreams, OwnershipHelperError>();

function helperProcessFailure(child: ChildProcessWithoutNullStreams): OwnershipHelperError {
  return helperProtocolErrors.get(child) ?? helperFailed();
}

function rejectAdditionalOutput(child: ChildProcessWithoutNullStreams): void {
  const onData = () => {
    helperProtocolErrors.set(child, invalidHelperResponse());
    child.kill();
  };
  child.stdout.once("data", onData);
  child.once("close", () => child.stdout.off("data", onData));
}

function projectFailure(code: "PROJECT_NOT_FOUND" | "PROJECT_LOAD_FAILED"): OwnershipHelperError {
  return new OwnershipHelperError({
    code,
    message: code === "PROJECT_NOT_FOUND" ? "Project file was not found." : "Project file could not be loaded.",
  });
}

function ownershipHelperPath(): string {
  const path = process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH;
  if (!path) throw helperUnavailable();
  return path;
}

function waitForExit(
  child: ChildProcessWithoutNullStreams,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolve) => {
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

function readResponse(child: ChildProcessWithoutNullStreams, abortSignal?: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let output = "";
    const cleanup = () => {
      child.stdout.off("data", onData);
      child.off("error", onError);
      child.off("close", onClose);
      abortSignal?.removeEventListener("abort", onAbort);
    };
    const finish = (value: unknown) => {
      cleanup();
      rejectAdditionalOutput(child);
      resolve(value);
    };
    const fail = (error: OwnershipHelperError) => {
      cleanup();
      child.kill();
      reject(error);
    };
    const onData = (chunk: Buffer | string) => {
      output += chunk.toString();
      const newline = output.indexOf("\n");
      if (newline === -1) return;
      if (output.slice(newline + 1) !== "") return fail(invalidHelperResponse());
      try {
        finish(JSON.parse(output.slice(0, newline)));
      } catch {
        fail(invalidHelperResponse());
      }
    };
    const onError = () => fail(helperUnavailable());
    const onClose = () => fail(invalidHelperResponse());
    const onAbort = () => {
      cleanup();
      child.kill();
      reject(helperFailed());
    };
    child.stdout.on("data", onData);
    child.once("error", onError);
    child.once("close", onClose);
    abortSignal?.addEventListener("abort", onAbort, { once: true });
    if (abortSignal?.aborted) onAbort();
  });
}

async function requireExitCode(child: ChildProcessWithoutNullStreams, expectedCode: number): Promise<void> {
  child.stdin.end();
  const exit = await waitForExit(child);
  const protocolError = helperProtocolErrors.get(child);
  if (protocolError) throw protocolError;
  if (exit.code !== expectedCode || exit.signal !== null) throw invalidHelperResponse();
}

function isProjectOwner(value: unknown): value is ProjectOwner {
  if (!value || typeof value !== "object" || !("kind" in value)) return false;
  if (value.kind === "unconnectable_holder") return hasExactKeys(value, ["kind"]);
  return (
    value.kind === "connectable" &&
    "endpoint" in value &&
    typeof value.endpoint === "string" &&
    hasExactKeys(value, ["kind", "endpoint"])
  );
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && keys.every((key) => actualKeys.includes(key));
}

function normalizeWindowsVerbatimPath(path: string): string {
  if (path.startsWith("\\\\?\\UNC\\")) return `\\\\${path.slice(8)}`;
  return path.startsWith("\\\\?\\") ? path.slice(4) : path;
}

export async function acquireProjectOwnership(
  canonicalPath: string,
  abortSignal?: AbortSignal,
): Promise<ProjectOwnershipAcquisition> {
  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn(ownershipHelperPath(), ["try-hold-project", canonicalPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stderr.resume();
  } catch {
    throw helperUnavailable();
  }
  const response = await readResponse(child, abortSignal);
  if (!response || typeof response !== "object" || !("status" in response)) {
    child.kill();
    throw invalidHelperResponse();
  }
  if (
    response.status === "acquired" &&
    "canonicalPath" in response &&
    typeof response.canonicalPath === "string" &&
    normalizeWindowsVerbatimPath(response.canonicalPath) === normalizeWindowsVerbatimPath(canonicalPath) &&
    hasExactKeys(response, ["status", "canonicalPath"])
  ) {
    return { status: "acquired", canonicalPath, lease: new OwnershipHelperLease(child) };
  }
  if (
    response.status === "busy" &&
    "owner" in response &&
    isProjectOwner(response.owner) &&
    hasExactKeys(response, ["status", "owner"])
  ) {
    await requireExitCode(child, 75);
    return { status: "busy", owner: response.owner };
  }
  if (
    response.status === "error" &&
    "code" in response &&
    (response.code === "PROJECT_NOT_FOUND" || response.code === "PROJECT_LOAD_FAILED") &&
    hasExactKeys(response, ["status", "code"])
  ) {
    await requireExitCode(child, 1);
    throw projectFailure(response.code);
  }
  child.kill();
  throw invalidHelperResponse();
}

export async function acquireReferenceStoreLock(
  storePath: string,
  abortSignal?: AbortSignal,
): Promise<OwnershipHelperLease> {
  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn(ownershipHelperPath(), ["hold-reference-store", storePath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stderr.resume();
  } catch {
    throw helperUnavailable();
  }
  const response = await readResponse(child, abortSignal);
  if (
    response &&
    typeof response === "object" &&
    "status" in response &&
    response.status === "acquired" &&
    hasExactKeys(response, ["status"])
  ) {
    return new OwnershipHelperLease(child);
  }
  if (
    response &&
    typeof response === "object" &&
    "status" in response &&
    response.status === "error" &&
    "code" in response &&
    response.code === "REFERENCE_STORE_LOCK_FAILED" &&
    hasExactKeys(response, ["status", "code"])
  ) {
    await requireExitCode(child, 1);
    throw helperFailed();
  }
  child.kill();
  throw invalidHelperResponse();
}
