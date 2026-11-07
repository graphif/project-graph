export function fetch(...args: Parameters<typeof globalThis.fetch>): ReturnType<typeof globalThis.fetch> {
  return globalThis.fetch(...args);
}
