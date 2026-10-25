import { dirname, resolve } from "node:path";

export function helperCommand(path: string, args: string[]) {
  if (!path.endsWith(".go")) return { command: path, args, development: false };
  return { command: "go", args: ["-C", resolve(dirname(path), "../.."), "run", path, ...args], development: true };
}
