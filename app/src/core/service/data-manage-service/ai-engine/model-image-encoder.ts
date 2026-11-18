function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}

export async function encodeModelImageDataUrl(blob: Blob, maxSize: number): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    if (width === 0 || height === 0) {
      throw new Error("图片尺寸无效（可能为无内禀尺寸的 SVG）");
    }
    const maxDimension = Math.max(width, height);
    if (maxDimension > maxSize) {
      const scale = maxSize / maxDimension;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法获取 canvas 2d 上下文");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
