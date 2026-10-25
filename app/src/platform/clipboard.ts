import { Native } from "@/generated/mygo";
import { decodeBytes, encodeBytes } from "./files";

export const readText = Native.readText;
export const writeText = Native.writeText;
export async function writeImage(data: Uint8Array | ArrayBuffer) {
  await Native.writeImage(encodeBytes(new Uint8Array(data)));
}
export async function readImage(): Promise<Blob | null> {
  const bytes = await Native.readImage();
  return bytes ? new Blob([new Uint8Array(decodeBytes(bytes))], { type: "image/png" }) : null;
}
