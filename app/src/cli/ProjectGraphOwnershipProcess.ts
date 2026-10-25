import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";

export async function releaseProjectOwnership(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, "close");
  child.kill();
  await closed;
}

export function isProjectOwned(helperPath: string, projectPath: string, ownershipDirectory: string): boolean {
  const result = spawnSync(helperPath, ["try-hold-project", projectPath], {
    env: { ...process.env, PROJECT_GRAPH_OWNERSHIP_DIRECTORY: ownershipDirectory },
    encoding: "utf8",
    input: "",
    timeout: 5000,
  });
  if (result.error) throw result.error;
  const response = JSON.parse(result.stdout);
  if (result.status === 75 && response.status === "busy") return true;
  if (result.status === 0 && response.status === "acquired") return false;
  throw new Error(`Ownership probe failed (${result.status}): ${result.stderr}${result.stdout}`);
}

export function holdProjectOwnership(
  helperPath: string,
  projectPath: string,
  ownershipDirectory: string,
  endpoint?: string,
): Promise<ChildProcessWithoutNullStreams> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      helperPath,
      endpoint ? ["hold-connectable-project", projectPath, endpoint] : ["try-hold-project", projectPath],
      { env: { ...process.env, PROJECT_GRAPH_OWNERSHIP_DIRECTORY: ownershipDirectory }, stdio: "pipe" },
    );
    let output = "";
    let stderr = "";
    const fail = (error: Error) => {
      clearTimeout(timeout);
      child.kill();
      reject(error);
    };
    const timeout = setTimeout(() => fail(new Error(`Timed out acquiring Project: ${projectPath}`)), 5000);
    child.once("error", fail);
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Ownership helper exited (${code ?? signal}): ${stderr}${output}`));
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const newline = output.indexOf("\n");
      if (newline === -1) return;
      try {
        const response = JSON.parse(output.slice(0, newline));
        if (response.status !== "acquired") throw new Error(`Ownership acquisition failed: ${output}`);
        clearTimeout(timeout);
        resolve(child);
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}
