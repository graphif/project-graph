import { Input } from "@/components/ui/input";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { SubWindow } from "@/core/service/SubWindow";
import { cn } from "@/utils/cn";
import { PathString } from "@/utils/pathString";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import {
  DoorClosed,
  DoorOpen,
  Import,
  LoaderPinwheel,
  Trash2,
  X,
  Link,
  HardDriveDownload,
  Eye,
  EyeOff,
} from "lucide-react";
import React, { ChangeEventHandler, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { URI } from "vscode-uri";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { useAtom } from "jotai";
import { activeProjectAtom } from "@/state";
import { DragFileIntoStageEngine } from "@/core/service/dataManageService/dragFileIntoStageEngine/dragFileIntoStageEngine";

/**
 * 文件名隐私保护加密函数（强制使用凯撒移位）
 * @param fileName 文件名
 * @returns 加密后的文件名
 */
function encryptFileName(fileName: string): string {
  // 凯撒移位加密：所有字符往后移动一位
  return fileName
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);

      // 对于可打印ASCII字符进行移位
      if (code >= 32 && code <= 126) {
        // 特殊处理：'z' 移到 'a'，'Z' 移到 'A'，'9' 移到 '0'
        if (char === "z") return "a";
        if (char === "Z") return "A";
        if (char === "9") return "0";
        // 其他字符直接 +1
        return String.fromCharCode(code + 1);
      }

      // 对于中文字符，进行移位加密
      if (code >= 0x4e00 && code <= 0x9fa5) {
        // 中文字符在Unicode范围内循环移位
        // 0x4e00是汉字起始，0x9fa5是汉字结束，总共约20902个汉字
        const shiftedCode = code + 1;
        // 如果超过汉字范围，则回到起始位置
        return String.fromCharCode(shiftedCode <= 0x9fa5 ? shiftedCode : 0x4e00);
      }

      // 其他字符保持不变
      return char;
    })
    .join("");
}

// 嵌套文件夹结构类型
type FolderNode = {
  name: string;
  path: string;
  files: RecentFileManager.RecentFile[];
  subFolders: Record<string, FolderNode>;
};

/**
 * 最近文件面板按钮
 * @returns
 */
export default function RecentFilesWindow({ winId = "" }: { winId?: string }) {
  const [activeProject] = useAtom(activeProjectAtom);
  /**
   * 数据中有多少就是多少
   */
  const [recentFiles, setRecentFiles] = React.useState<RecentFileManager.RecentFile[]>([]);
  /**
   * 经过搜索字符串过滤后的
   */
  const [recentFilesFiltered, setRecentFilesFiltered] = React.useState<RecentFileManager.RecentFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // 当前预选中的文件下标
  const [currentPreselect, setCurrentPreselect] = React.useState<number>(0);
  const [searchString, setSearchString] = React.useState("");

  const [currentShowPath, setCurrentShowPath] = React.useState<string>("");
  const [currentShowTime, setCurrentShowTime] = React.useState<string>("");

  const [isShowDeleteEveryItem, setIsShowDeleteEveryItem] = React.useState<boolean>(false);
  const [isShowDoorEveryItem, setIsShowDoorEveryItem] = React.useState<boolean>(false);
  const [isNestedView, setIsNestedView] = React.useState<boolean>(false);
  const [isLocalPrivacyMode, setIsLocalPrivacyMode] = React.useState<boolean>(false);

  // 选择文件夹并导入PRG文件
  const importPrgFilesFromFolder = async () => {
    try {
      // 打开文件夹选择对话框
      const folderPath = await open({
        directory: true,
        multiple: false,
      });

      if (!folderPath) return;

      // 递归读取文件夹中的所有.prg文件
      setIsLoading(true);
      const files: string[] = await invoke("read_folder_recursive", {
        path: folderPath,
        fileExts: [".prg"],
      });

      if (files.length === 0) {
        toast.info("未找到.prg文件");
        return;
      }

      // 转换文件路径为URI并添加到最近文件历史
      const uris = files.map((filePath) => URI.file(filePath));
      await RecentFileManager.addRecentFilesByUris(uris);

      // 更新列表
      await updateRecentFiles();

      toast.success(`成功导入 ${files.length} 个.prg文件`);
    } catch (error) {
      console.error("导入文件失败:", error);
      toast.error("导入文件失败");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 用于刷新页面显示
   */
  const updateRecentFiles = async () => {
    setIsLoading(true);
    await RecentFileManager.validAndRefreshRecentFiles();
    await RecentFileManager.sortTimeRecentFiles();
    const files = await RecentFileManager.getRecentFiles();
    setRecentFiles(files);
    setRecentFilesFiltered(files);
    setIsLoading(false);
  };

  const onInputChange: ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputString: string = event.target.value;
    console.log(inputString, "inputContent");
    if (inputString === "#") {
      // 默认的shift + 3 会触发井号
      return;
    }
    setCurrentPreselect(0); // 一旦有输入，就设置下标为0
    setSearchString(inputString);
    setRecentFilesFiltered(recentFiles.filter((file) => decodeURI(file.uri.toString()).includes(inputString)));
  };

  useEffect(() => {
    updateRecentFiles();
  }, []);

  useEffect(() => {
    if (isLoading || recentFilesFiltered.length === 0) return;
    // 确保currentPreselect在有效范围内
    const validIndex = Math.min(currentPreselect, recentFilesFiltered.length - 1);
    setCurrentShowPath(decodeURI(recentFilesFiltered[validIndex].uri.toString()));
    setCurrentShowTime(new Date(recentFilesFiltered[validIndex].time).toLocaleString());
  }, [currentPreselect, isLoading, recentFilesFiltered]);

  const checkoutFile = async (file: RecentFileManager.RecentFile) => {
    try {
      await onOpenFile(file.uri, "历史界面-最近打开的文件");
      SubWindow.close(winId);
    } catch (error) {
      toast.error(error as string);
    }
  };

  // 清空所有历史记录
  const clearAllRecentHistory = async () => {
    try {
      // 弹出确认框
      const confirmed = await Dialog.confirm(
        "确认清空",
        "此操作不可撤销，确定要清空历史记录吗？仅仅是清空此列表，不是删除文件本身。",
        {
          destructive: true,
        },
      );

      if (!confirmed) {
        return; // 用户取消操作
      }

      await RecentFileManager.clearAllRecentFiles();
      // 清空后重置currentPreselect以避免访问无效索引
      setCurrentPreselect(0);
      await updateRecentFiles();
      toast.success("已清空所有历史记录");
    } catch (error) {
      toast.error(`清空历史记录失败 ${error}`);
    }
  };

  const addCurrentFileToCurrentProject = (fileAbsolutePath: string, isAbsolute: boolean) => {
    if (!activeProject) {
      toast.error("当前没有激活的项目，无法添加传送门");
      return;
    }
    if (isAbsolute) {
      DragFileIntoStageEngine.handleDropFileAbsolutePath(activeProject, [fileAbsolutePath]);
    } else {
      if (activeProject.isDraft) {
        toast.error("草稿是未保存文件，没有路径，不能用相对路径导入");
        return;
      }
      DragFileIntoStageEngine.handleDropFileRelativePath(activeProject, [fileAbsolutePath]);
    }
  };

  // 将最近文件转换为嵌套文件夹结构
  const buildFolderTree = (files: RecentFileManager.RecentFile[]): Record<string, FolderNode> => {
    const root: Record<string, FolderNode> = {};

    files.forEach((file) => {
      try {
        const fsPath = file.uri.fsPath;

        // 获取目录路径 - 使用完整的文件路径
        const dirPath = PathString.dirPath(fsPath);
        const dirParts = dirPath.split(/[\\/]/).filter(Boolean);

        // 获取磁盘根目录（如C:, D:）
        const diskRoot = dirParts[0] || "unknown";

        if (!root[diskRoot]) {
          root[diskRoot] = {
            name: diskRoot,
            path: diskRoot + "/",
            files: [],
            subFolders: {},
          };
        }

        let currentFolder = root[diskRoot];

        // 构建子文件夹结构
        for (let i = 1; i < dirParts.length; i++) {
          const folderName = dirParts[i];
          const folderPath = dirParts.slice(0, i + 1).join("/");

          if (!currentFolder.subFolders[folderName]) {
            currentFolder.subFolders[folderName] = {
              name: folderName,
              path: folderPath,
              files: [],
              subFolders: {},
            };
          }

          currentFolder = currentFolder.subFolders[folderName];
        }

        // 添加文件到当前文件夹
        currentFolder.files.push(file);
      } catch (error) {
        console.error("处理文件路径时出错:", error, file);
        // 跳过这个文件，继续处理其他文件
      }
    });

    return root;
  };

  // 递归渲染文件夹组件
  const FolderComponent: React.FC<{ folder: FolderNode; isPrivacyMode?: boolean }> = ({
    folder,
    isPrivacyMode = false,
  }) => {
    // 检查是否有子文件夹
    const hasSubFolders = Object.values(folder.subFolders).length > 0;
    // 如果没有子文件夹，只包含文件，设置最大宽度

    return (
      <div
        className={cn(
          "bg-muted/50 m-1 inline-block rounded-lg border p-1",
          !hasSubFolders && "max-w-96",
          hasSubFolders && "",
        )}
      >
        <div className="mb-2 ml-1 font-bold">{isPrivacyMode ? encryptFileName(folder.name) : folder.name}</div>

        {/* 显示当前文件夹中的文件 */}
        {folder.files.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {folder.files.map((file, index) => (
              <div
                key={index}
                className={cn(
                  "bg-muted relative flex max-w-48 origin-left cursor-pointer flex-col items-center gap-2 rounded-lg border p-1 px-2 py-1 opacity-75 transition-opacity hover:opacity-100",
                )}
                onMouseEnter={() => {
                  // 在嵌套视图中，我们不需要跟踪当前选中的索引
                  SoundService.play.mouseEnterButton();
                }}
                onClick={() => {
                  if (isShowDeleteEveryItem) {
                    toast.warning("当前正在删除阶段，请退出删除阶段才能打开文件，或点击删除按钮删除该文件");
                    return;
                  }
                  if (isShowDoorEveryItem) {
                    toast.warning("当前正在添加传送门阶段，请退出添加传送门阶段才能打开文件，或点击按钮添加传送门");
                    return;
                  }
                  checkoutFile(file);
                  SoundService.play.mouseClickButton();
                }}
              >
                {isPrivacyMode
                  ? encryptFileName(
                      PathString.getShortedFileName(PathString.absolute2file(decodeURI(file.uri.toString())), 12),
                    )
                  : PathString.getShortedFileName(PathString.absolute2file(decodeURI(file.uri.toString())), 12)}
                {isShowDeleteEveryItem && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const result = await RecentFileManager.removeRecentFileByUri(file.uri);
                      if (result) {
                        updateRecentFiles();
                      } else {
                        toast.warning("删除失败");
                      }
                    }}
                    className="bg-destructive absolute -right-2 -top-2 cursor-pointer rounded-full transition-colors hover:scale-110"
                  >
                    <X size={16} />
                  </button>
                )}
                {isShowDoorEveryItem && (
                  <>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const filePath = PathString.uppercaseAbsolutePathDiskChar(file.uri.fsPath).replaceAll(
                          "\\",
                          "/",
                        );
                        addCurrentFileToCurrentProject(filePath, false);
                      }}
                      className="bg-primary absolute -top-2 right-4 cursor-pointer rounded-full transition-colors hover:scale-110"
                    >
                      <Link size={16} />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const filePath = PathString.uppercaseAbsolutePathDiskChar(file.uri.fsPath).replaceAll(
                          "\\",
                          "/",
                        );
                        addCurrentFileToCurrentProject(filePath, true);
                      }}
                      className="bg-primary absolute -right-2 -top-2 cursor-pointer rounded-full transition-colors hover:scale-110"
                    >
                      <HardDriveDownload size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 递归渲染子文件夹 */}
        {Object.values(folder.subFolders).length > 0 && (
          <div className="pl-2">
            {Object.values(folder.subFolders)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((subFolder) => (
                <FolderComponent key={subFolder.path} folder={subFolder} isPrivacyMode={isPrivacyMode} />
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex h-full flex-col items-center gap-2")}>
      <div className="flex w-full flex-wrap items-center gap-2 p-1">
        <Input
          placeholder="请输入要筛选的文件"
          onChange={onInputChange}
          value={searchString}
          autoFocus
          className="min-w-32 max-w-96 flex-1"
        />

        <button
          onClick={importPrgFilesFromFolder}
          className="bg-primary/10 hover:bg-primary/20 flex gap-2 rounded-md p-2 transition-colors"
          title="递归导入文件夹中的所有.prg文件"
        >
          <Import />
          <span>递归导入文件夹中的所有.prg文件</span>
        </button>

        <button
          onClick={clearAllRecentHistory}
          className="bg-destructive/10 hover:bg-destructive/20 flex gap-2 rounded-md p-2 transition-colors"
          title="清空所有历史记录"
        >
          <Trash2 />
          <span>清空所有历史记录</span>
        </button>
        <button
          onClick={() => {
            setIsShowDeleteEveryItem((prev) => !prev);
          }}
          className="bg-destructive/10 hover:bg-destructive/20 flex gap-2 rounded-md p-2 transition-colors"
        >
          {isShowDeleteEveryItem ? (
            <>
              <Trash2 />
              <span>停止删除指定记录</span>
            </>
          ) : (
            <>
              <Trash2 />
              <span>开始删除指定记录</span>
            </>
          )}
        </button>
        <button
          onClick={() => {
            setIsShowDoorEveryItem((prev) => !prev);
          }}
          className="bg-primary/10 flex gap-2 rounded-md p-2 transition-colors"
        >
          {isShowDoorEveryItem ? (
            <>
              <DoorOpen />
              <span>停止添加传送门</span>
            </>
          ) : (
            <>
              <DoorClosed />
              <span>开始添加传送门</span>
            </>
          )}
        </button>
        <button
          onClick={() => {
            setIsNestedView((prev) => !prev);
          }}
          className="bg-primary/10 flex gap-2 rounded-md p-2 transition-colors"
        >
          {isNestedView ? (
            <>
              <HardDriveDownload />
              <span>切换到平铺视图</span>
            </>
          ) : (
            <>
              <HardDriveDownload />
              <span>切换到嵌套视图</span>
            </>
          )}
        </button>
        <button
          onClick={() => {
            setIsLocalPrivacyMode((prev) => !prev);
          }}
          className="bg-primary/10 flex gap-2 rounded-md p-2 transition-colors"
        >
          {isLocalPrivacyMode ? (
            <>
              <EyeOff />
              <span>关闭隐私模式</span>
            </>
          ) : (
            <>
              <Eye />
              <span>开启隐私模式</span>
            </>
          )}
        </button>
      </div>
      <div className="flex w-full flex-col items-baseline justify-center px-4 text-xs">
        <p>{currentShowPath}</p>
        <p>{currentShowTime}</p>
      </div>

      {/* 加载中提示 */}
      {isLoading && (
        <div className="flex h-full items-center justify-center text-8xl">
          <LoaderPinwheel className="scale-200 animate-spin" />
        </div>
      )}
      {/* 滚动区域单独封装 */}
      {!isLoading && recentFilesFiltered.length === 0 && (
        <div className="flex h-full items-center justify-center text-8xl">
          <span>NULL</span>
        </div>
      )}

      {/* 根据视图模式渲染不同的内容 */}
      {isNestedView ? (
        <div className="flex w-full flex-col overflow-auto p-1">
          {Object.values(buildFolderTree(recentFilesFiltered)).map((rootFolder) => (
            <FolderComponent key={rootFolder.path} folder={rootFolder} isPrivacyMode={isLocalPrivacyMode} />
          ))}
        </div>
      ) : (
        <div className="flex w-full flex-wrap gap-2 p-1">
          {recentFilesFiltered.map((file, index) => (
            <div
              key={index}
              className={cn(
                "bg-muted/50 relative flex max-w-64 origin-left cursor-pointer flex-col items-center gap-2 rounded-lg border p-1 px-2 py-1 opacity-75",
                {
                  "opacity-100": index === currentPreselect,
                },
              )}
              onMouseEnter={() => {
                setCurrentPreselect(index);
                SoundService.play.mouseEnterButton();
              }}
              onClick={() => {
                if (isShowDeleteEveryItem) {
                  toast.warning("当前正在删除阶段，请退出删除阶段才能打开文件，或点击删除按钮删除该文件");
                  return;
                }
                if (isShowDoorEveryItem) {
                  toast.warning("当前正在添加传送门阶段，请退出添加传送门阶段才能打开文件，或点击按钮添加传送门");
                  return;
                }
                checkoutFile(file);
                SoundService.play.mouseClickButton();
              }}
            >
              {isLocalPrivacyMode
                ? encryptFileName(
                    PathString.getShortedFileName(PathString.absolute2file(decodeURI(file.uri.toString())), 15),
                  )
                : PathString.getShortedFileName(PathString.absolute2file(decodeURI(file.uri.toString())), 15)}
              {isShowDeleteEveryItem && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const result = await RecentFileManager.removeRecentFileByUri(file.uri);
                    if (result) {
                      updateRecentFiles();
                    } else {
                      toast.warning("删除失败");
                    }
                  }}
                  className="bg-destructive absolute -right-2 -top-2 cursor-pointer rounded-full transition-colors hover:scale-110"
                >
                  <X size={20} />
                </button>
              )}
              {isShowDoorEveryItem && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const filePath = PathString.uppercaseAbsolutePathDiskChar(file.uri.fsPath).replaceAll("\\", "/");
                    addCurrentFileToCurrentProject(filePath, false);
                  }}
                  className="bg-primary absolute -top-2 right-4 cursor-pointer rounded-full transition-colors hover:scale-110"
                >
                  <Link size={20} />
                </button>
              )}
              {isShowDoorEveryItem && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const filePath = PathString.uppercaseAbsolutePathDiskChar(file.uri.fsPath).replaceAll("\\", "/");
                    addCurrentFileToCurrentProject(filePath, true);
                  }}
                  className="bg-primary absolute -right-2 -top-2 cursor-pointer rounded-full transition-colors hover:scale-110"
                >
                  <HardDriveDownload size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

RecentFilesWindow.open = () => {
  SubWindow.create({
    title: "最近打开的文件",
    children: <RecentFilesWindow />,
    rect: new Rectangle(new Vector(50, 50), new Vector(window.innerWidth - 100, window.innerHeight - 100)),
    // 不要点击外面就关闭当前面板，不太好用
    // closeWhenClickOutside: true,
  });
};
