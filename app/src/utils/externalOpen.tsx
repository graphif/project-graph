import { Project } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { open } from "@tauri-apps/plugin-shell";
import { toast } from "sonner";
import { PathString } from "./pathString";
import { URI } from "vscode-uri";
import { onOpenFile } from "@/core/service/GlobalMenu";

export async function openBrowserOrFile(project: Project) {
  for (const node of project.stageManager.getSelectedEntities()) {
    openBrowserOrFileByEntity(node, project);
  }
}

export function openBrowserOrFileByEntity(entity: Entity, project: Project) {
  if (entity instanceof TextNode) {
    openOneTextNode(entity, project);
  } else {
    openOneEntity(entity, project);
  }
}

function openOneEntity(node: Entity, project: Project) {
  let targetUrl = "";
  if (node.details.length > 0) {
    targetUrl = getEntityDetailsFirstLine(node);
  }
  targetUrl = splitDoubleQuote(targetUrl);
  myOpen(targetUrl, project);
}

/**
 * 打开一个文本节点url
 * 先看看详细信息的第一行是不是内容，如果符合，就根据它打开
 * 如果不符合，就根据内容打开
 * @param node
 */
function openOneTextNode(node: TextNode, project: Project) {
  let targetUrl = node.text;
  targetUrl = splitDoubleQuote(targetUrl);
  if (node.details.length > 0) {
    targetUrl = getEntityDetailsFirstLine(node);
  }
  myOpen(targetUrl, project);
  // 2025年1月4日——有自动备份功能了，好像不需要再加验证了
}

function getEntityDetailsFirstLine(node: Entity): string {
  let res = "";
  if (node.details.length > 0) {
    // 说明详细信息里面有内容，看看第一个内容是不是p标签
    const firstLine = node.details[0];
    if (firstLine.type === "p") {
      for (const child of firstLine.children) {
        if (typeof child.text === "string") {
          res = child.text;
        }
        break;
      }
    }
  }
  return res;
}

/**
 * 去除字符串两端的引号
 * @param str
 */
function splitDoubleQuote(str: string) {
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * 调用tauri框架的open方法
 * @param url
 * @param project 之所以需要project参数，是因为需要根据project的uri来转换相对路径
 */
function myOpen(url: string, project: Project) {
  const isValidURL = PathString.isValidURL(url);
  if (isValidURL) {
    // 是网址
    toast.info(`正在打开网址：【${url}】`);
  } else {
    toast.info(`正在打开本地文件路径：【${url}】`);
  }
  if (!isValidURL) {
    // 是文件路径
    if (url.startsWith("./") || url.startsWith("../")) {
      // 是相对路径！转成绝对路径
      let currentProjectPath = PathString.uppercaseAbsolutePathDiskChar(project.uri.fsPath);
      currentProjectPath = currentProjectPath.replaceAll("\\", "/");
      url = PathString.relativePathToAbsolutePath(currentProjectPath, url);
      console.log("转换后的url", url);
    }
    if (url.endsWith(".prg")) {
      // 打开绝对路径 prg文件
      const uri = URI.file(url);
      onOpenFile(uri, "externalOpen-myOpen-prg文件");
      return;
    }
  }
  open(url)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .then((_) => {
      console.log("打开成功");
    })
    .catch((e) => {
      // 依然会导致程序崩溃，具体原因未知
      // 2025年2月17日，好像不会再崩溃了，只是可能会弹窗说找不到文件
      console.error(e);
    });
}
