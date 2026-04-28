import { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

export namespace TextFileImporter {
  export async function importTextFiles(project: Project): Promise<number> {
    const pathList = await open({
      title: "选择文本文件",
      directory: false,
      multiple: true,
      filters: [
        {
          name: "文本文件",
          extensions: [
            "txt",
            "md",
            "markdown",
            "json",
            "csv",
            "xml",
            "html",
            "css",
            "js",
            "ts",
            "tsx",
            "jsx",
            "py",
            "java",
            "c",
            "cpp",
            "h",
            "hpp",
            "go",
            "rs",
            "rb",
            "php",
            "sql",
            "sh",
            "bat",
            "yaml",
            "yml",
            "toml",
            "ini",
            "conf",
            "log",
          ],
        },
      ],
    });

    if (!pathList) {
      return 0;
    }

    const paths = Array.isArray(pathList) ? pathList : [pathList];
    let importedCount = 0;

    const startX = 100;
    const startY = 100;
    const nodeWidth = 300;
    const nodeHeight = 150;
    const horizontalGap = 50;
    const verticalGap = 50;
    const nodesPerRow = 4;

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      try {
        const content = await readFile(path);
        const text = new TextDecoder().decode(content);
        const fileName = path.split(/[/\\]/).pop() || "未命名";

        const row = Math.floor(i / nodesPerRow);
        const col = i % nodesPerRow;
        const x = startX + col * (nodeWidth + horizontalGap);
        const y = startY + row * (nodeHeight + verticalGap);

        const node = new TextNode(project, {
          text: `【${fileName}】\n\n${text.slice(0, 2000)}${text.length > 2000 ? "..." : ""}`,
          color: new Color(0, 0, 0, 0),
          collisionBox: new CollisionBox([new Rectangle(new Vector(x, y), new Vector(nodeWidth, nodeHeight))]),
          sizeAdjust: "manual",
        });

        project.stageManager.add(node);
        importedCount++;
      } catch (error) {
        console.error(`导入文件失败: ${path}`, error);
      }
    }

    if (importedCount > 0) {
      project.historyManager.recordStep();
    }

    return importedCount;
  }

  export async function getTextFileContent(): Promise<{ fileName: string; content: string } | null> {
    const pathList = await open({
      title: "选择文本文件",
      directory: false,
      multiple: false,
      filters: [
        {
          name: "文本文件",
          extensions: ["txt", "md", "markdown", "json", "csv"],
        },
      ],
    });

    if (!pathList) {
      return null;
    }

    const path = Array.isArray(pathList) ? pathList[0] : pathList;

    try {
      const content = await readFile(path);
      const text = new TextDecoder().decode(content);
      const fileName = path.split(/[/\\]/).pop() || "未命名";

      return { fileName, content: text };
    } catch (error) {
      console.error(`读取文件失败: ${path}`, error);
      return null;
    }
  }
}
