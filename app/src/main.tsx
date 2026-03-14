import "driver.js/dist/driver.css";
import { createRoot } from "react-dom/client";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";

const el = document.getElementById("root")!;

// 使用立即执行函数
(async () => {
  console.log("开始渲染..."); // 添加日志调试

  // 先创建 root
  const root = createRoot(el);

  // 立即渲染，不要等待
  root.render(<h1>Hello World</h1>);

  console.log("渲染完成，处理窗口...");

  // 加载完成了，显示窗口
  await getCurrentWindow().show();

  // 关闭splash
  const windows = await getAllWindows();
  const splash = windows.find((w) => w.label === "splash");
  if (splash) {
    await splash.close();
  }

  console.log("窗口处理完成");
})().catch(console.error);
