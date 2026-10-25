import { Files, type DirectoryEntry } from "@/generated/mygo";

export type { DirectoryEntry } from "@/generated/mygo";
export type DirEntry = DirectoryEntry;

export function decodeBytes(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
export function encodeBytes(value: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += 8192)
    chunks.push(String.fromCharCode(...value.subarray(offset, offset + 8192)));
  return btoa(chunks.join(""));
}
export async function readFile(path: string) {
  return decodeBytes(await Files.read(path));
}
export async function writeFile(path: string, content: Uint8Array) {
  await Files.write(path, encodeBytes(content));
}
export const readDir = Files.readDir;
export const exists = Files.exists;
export const rename = Files.rename;
export const remove = Files.remove;
export function mkdir(path: string, options: { recursive?: boolean } = {}) {
  return Files.mkdir(path, options.recursive ?? false);
}
export async function stat(path: string) {
  const info = await Files.stat(path, true);
  return { ...info, mtime: new Date(info.mtime) };
}
export async function lstat(path: string) {
  const info = await Files.stat(path, false);
  return { ...info, mtime: new Date(info.mtime) };
}
