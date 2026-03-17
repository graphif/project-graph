// Canvas.tsx
import { APP } from "@/APP";
import { useRef, useEffect } from "react";
import { Canvas as CanvasObj } from "@/core.compontents/Canvas";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const app = APP.getInstance();

  useEffect(() => {
    console.log("Canvas useEffect 执行");

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 先设置尺寸
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width;
      canvas.height = height;

      console.log("Canvas 尺寸更新:", width, height);

      // 尺寸更新后重新渲染
      const canvasInstance = app.canvases.at(0);
      if (canvasInstance) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvasInstance.renderOnce(ctx);
        }
      }
    };

    // 创建 Canvas 实例并设置 canvasElement
    const canvasInstance = new CanvasObj(canvas);
    app.canvases.push(canvasInstance);

    // 初始尺寸设置
    updateSize();

    // 添加事件监听
    const canvasMouseListener = canvasInstance;
    canvas.addEventListener("mousedown", canvasMouseListener.onDown);
    canvas.addEventListener("mouseup", canvasMouseListener.onUp);
    canvas.addEventListener("mousemove", canvasMouseListener.onMove);
    canvas.addEventListener("mouseenter", canvasMouseListener.onEnter);
    canvas.addEventListener("mouseleave", canvasMouseListener.onLeave);

    // 监听窗口大小变化
    window.addEventListener("resize", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
      canvas.removeEventListener("mousedown", canvasMouseListener.onDown);
      canvas.removeEventListener("mouseup", canvasMouseListener.onUp);
      canvas.removeEventListener("mousemove", canvasMouseListener.onMove);
      canvas.removeEventListener("mouseenter", canvasMouseListener.onEnter);
      canvas.removeEventListener("mouseleave", canvasMouseListener.onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "100vh",
        backgroundColor: "#1a1a1a",
      }}
    />
  );
}
