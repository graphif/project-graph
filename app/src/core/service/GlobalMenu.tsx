import { Dialog } from "@/components/ui/dialog";

import { Extension } from "@/core/extension/Extension";
import { loadAllServicesAfterInit, loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { Project, ProjectState } from "@/core/Project";
import { isResourceTab } from "@/core/Tab";
import { TabFactory } from "@/core/TabFactory";
import { activeResourceTabAtom, activeTabAtom, store, tabsAtom } from "@/state";
import { PathString } from "@/utils/pathString";
import { isMac } from "@/utils/platform";
import { ensurePrgThumbnailCached } from "@/utils/readPrgThumbnail";
import { Vector } from "@graphif/data-structures";
import { deserialize } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { Decoder } from "@msgpack/msgpack";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { FileSystemProviderDraft } from "../fileSystemProvider/FileSystemProviderDraft";
import { FileSystemProviderFile } from "../fileSystemProvider/FileSystemProviderFile";
import { ProjectUpgrader } from "../stage/ProjectUpgrader";
import { CollisionBox } from "../stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "../stage/stageObject/entity/TextNode";
import { RecentFileManager } from "./dataFileService/RecentFileManager";
import { FeatureFlags } from "./FeatureFlags";
import { Settings } from "./Settings";
import { Telemetry } from "./Telemetry";

import GlobalMenuContent from "@/components/global-menu-content";

export function GlobalMenu() {
  return <GlobalMenuContent />;
}

export function openCurrentProjectFolder(project: Project) {
  shellOpen(PathString.dirPath(project.uri.fsPath));
}

export async function onNewDraft() {
  const project = Project.newDraft();
  loadAllServicesBeforeInit(project);
  await project.init();
  loadAllServicesAfterInit(project);
  store.set(tabsAtom, [...store.get(tabsAtom), project]);
  store.set(activeTabAtom, project);
  store.set(activeResourceTabAtom, project);
  return project;
}

export async function onStartCollaboration() {
  const resource = store.get(activeResourceTabAtom);
  const active = store.get(activeTabAtom);
  const project = resource instanceof Project ? resource : active instanceof Project ? active : undefined;
  if (!project) {
    toast.error("请先打开一个工程");
    return;
  }
  if (!FeatureFlags.USER) {
    toast.error("云服务未启用（缺少 LR_API_BASE_URL）");
    return;
  }
  try {
    if (project.collaboration.isActive) {
      toast.message(`已在协作中，邀请码：${project.collaboration.currentInviteCode}`);
      return;
    }
    const { inviteCode } = await project.collaboration.createRoom();
    const { default: CollaborationWindow } = await import("@/sub/CollaborationWindow");
    CollaborationWindow.open();
    await Dialog.buttons("协作房间已创建", `邀请码：${inviteCode}\n把邀请码发给同伴即可加入。`, [
      { id: "ok", label: "确定" },
    ]);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "创建协作房间失败");
  }
}

export async function onJoinCollaboration() {
  if (!FeatureFlags.USER) {
    toast.error("云服务未启用（缺少 LR_API_BASE_URL）");
    return;
  }
  const inviteCode = await Dialog.input("加入协作", "请输入房间邀请码", {
    placeholder: "例如 ABCD1234",
  });
  if (!inviteCode?.trim()) return;

  const project = new Project(URI.parse(`collab:${inviteCode.trim().toUpperCase()}`));
  loadAllServicesBeforeInit(project);
  await project.init();
  loadAllServicesAfterInit(project);

  try {
    await project.collaboration.joinRoom(inviteCode.trim());
    if (project.collaboration.currentRoomId) {
      project.uri = URI.parse(`collab:${project.collaboration.currentRoomId}`);
    }
    store.set(tabsAtom, [...store.get(tabsAtom), project]);
    store.set(activeTabAtom, project);
    store.set(activeResourceTabAtom, project);
    const { default: CollaborationWindow } = await import("@/sub/CollaborationWindow");
    CollaborationWindow.open();
  } catch (e) {
    project.collaboration.dispose();
    toast.error(e instanceof Error ? e.message : "加入协作失败");
  }
}

function resolveCollaborationProject(): Project | undefined {
  // 协作面板停靠时 activeTab 是面板本身，需用 activeResourceTab / 扫描 tabs
  const candidates = [store.get(activeResourceTabAtom), store.get(activeTabAtom), ...store.get(tabsAtom)];
  for (const tab of candidates) {
    if (tab instanceof Project && tab.collaboration?.isActive) {
      return tab;
    }
  }
  return undefined;
}

export async function onLeaveCollaboration() {
  const project = resolveCollaborationProject();
  if (!project) {
    toast.message("当前不在协作会话中");
    return;
  }
  project.collaboration.leave();
  const { default: CollaborationWindow } = await import("@/sub/CollaborationWindow");
  CollaborationWindow.closeAll();
  toast.success("已离开协作房间");
}

/** 关闭未编辑的空草稿（打开真实文件后清理启动草稿） */
export async function closeEmptyDrafts(except?: Project) {
  const { TabWorkspace } = await import("@/core/TabWorkspace");
  const empties = store
    .get(tabsAtom)
    .filter(
      (tab): tab is Project =>
        tab instanceof Project && tab !== except && !tab.closing && tab.isDraft && tab.stage.length === 0,
    );
  await Promise.all(empties.map((tab) => TabWorkspace.close(tab.id)));
}

export async function onOpenFile(uri?: URI, source: string = "unknown"): Promise<Project | undefined> {
  if (!uri) {
    const path = await open({
      directory: false,
      multiple: false,
      filters: [{ name: "工程文件", extensions: ["prg"] }],
    });
    if (!path) return;
    uri = URI.file(path);
  }

  if (
    store
      .get(tabsAtom)
      .some((p) => (p instanceof Project || p instanceof Extension) && p.uri.toString() === uri.toString())
  ) {
    store.set(
      activeTabAtom,
      store
        .get(tabsAtom)
        .find((p) => (p instanceof Project || p instanceof Extension) && p.uri.toString() === uri.toString())!,
    );
    const tab = store.get(activeTabAtom);
    if (tab && isResourceTab(tab)) store.set(activeResourceTabAtom, tab);
    const activeProject = tab instanceof Project ? tab : undefined;
    if (activeProject) activeProject.loop();
    // const activeExtension = tab instanceof Extension ? tab : undefined;
    // 把其他项目 pause（受设置控制）
    if (Settings.pauseRenderWhenTabUnfocused) {
      store
        .get(tabsAtom)
        .filter((p) => p instanceof Project && p.uri.toString() !== uri.toString())
        .forEach((p) => (p as Project).pause());
    }
    toast.success("切换到已打开的标签页");
    return tab as any;
  }

  const dummyProject = new Project(uri);
  loadAllServicesBeforeInit(dummyProject);
  const tab = await TabFactory.create(uri, dummyProject.fs);
  const t = performance.now();
  if (tab instanceof Project) {
    loadAllServicesBeforeInit(tab);
  } else {
    // Extension 只加载必要的基础服务
    tab.registerFileSystemProvider("file", FileSystemProviderFile);
    tab.registerFileSystemProvider("draft", FileSystemProviderDraft);
  }
  const loadServiceTime = performance.now() - t;

  try {
    await toast
      .promise(
        async () => {
          await tab.init();
          if (tab instanceof Project) {
            if (tab.projectState !== ProjectState.Saved) {
              // 用户取消了升级对话框，不打开文件
              throw new Error("USER_CANCELLED");
            }
            loadAllServicesAfterInit(tab);
            if (tab.wasUpgraded) {
              tab.projectState = ProjectState.Unsaved;
            }
          }
        },
        {
          loading: "正在打开文件...",
          success: async () => {
            const readFileTime = performance.now() - t;
            store.set(tabsAtom, [...store.get(tabsAtom), tab]);
            store.set(activeTabAtom, tab);
            const project = tab instanceof Project ? tab : undefined;
            await RecentFileManager.addRecentFileByUri(uri);
            if (
              isMac &&
              Settings.showRecentFilesThumbnails &&
              uri.scheme === "file" &&
              uri.fsPath.toLowerCase().endsWith(".prg")
            ) {
              void ensurePrgThumbnailCached(uri.fsPath);
            }
            Telemetry.event("打开文件", {
              loadServiceTime,
              readFileTime,
              source,
            });

            // 处理同名TXT文件内容（仅在用户直接打开文件且设置项开启时执行，生成双链时跳过）
            if (
              project &&
              Settings.autoImportTxtFileWhenOpenPrg &&
              source !== "ReferenceBlockNode跳转打开-prg文件" &&
              source !== "ReferencesWindow跳转打开-prg文件"
            ) {
              setTimeout(async () => {
                try {
                  // 构建TXT文件路径
                  const prgPath = uri.fsPath;
                  const txtPath = prgPath.replace(/\.prg$/, ".txt");

                  // 检查TXT文件是否存在
                  if (await exists(txtPath)) {
                    // 读取TXT文件内容
                    const txtContent = await readFile(txtPath);
                    const lines = new TextDecoder()
                      .decode(txtContent)
                      .split("\n")
                      .filter((line) => line.trim() !== "");

                    if (lines.length > 0 && tab instanceof Project) {
                      // 获取舞台上所有实体
                      const entities = tab.stageManager.getEntities();

                      // 计算外接矩形
                      let startY = 0;
                      if (entities.length > 0) {
                        const boundingRect = Rectangle.getBoundingRectangle(
                          entities.map((entity: any) => entity.collisionBox.getRectangle()),
                        );
                        startY = boundingRect.bottom;
                      }

                      // 创建并添加文本节点
                      for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const textNode = new TextNode(tab, {
                          text: line,
                          collisionBox: new CollisionBox([
                            new Rectangle(new Vector(0, startY + i * 100), new Vector(300, 100)),
                          ]),
                          sizeAdjust: "auto",
                        });
                        tab.stageManager.add(textNode);
                      }

                      // 清空TXT文件内容，避免下次打开时重复吸入
                      await writeFile(txtPath, new TextEncoder().encode(""));

                      // 显示Toast提示
                      toast.success(`已从同名TXT文件导入 ${lines.length} 条内容到舞台左下角`);

                      // 发送遥测
                      Telemetry.event("txt_content_imported", {
                        line_count: lines.length,
                      });

                      // 设置项目状态为未保存
                      tab.projectState = ProjectState.Unsaved;
                    }
                  }
                } catch (e) {
                  console.warn("处理TXT文件时发生错误:", e);
                }
              }, 200);
            }

            return `耗时 ${readFileTime}ms${project ? `，共 ${project.stage.length} 个舞台对象，${project.attachments.size} 个附件` : ""}`;
          },
          error: (e) => {
            if (e instanceof Error && e.message === "USER_CANCELLED") {
              return "已取消打开文件";
            }
            Telemetry.event("打开文件失败", {
              error: String(e),
            });
            return `读取时发生错误，已发送错误报告，可在群内联系开发者\n${String(e)}`;
          },
        },
      )
      .unwrap();
  } catch (e) {
    if (e instanceof Error && e.message === "USER_CANCELLED") {
      return undefined; // 用户取消，静默处理
    }
    throw e;
  }
  return tab as any;
}

/**
 * 将旧版 JSON（1.x 系列）或旧版 msgpack 格式文件升级为新版 .prg 文件，
 * 生成在同一目录下，完成后弹窗提示并询问是否立即打开。
 */
export async function onUpgradeOldJson() {
  const path = await open({
    directory: false,
    multiple: false,
    filters: [{ name: "旧版工程文件", extensions: ["json"] }],
  });
  if (!path) return;

  const sourceUri = URI.file(path);
  const fileData = await readFile(sourceUri.fsPath);

  let rawData: Record<string, any>;
  if (fileData[0] === 0x7b) {
    try {
      rawData = JSON.parse(new TextDecoder().decode(fileData));
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      await Dialog.confirm("JSON解析出错", `错误信息：\n${errorMessage}`);
      return;
    }
  } else if (fileData.length >= 2 && fileData[0] === 0x84 && fileData[1] === 0xa7) {
    // 旧版 msgpack（魔数 0x84 0xa7 对应 4-element fixmap）
    const decoded = new Decoder().decode(fileData);
    if (typeof decoded !== "object" || decoded === null) {
      toast.error("文件格式无效，无法解析");
      return;
    }
    rawData = decoded as Record<string, any>;
  } else {
    toast.error("所选文件不是可识别的旧版工程文件（需要 JSON 格式）");
    return;
  }

  const t = performance.now();
  const upgraded = await toast
    .promise(ProjectUpgrader.convertVAnyToN1(rawData, sourceUri), {
      loading: "正在升级旧版工程文件...",
      success: () => {
        const time = performance.now() - t;
        Telemetry.event("升级json->prg", { time, length: fileData.length });
        return `转换成功，耗时 ${time}ms`;
      },
      error: (e) => {
        Telemetry.event("升级json->prg报错", { error: String(e) });
        return `转换失败，已发送错误报告，可在群内联系开发者\n${String(e)}`;
      },
    })
    .unwrap()
    .catch(() => null);
  if (!upgraded) return;

  const prgUri = sourceUri.with({ path: sourceUri.path.replace(/\.json$/, ".prg") });
  const prgPath = prgUri.fsPath;

  if (await exists(prgPath)) {
    const overwrite = await Dialog.confirm(
      "目标文件已存在",
      `文件 "${prgPath.split(/[\\/]/).pop()}" 已存在，是否覆盖？`,
      { destructive: true },
    );
    if (!overwrite) return;
  }

  // loadAllServices + stageManager.updateReferences() 是写入前必须的初始化步骤
  const tempProject = new Project(prgUri);
  loadAllServicesBeforeInit(tempProject);
  await tempProject.init();
  loadAllServicesAfterInit(tempProject);
  tempProject.stage = deserialize(upgraded.data, tempProject);
  tempProject.attachments = upgraded.attachments;
  tempProject.stageManager.updateReferences();
  await tempProject.save();
  await tempProject.dispose();

  const shouldOpen = await Dialog.confirm(
    "升级成功！",
    `已在原文件旁边生成了新文件：\n${prgPath}\n\n是否立即打开该文件？`,
  );
  if (shouldOpen) {
    await onOpenFile(prgUri, "upgradeFromJson");
  }
}

/**
 * 在当前激活的工程文件的同一目录下创建prg文件
 */
export async function createFileAtCurrentProjectDir(activeProject: Project | undefined, refresh: () => Promise<void>) {
  if (!activeProject || activeProject.isDraft) return;

  setTimeout(() => {
    Dialog.input("请输入文件名（不需要输入后缀名）").then(async (userInput) => {
      if (userInput === undefined || userInput.trim() === "") return;

      // 检查文件名是否合法
      const invalidChars = /[\\/:*?"<>|]/;
      if (invalidChars.test(userInput)) {
        toast.error('文件名不能包含以下字符：\\ / : * ? " < > |');
        return;
      }

      // 移除可能存在的.prg后缀
      let fileName = userInput.trim();
      if (fileName.endsWith(".prg")) {
        fileName = fileName.slice(0, -4);
      }

      // 创建新文件路径
      const currentDir = PathString.dirPath(activeProject.uri.fsPath);
      const newFilePath = currentDir + "/" + fileName + ".prg";

      // 检查文件是否已存在
      const fileExists = await exists(newFilePath);
      if (fileExists) {
        toast.error(`文件 "${fileName}.prg" 已存在，请使用其他文件名`);
        return;
      }

      const newUri = URI.file(newFilePath);

      // 创建新项目
      const newProject = Project.newDraft();
      newProject.uri = newUri;

      // 初始化项目
      loadAllServicesBeforeInit(newProject);
      newProject
        .init()
        .then(() => {
          loadAllServicesAfterInit(newProject);
          // 在舞台上创建文本节点
          const newTextNode = new TextNode(newProject, {
            text: fileName,
          });
          newProject.stageManager.add(newTextNode);
          newTextNode.isSelected = true;

          // 保存文件
          newProject
            .save()
            .then(async () => {
              // 更新项目列表和活动项目
              store.set(tabsAtom, [...store.get(tabsAtom), newProject]);
              store.set(activeTabAtom, newProject);
              await RecentFileManager.addRecentFileByUri(newUri);
              await refresh();
              toast.success(`成功创建新文件：${fileName}.prg`);
            })
            .catch((error) => {
              toast.error(`保存文件失败：${String(error)}`);
            });
        })
        .catch((error) => {
          toast.error(`初始化项目失败：${String(error)}`);
        });
    });
  }, 50); // 轻微延迟
}
