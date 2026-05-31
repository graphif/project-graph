import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BaseDirectory, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";

export default function LinuxRuntimeTab() {
  const [argv, _setArgv] = useState<string[]>([]);
  const [qtQpaPlatform, _setQtQpaPlatform] = useState<string>("");
  const [zoomFactor, _setZoomFactor] = useState<number>(1);

  useEffect(() => {
    readTextFile("argv.json", { baseDir: BaseDirectory.AppData }).then((content) => {
      _setArgv(JSON.parse(content));
    });
    readTextFile("QT_QPA_PLATFORM.txt", { baseDir: BaseDirectory.AppData }).then((content) => {
      _setQtQpaPlatform(content);
    });
    readTextFile("zoomFactor.txt", { baseDir: BaseDirectory.AppData }).then((content) => {
      _setZoomFactor(parseFloat(content));
    });
  }, []);

  const setArgv = (newArgv: string[]) => {
    _setArgv(JSON.parse(JSON.stringify(newArgv)));
    writeTextFile("argv.json", JSON.stringify(newArgv), { baseDir: BaseDirectory.AppData });
  };
  const setQtQpaPlatform = (newValue: string) => {
    _setQtQpaPlatform(newValue);
    writeTextFile("QT_QPA_PLATFORM.txt", newValue, { baseDir: BaseDirectory.AppData });
  };
  const setZoomFactor = (newValue: number) => {
    _setZoomFactor(newValue);
    writeTextFile("zoomFactor.txt", newValue.toString(), { baseDir: BaseDirectory.AppData });
  };

  return (
    <div className="mx-auto my-8 flex w-2/3 flex-col gap-2 overflow-auto">
      <p>Chromium 参数 (~/.local/share/liren.project-graph/argv.json)</p>
      <Textarea value={argv.join("\n")} onChange={(e) => setArgv(e.target.value.split(/\n| /))} />
      <Separator className="my-4" />
      <p>Qt QPA Platform (~/.local/share/liren.project-graph/QT_QPA_PLATFORM.txt)</p>
      <Input value={qtQpaPlatform} onChange={(e) => setQtQpaPlatform(e.target.value)} />
      <Separator className="my-4" />
      <p>UI 缩放 (~/.local/share/liren.project-graph/zoomFactor.txt)</p>
      <Input type="number" value={zoomFactor} onChange={(e) => setZoomFactor(parseFloat(e.target.value))} />
    </div>
  );
}
