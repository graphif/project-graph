import { Project } from "@/core/Project";
import { Button } from "@/components/ui/button";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { SubWindow } from "@/core/service/SubWindow";
import { LatexNode } from "@/core/stage/stageObject/entity/LatexNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo, useState } from "react";

/**
 * LaTeX 公式节点编辑窗口
 *
 * 上方实时显示公式渲染效果，下方输入 LaTeX 代码
 */
function LatexEditWindowContent({
  initialLatex,
  onConfirm,
}: {
  initialLatex: string;
  onConfirm: (latex: string) => void;
}) {
  const [latex, setLatex] = useState(initialLatex);

  const previewHtml = useMemo(() => {
    try {
      return katex.renderToString(latex || "\\text{请在下方输入 LaTeX 代码}", {
        throwOnError: false,
        displayMode: true,
        errorColor: "#cc0000",
        output: "htmlAndMathml",
      });
    } catch {
      return '<span style="color: red">渲染错误</span>';
    }
  }, [latex]);

  return (
    <div className="flex flex-col gap-3 p-3" style={{ width: "360px" }}>
      {/* 上方：公式预览区域 */}
      <div
        className="flex min-h-14 items-center justify-center overflow-auto rounded border p-3"
        style={{
          background: "var(--background, #fff)",
          borderColor: "var(--border, #e2e8f0)",
        }}
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

      {/* 下方：LaTeX 代码输入框 */}
      <textarea
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        className="rounded border p-2 font-mono text-sm"
        style={{
          resize: "vertical",
          minHeight: "80px",
          background: "var(--background, #fff)",
          borderColor: "var(--border, #e2e8f0)",
          color: "var(--foreground, #000)",
          outline: "none",
        }}
        rows={3}
        // autoFocus
        placeholder="输入 LaTeX 代码，例如：E=mc^2"
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter 确认
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            onConfirm(latex);
          }
        }}
      />

      {/* 操作按钮 */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs opacity-50">Ctrl+Enter 确认</span>
        <Button size="sm" onClick={() => onConfirm(latex)}>
          确认
        </Button>
      </div>
    </div>
  );
}

/**
 * 打开 LaTeX 编辑窗口（静态方法）
 */
LatexEditWindowContent.open = (project: Project, node: LatexNode) => {
  // 在节点上方或鼠标位置弹出
  const mousePos = MouseLocation.vector().clone();
  const win = SubWindow.create({
    title: "编辑 LaTeX 公式",
    rect: new Rectangle(mousePos, new Vector(360, 260)),
    closeWhenClickOutside: false,
    closable: true,
    children: null, // 先占位，下面再设置（避免循环引用）
  });

  // 重新设置 children，传入 winId 用于关闭
  const winId = win.id;
  SubWindow.update(winId, {
    children: (
      <LatexEditWindowContent
        initialLatex={node.latexSource}
        onConfirm={(newLatex: string) => {
          node.updateLatex(newLatex).then(() => {
            project.historyManager.recordStep();
          });
          SubWindow.close(winId);
        }}
      />
    ),
  });
};

export default LatexEditWindowContent;
