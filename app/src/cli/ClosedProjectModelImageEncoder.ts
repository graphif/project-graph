import { Buffer } from "node:buffer";
import sharp from "sharp";

export async function encodeModelImageDataUrl(blob: Blob, maxSize: number): Promise<string> {
  const input = Buffer.from(await blob.arrayBuffer());
  const png = await sharp(input)
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
