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
