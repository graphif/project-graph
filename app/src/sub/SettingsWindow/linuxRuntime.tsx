import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BaseDirectory, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";

export default function LinuxRuntimeTab() {
  const [argv, _setArgv] = useState<string[]>([]);
  const [qtQpaPlatform, _setQtQpaPlatform] = useState<string>("");

  useEffect(() => {
    readTextFile("argv.json", { baseDir: BaseDirectory.AppData }).then((content) => {
      _setArgv(JSON.parse(content));
    });
    readTextFile("QT_QPA_PLATFORM", { baseDir: BaseDirectory.AppData }).then((content) => {
      _setQtQpaPlatform(content);
    });
  }, []);

  const setArgv = (newArgv: string[]) => {
    _setArgv(JSON.parse(JSON.stringify(newArgv)));
    writeTextFile("argv.json", JSON.stringify(newArgv), { baseDir: BaseDirectory.AppData });
  };
  const setQtQpaPlatform = (newValue: string) => {
    _setQtQpaPlatform(newValue);
    writeTextFile("QT_QPA_PLATFORM", newValue, { baseDir: BaseDirectory.AppData });
  };

  return (
    <div className="mx-auto my-8 flex w-2/3 flex-col gap-2 overflow-auto">
      <p>Chromium 参数 (~/.local/share/liren.project-graph/argv.json)</p>
      <Textarea value={argv.join("\n")} onChange={(e) => setArgv(e.target.value.split(/\n| /))} />
      <Separator className="my-4" />
      <p>Qt QPA Platform (~/.local/share/liren.project-graph/QT_QPA_PLATFORM)</p>
      <Textarea value={qtQpaPlatform} onChange={(e) => setQtQpaPlatform(e.target.value)} />
    </div>
  );
}
