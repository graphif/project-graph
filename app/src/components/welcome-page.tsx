import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onNewDraft, onOpenFile } from "@/core/service/GlobalMenu";
import { Path } from "@/utils/path";
import { getVersion } from "@tauri-apps/api/app";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { writeFile } from "@tauri-apps/plugin-fs";
import {
  Earth,
  FilePlus,
  FolderOpen,
  Info,
  LoaderCircle,
  Map as MapIcon,
  Settings as SettingsIcon,
  TableProperties,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsWindow from "../sub/SettingsWindow";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { AssetsRepository } from "@/core/service/AssetsRepository";
import { join, tempDir } from "@tauri-apps/api/path";
import { URI } from "vscode-uri";
import RecentFilesWindow from "@/sub/RecentFilesWindow";
import { isMac } from "@/utils/platform";
import { cpuInfo } from "tauri-plugin-system-info-api";

export default function WelcomePage() {
  const [recentFiles, setRecentFiles] = useState<RecentFileManager.RecentFile[]>([]);
  const { t } = useTranslation("welcome");
  const [appVersion, setAppVersion] = useState("unknown");
  const [isDownloadingGuideFile, setIsDownloadingGuideFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastClickFileURIPath, setLastClickFileURIPath] = useState("");
  const [isAmdCpu, setIsAmdCpu] = useState(false);
  const [currentSlogan, setCurrentSlogan] = useState("");

  // 中文 slogan 列表（展示一些有趣特性或技巧）
  const slogans = [
    "思维框架图和思维导图的区别在于，思维框架图不局限于树形结构，可以自由连接节点，形成用于分析项目结构的网络结构",
    "目前一般不建议一个prg文件超过50MB，否则文件过大可能影响性能，保存缓慢",
    "格式化树形结构时，需要保证每个连线都是一种标准化的方向的连线，例如向右的连线从源头右侧发出，目标左侧接收",
    "alt shift f 可以格式化树形结构，它源自于 VS Code 格式化代码的快捷键。每当按下这个快捷键时，左手像个兰花指。",
    "移动视野有13种方法，具体可以在官网的摄像机章节查看",
    "这个软件不是传统的思维导图软件",
    "打开一个文件后，ctrl + 0 可以直接透明窗口。可以用于一边看视频一边纯键盘操作",
    "WSAD可以移动视野。但其他软件的全局快捷键可能会干扰此软件监听WSAD的松开事件，进而导致视野一直朝着某方向移动，可以手动触发一次松开解决",
    "当视野放大到极限时会回到宏观视角。源自《围观尽头》",
    "F键可以快速聚焦视野到选中的物体，再按下shift+F可以快速回到按下F键之前的宏观视角",
    "选中图片后右下角有一个绿色按钮，可以拖拽改变大小",
    "向左框选和向右框选逻辑不同，源自CAD，框选可以大幅度提升自由布局的移动效率",
    "windows系统中，可以将此软件的exe放入zip中，直接双击预览打开zip文件然后双击打开内部的exe，可以逃过某些禁止运行exe电脑的限制",
    "软件是开源的，可以放心使用。可参考MIT和GPL-3.0双许可协议",
    "prg文件是软件的专有格式，用于存储思维框架图数据。本质是一个zip压缩包，解压后可以看到里面的图片文件",
    "windows系统中，跨文件复制需要在一个软件中打开两个标签页，而非直接双击prg文件打开两个软件",
    "当一个文本节点的内容恰好为一个文件的绝对路径或者网页URL时，可以 中键双击/快捷键/右键 直接打开这个文件或者网页",
    "按住ctrl键框选，可以实现反选。进而可以实现先选中一些节点，再用反选框选一次，选中所有的连线。",
    "框选优先级：框选起点所在Section框 > 节点 > 连线",
    "文本节点的字体大小是指数级别的，因为缩放视野时鼠标滚动的圈数和视野内大小变化尺度也是指数级别的。",
    "WSAD移动时，如果是高空飞行，移动速度会很快，如果是低空飞行，移动速度会很慢。",
    "选中两个节点，按两次数字4，可以左对齐，6是右对齐，8、2是上下对齐，看九宫格小键盘非常直观",
    "当脑机接口与视网膜投屏实现的那一天出现时，这个软件的生命就终结了，获许会以一种新的形态出现",
    "小特性：鼠标在空白地方拖出一个框选框不松手时，按下ctrl+G会直接创建一个框选框大小的Section框。用于自顶向下的绘制大板块结构",
    "不要当一个囤积知识的笔记拷贝者，而是要当一个知识的创造者与思考者。",
    "鼠标移动到窗口顶部空白地方时会出现一个带颜色的框，可以拖动这个区域来移动整个软件窗口",
    "当窗口缩小到足够小时，导航栏等UI会变得极小，可以当成一个迷你小窗口软件来使用",
    "windows系统中，右上角的小黄点可以用于想关闭软件时，直接鼠标无脑顶到右上角直接点击关闭。不需要再看x的位置并瞄准了",
    "推荐使用新版的导出PNG图片功能而非旧版的拼接图片导出功能",
  ];

  useEffect(() => {
    refresh();
    (async () => {
      setAppVersion(await getVersion());
      try {
        const cpu = await cpuInfo();
        const cpuBrand = cpu.cpus[0].brand;
        setIsAmdCpu(cpuBrand.includes("AMD"));
      } catch (e) {
        console.error("检测CPU信息失败:", e);
      }
    })();

    // 随机选择 slogan
    const randomIndex = Math.floor(Math.random() * slogans.length);
    setCurrentSlogan(slogans[randomIndex]);
  }, []);

  async function refresh() {
    setIsLoading(true);
    await RecentFileManager.sortTimeRecentFiles();
    setRecentFiles(await RecentFileManager.getRecentFiles());
    setIsLoading(false);
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--stage-background)]">
      <div className="m-2 flex flex-col p-4 sm:gap-8">
        {/* 顶部标题区域 */}
        <div className="flex flex-col sm:gap-2">
          <div className="flex items-center gap-2">
            <span className="sm:text-3xl">{t("title")}</span>
            <a
              href="https://graphif.dev/docs/app/misc/history"
              target="_blank"
              rel="noopener noreferrer"
              className="border-card-foreground/30 hover:border-primary/90 hidden cursor-pointer border-2 opacity-50 sm:inline sm:rounded-lg sm:px-2 sm:py-1 md:text-lg"
            >
              {appVersion}
            </a>
          </div>
          <div className="hidden text-xs opacity-50 sm:block">{currentSlogan}</div>
          {isAmdCpu && (
            <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-yellow-600/75">
              <AlertTriangle />
              <span>您的设备（AMD CPU）可能在大屏(4k)下使用时存在渲染卡顿问题</span>
            </div>
          )}
        </div>
        {/* 底部区域 */}
        <div className="flex sm:gap-16">
          <div className="flex flex-col sm:gap-8">
            {/* 常用操作 宫格区 */}
            <div className="grid grid-cols-2 grid-rows-2 *:flex *:w-max *:cursor-pointer *:items-center *:gap-2 *:hover:opacity-75 *:active:scale-90 sm:gap-2 sm:gap-x-4">
              <div
                onClick={() => {
                  if (isDownloadingGuideFile) {
                    return;
                  }
                  setIsDownloadingGuideFile(true);
                  toast.promise(
                    async () => {
                      const u8a = await AssetsRepository.fetchFile("tutorials/tutorial-main-2.9.prg");
                      const dir = await tempDir();
                      const path = await join(dir, `tutorial-${crypto.randomUUID()}.prg`);
                      await writeFile(path, u8a);
                      await onOpenFile(URI.file(path), "功能说明书");
                    },
                    {
                      loading: "正在下载功能说明书",
                      error: (err) => {
                        console.error("下载功能说明书失败:", err);
                        return (
                          `下载功能说明书失败，可以尝试访问${AssetsRepository.getGuideFileUrl("tutorials/tutorial-main-2.9.prg")}，请确保您能访问github。` +
                          err
                        );
                      },
                      finally: () => {
                        setIsDownloadingGuideFile(false);
                      },
                    },
                  );
                }}
              >
                <MapIcon className={cn(isDownloadingGuideFile && "animate-spin")} />
                <span className="hidden sm:inline">{t("newUserGuide")}</span>
              </div>
              <div onClick={onNewDraft}>
                <FilePlus />
                <span className="hidden sm:inline">{t("newDraft")}</span>
                <span className="hidden text-xs opacity-50 sm:inline">{isMac ? "⌘ + N" : "Ctrl + N"}</span>
              </div>
              <div onClick={() => RecentFilesWindow.open()}>
                <TableProperties />
                <span className="hidden sm:inline">{t("openRecentFiles")}</span>
                <span className="hidden text-xs opacity-50 sm:inline">Shift + #</span>
              </div>
              <div onClick={() => onOpenFile(undefined, "欢迎页面")}>
                <FolderOpen />
                <span className="hidden sm:inline">{t("openFile")}</span>
                <span className="hidden text-xs opacity-50 sm:inline">{isMac ? "⌘ + O" : "Ctrl + O"}</span>
              </div>
            </div>
            <div className={cn("hidden flex-col gap-2 *:transition-opacity *:hover:opacity-75 sm:flex")}>
              {recentFiles.slice(0, 6).map((file, index) => (
                <div
                  className="flex flex-row items-center gap-2"
                  key={index}
                  onClick={async () => {
                    if (isLoading) {
                      toast.error("正在打开文件，请稍后");
                      return;
                    }
                    setIsLoading(true);
                    setLastClickFileURIPath(file.uri.fsPath);
                    try {
                      await onOpenFile(file.uri, "欢迎页面-最近打开的文件");
                      await refresh();
                    } catch (e) {
                      toast.error(e as string);
                    }
                    setIsLoading(false);
                    setLastClickFileURIPath("");
                  }}
                >
                  {isLoading && lastClickFileURIPath === file.uri.fsPath && (
                    <LoaderCircle className={cn(isLoading && "animate-spin")} />
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{new Path(file.uri).nameWithoutExt}</span>
                    <span className="text-xs opacity-50">{file.uri.fsPath}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 右侧区域 */}
          <div className="flex flex-col *:flex *:w-max *:cursor-pointer *:gap-2 *:hover:opacity-75 *:active:scale-90 sm:gap-2">
            <div onClick={() => SettingsWindow.open("settings")}>
              <SettingsIcon />
              <span className="hidden sm:inline">{t("settings")}</span>
            </div>
            <div onClick={() => SettingsWindow.open("about")}>
              <Info />
              <span className="hidden sm:inline">{t("about")}</span>
            </div>
            <div onClick={() => shellOpen("https://project-graph.top")}>
              <Earth />
              <span className="hidden sm:inline">{t("website")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
