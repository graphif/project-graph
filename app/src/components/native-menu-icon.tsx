import { Image as TauriImage } from "@tauri-apps/api/image";
import { AppWindow, Axe, Blocks, Bot, CircleAlert, File, Settings, View } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

const icons = {
  file: File,
  view: View,
  actions: Axe,
  settings: Settings,
  ai: Bot,
  window: AppWindow,
  extensions: Blocks,
  about: CircleAlert,
};

export type NativeMenuIconId = keyof typeof icons;

export async function nativeMenuIcon(id: keyof typeof icons, title: string) {
  const Icon = icons[id];
  const image = new window.Image();
  image.src = `data:image/svg+xml,${encodeURIComponent(renderToStaticMarkup(<Icon size={16} color="white" strokeWidth={2} />))}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot render the native menu icon");
  const font = "500 13px -apple-system, BlinkMacSystemFont, sans-serif";
  context.font = font;
  canvas.width = Math.ceil(22 + context.measureText(title).width) * 2;
  canvas.height = 36;
  context.scale(2, 2);
  context.font = font;
  context.fillStyle = "white";
  context.textBaseline = "middle";
  context.drawImage(image, 0, 1, 16, 16);
  context.fillText(title, 22, 9);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    image: await TauriImage.new(new Uint8Array(pixels.data.buffer), canvas.width, canvas.height),
    width: canvas.width / 2,
  };
}
