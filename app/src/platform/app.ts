import { isMyGo, runtime } from "mygo-runtime";

export async function getVersion(): Promise<string> {
  if (isMyGo()) {
    const version = runtime().version;
    if (!version || version === "0.0.0") throw new Error("MyGo application version is missing.");
    return version;
  }
  throw new Error("Desktop host missing: no application version is available.");
}
