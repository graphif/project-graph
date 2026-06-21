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
