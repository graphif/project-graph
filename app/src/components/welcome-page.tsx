import { onNewDraft, onOpenFile } from "@/core/service/GlobalMenu";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { Earth, FilePlus, FolderOpen, Info, Settings } from "lucide-react";
import SettingsWindow from "../sub/SettingsWindow";

export default function WelcomePage() {
  return (
    <div className="bg-stage-background text-stage-node-details-text flex h-full w-full items-center justify-center">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="text-3xl">Project Graph</div>
          <div className="text-lg opacity-50">笔起思涌，图见真意</div>
        </div>
        <div className="flex gap-16">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2 *:flex *:w-max *:cursor-pointer *:gap-2 *:hover:opacity-75 *:active:scale-90">
              <div onClick={onNewDraft}>
                <FilePlus />
                <span>新建文件</span>
              </div>
              <div onClick={() => onOpenFile(undefined, "欢迎页面")}>
                <FolderOpen />
                <span>打开文件</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 *:flex *:cursor-pointer *:flex-col *:*:last:text-sm *:*:last:opacity-50 *:hover:opacity-75">
              <div>
                <span>2.0保存测试.prg</span>
                <span>/home/user/Desktop</span>
              </div>
              <div>
                <span>2.0保存测试123.prg</span>
                <span>/home/user/hello</span>
              </div>
              <div>
                <span>待RecentFileManager开发完成</span>
                <span>/home/user/dev/project-graph</span>
              </div>
              <div>
                <span>placeholder</span>
                <span>/tmp</span>
              </div>
              <div>
                <span>此处最多显示5个</span>
                <span>/usr/local/bin</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 *:flex *:w-max *:cursor-pointer *:gap-2 *:hover:opacity-75 *:active:scale-90">
            <div onClick={() => SettingsWindow.open()}>
              <Settings />
              <span>设置</span>
            </div>
            <div onClick={() => SettingsWindow.open()}>
              <Info />
              <span>关于</span>
            </div>
            <div onClick={() => shellOpen("https://project-graph.top")}>
              <Earth />
              <span>官网</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
