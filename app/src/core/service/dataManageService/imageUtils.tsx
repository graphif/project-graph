import { Settings } from "@/core/service/Settings";

export function applyBlackAndWhite(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const threshold = Settings.blackAndWhiteThreshold;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (threshold <= 0) {
      data[i] = data[i + 1] = data[i + 2] = gray;
    } else if (threshold >= 1) {
      const binary = gray > 128 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = binary;
    } else {
      const binary = gray > 128 ? 255 : 0;
      const blended = Math.round(gray * (1 - threshold) + binary * threshold);
      data[i] = data[i + 1] = data[i + 2] = blended;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}

export async function blobToCompressedDataUrl(blob: Blob, maxSize: number): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (width === 0 || height === 0) {
      throw new Error("图片尺寸无效（可能为无内禀尺寸的 SVG）");
    }
    const maxDim = Math.max(width, height);
    if (maxDim > maxSize) {
      const scale = maxSize / maxDim;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法获取 canvas 2d 上下文");
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const MAX_IMPORT_IMAGE_DIMENSION = 16_384;
const MAX_IMPORT_IMAGE_PIXELS = 64 * 1024 * 1024;

export type PreparedImageBlob = {
  blob: Blob;
  width: number;
  height: number;
};

export async function prepareImageBlobForImport(blob: Blob): Promise<PreparedImageBlob> {
  const bitmap = await createImageBitmap(blob);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    sourceWidth > MAX_IMPORT_IMAGE_DIMENSION ||
    sourceHeight > MAX_IMPORT_IMAGE_DIMENSION ||
    sourceWidth * sourceHeight > MAX_IMPORT_IMAGE_PIXELS
  ) {
    bitmap.close();
    throw new Error(`图片尺寸不受支持: ${sourceWidth}×${sourceHeight}`);
  }

  let width = sourceWidth;
  let height = sourceHeight;
  if (Settings.resizePastedImages) {
    const maxDimension = Math.max(width, height);
    if (maxDimension > Settings.maxPastedImageSize) {
      const scale = Settings.maxPastedImageSize / maxDimension;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }
  }

  const needsCanvas =
    width !== sourceWidth ||
    height !== sourceHeight ||
    Settings.compressImageToBlackAndWhite ||
    Settings.compressImageToWebp;
  if (!needsCanvas) {
    bitmap.close();
    return { blob, width, height };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("无法获取 Canvas 2D 上下文");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  if (Settings.compressImageToBlackAndWhite) applyBlackAndWhite(canvas);
  const outputType = Settings.compressImageToBlackAndWhite
    ? "image/png"
    : Settings.compressImageToWebp
      ? "image/webp"
      : blob.type;
  const quality = outputType === "image/webp" ? Settings.webpQuality : undefined;
  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("图片编码失败"))), outputType, quality);
  });

  return { blob: outputBlob, width, height };
}
