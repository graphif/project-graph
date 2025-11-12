import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useAtom } from "jotai";
import { FileWarning, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function ExportPngWindow() {
  const [project] = useAtom(activeProjectAtom);
  if (!project) return <></>;
  const [scale, setScale] = useState(1);
  const scaleBefore = useMemo(() => project.camera.targetScale, []);
  const [transparentBg, setTransparentBg] = useState(false);
  const windowBackgroundAlphaBefore = useMemo(() => Settings.windowBackgroundAlpha, []);
  const [showGrid, setShowGrid] = useState(false);
  const showBackgroundCartesianBefore = useMemo(() => Settings.showBackgroundCartesian, []);
  const showBackgroundDotsBefore = useMemo(() => Settings.showBackgroundDots, []);
  const showBackgroundHorizontalLinesBefore = useMemo(() => Settings.showBackgroundHorizontalLines, []);
  const showBackgroundVerticalLinesBefore = useMemo(() => Settings.showBackgroundVerticalLines, []);
  const [progress, setProgress] = useState(-1);
  const [imageResolution, setImageResolution] = useState(new Vector(0, 0));
  const [overSized, setOverSized] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [sleepTime, setSleepTime] = useState(2); // 默认2毫秒

  useEffect(() => {
    project.camera.targetScale = scale;
    project.camera.currentScale = scale;
    Settings.windowBackgroundAlpha = transparentBg ? 0 : 1;
    Settings.showBackgroundCartesian = showGrid;
    Settings.showBackgroundDots = showGrid;
    Settings.showBackgroundHorizontalLines = showGrid;
    Settings.showBackgroundVerticalLines = showGrid;
    return () => {
      project.camera.targetScale = scaleBefore;
      Settings.windowBackgroundAlpha = windowBackgroundAlphaBefore;
      Settings.showBackgroundCartesian = showBackgroundCartesianBefore;
      Settings.showBackgroundDots = showBackgroundDotsBefore;
      Settings.showBackgroundHorizontalLines = showBackgroundHorizontalLinesBefore;
      Settings.showBackgroundVerticalLines = showBackgroundVerticalLinesBefore;
    };
  }, [scale, transparentBg, showGrid]);
  useEffect(() => {
    setImageResolution(
      project.stageManager
        .getSize()
        .add(new Vector(100 * 2, 100 * 2))
        .multiply(scale),
    );
  }, [scale]);
  useEffect(() => {
    setOverSized(
      imageResolution.x > 2 ** 15 - 1 ||
        imageResolution.y > 2 ** 15 - 1 ||
        imageResolution.x * imageResolution.y > 2 ** 28,
    );
  }, [imageResolution]);

  function startExport() {
    const ac = new AbortController();
    setAbortController(ac);
    project?.stageExportPng
      .exportStage(ac.signal, sleepTime)
      .on("progress", setProgress)
      .on("error", (err) => {
        toast.error("渲染失败: " + err.message);
        setProgress(-1);
      })
      .on("complete", (blob) => {
        toast("complete");
        setProgress(-1);
        const reader = new FileReader();
        reader.onload = () => {
          const u8a = new Uint8Array(reader.result as ArrayBuffer);
          save({
            filters: [
              {
                name: "PNG",
                extensions: ["png"],
              },
            ],
          }).then((path) => {
            if (!path) return;
            writeFile(path, u8a);
          });
        };
        reader.readAsArrayBuffer(blob);
      });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        @{scale}x
        <Slider value={[scale]} onValueChange={([v]) => setScale(v)} min={0.1} max={4} step={0.1} />
      </div>
      <span>
        实际图片分辨率: {imageResolution.x.toFixed()}x{imageResolution.y.toFixed()}
      </span>
      {overSized && (
        <Alert variant="destructive">
          <FileWarning />
          <AlertTitle>图片过大</AlertTitle>
          <AlertDescription>可尝试调小图像比例</AlertDescription>
        </Alert>
      )}
      <Alert>
        <Info />
        <AlertTitle>图像比例</AlertTitle>
        <AlertDescription>此值越大，图片越清晰</AlertDescription>
      </Alert>
      <div className="flex items-center gap-2">
        <Checkbox checked={transparentBg} onCheckedChange={(it) => setTransparentBg(!!it)} />
        <span>透明背景</span>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={showGrid} onCheckedChange={(it) => setShowGrid(!!it)} />
        <span>显示网格</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span>渲染间隔: {sleepTime}ms</span>
          <Slider value={[sleepTime]} onValueChange={([v]) => setSleepTime(v)} min={1} max={1000} step={1} />
        </div>
        <Alert>
          <Info />
          <AlertDescription>
            间隔时间越小，渲染速度越快，但可能导致渲染不完整；间隔时间越大，渲染越稳定，但速度越慢
          </AlertDescription>
        </Alert>
      </div>
      {progress === -1 ? (
        <div className="flex gap-2">
          <Button onClick={startExport} disabled={overSized}>
            开始渲染
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="destructive" onClick={() => abortController?.abort()}>
            取消
          </Button>
          <Progress value={progress * 100} />
        </div>
      )}
      <Alert>
        <Info />
        <AlertDescription>
          渲染图片时，会逐个拼接小块，需要等待若干秒才能完成渲染，图像比例越大，渲染时间越长，画面分辨率越高
        </AlertDescription>
      </Alert>
    </div>
  );
}

ExportPngWindow.open = () => {
  SubWindow.create({
    title: "导出 PNG",
    children: <ExportPngWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(600, 700)),
  });
};
