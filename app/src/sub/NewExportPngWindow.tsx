import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { GenerateScreenshot } from "@/core/service/dataGenerateService/generateScreenshot";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useAtom } from "jotai";
import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function NewExportPngWindow() {
  const [project] = useAtom(activeProjectAtom);
  if (!project) return <></>;

  const [maxDimension, setMaxDimension] = useState(1920);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 获取选中内容
      const selectedEntities = project.stageManager.getSelectedEntities();
      if (selectedEntities.length === 0) {
        toast.warning("没有选中任何内容");
        return;
      }

      // 保存原始选中状态
      const originalSelectedObjects = project.stageManager.getSelectedStageObjects().map((obj) => obj.uuid);

      // 获取外接矩形
      const targetRect: Rectangle = project.stageManager.getBoundingBoxOfSelected();

      // 清理选中状态，防止渲染时出现绿色框框
      project.stageManager.clearSelectAll();

      try {
        // 生成截图
        const blob = await GenerateScreenshot.generateFromActiveProject(project, targetRect, maxDimension);
        if (!blob) {
          toast.error("生成截图失败");
          return;
        }

        // 保存文件
        const path = await save({
          title: `导出为 PNG`,
          filters: [{ name: "Portable Network Graphics", extensions: ["png"] }],
        });
        if (!path) return;

        const arrayBuffer = await blob.arrayBuffer();
        const u8a = new Uint8Array(arrayBuffer);
        await writeFile(path, u8a);

        toast.success("导出成功");
      } finally {
        // 恢复原始选中状态
        project.stageManager.clearSelectAll();
        originalSelectedObjects.forEach((uuid) => {
          const obj = project.stageManager.get(uuid);
          if (obj) {
            obj.isSelected = true;
          }
        });
      }
    } catch (error) {
      console.error("导出PNG失败", error);
      toast.error("导出PNG失败");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-32">最大边长度:</span>
          <Input
            type="number"
            min="100"
            max="8192"
            value={maxDimension}
            onChange={(e) => setMaxDimension(Math.max(100, Math.min(8192, parseInt(e.target.value) || 1920)))}
            className="w-24"
          />
          <span className="text-muted-foreground text-sm">像素</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-32">调整大小:</span>
          <Slider
            min={100}
            max={8192}
            step={100}
            value={[maxDimension]}
            onValueChange={(value) => setMaxDimension(value[0])}
            className="flex-1"
          />
        </div>
      </div>
      <Alert>
        <Info />
        <AlertTitle>提示</AlertTitle>
        <AlertDescription>过大的尺寸可能导致性能问题或失败，建议不超过4096像素</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button type="button" onClick={handleExport} disabled={isExporting}>
          {isExporting ? "导出中..." : "导出"}
        </Button>
      </div>
    </div>
  );
}

// 导出打开窗口的函数
NewExportPngWindow.open = (type: "selected" | "all") => {
  SubWindow.create({
    title: `导出 ${type === "selected" ? "选中内容" : "全部内容"} 为 PNG`,
    children: <NewExportPngWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(600, 400)),
  });
};
