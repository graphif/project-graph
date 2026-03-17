import "driver.js/dist/driver.css";
import { createRoot } from "react-dom/client";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { Canvas } from "@/ui.components/Canvas";

const el = document.getElementById("root")!;

// 设置样式
Object.assign(document.documentElement.style, {
  height: "100vh",
  width: "100%",
  margin: "0",
  padding: "0",
});

Object.assign(document.body.style, {
  height: "100vh",
  width: "100%",
  margin: "0",
  padding: "0",
  overflow: "hidden",
});

Object.assign(el.style, {
  height: "100vh",
  width: "100%",
  margin: "0",
  padding: "0",
});

// 使用立即执行函数
(async () => {
  console.log("开始渲染...");

  // 清理可能的旧 root
  if ((window as any).__root) {
    (window as any).__root.unmount();
  }

  const root = createRoot(el);
  (window as any).__root = root;

  root.render(<Canvas />);

  setTimeout(async () => {
    try {
      await getCurrentWindow().show();
      const windows = await getAllWindows();
      const splash = windows.find((w) => w.label === "splash");
      if (splash) {
        await splash.close();
      }
      console.log("窗口处理完成");
    } catch (error) {
      console.error("窗口操作失败:", error);
    }
  }, 200);
})().catch(console.error);
