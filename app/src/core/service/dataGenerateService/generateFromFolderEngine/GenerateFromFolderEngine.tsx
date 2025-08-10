import { service } from "@/core/Project";
import { Color } from "@graphif/color";

@service("generateFromFolder")
export class GenerateFromFolder {
  // constructor(private readonly project: Project) {}

  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateFromFolder(folderPath: string): Promise<void> {
    // TODO: 读取文件夹结构并生成图
    // const folderStructure = await readFolderStructure(folderPath);
    // // 当前的放置点位
    // const currentLocation = this.project.camera.location.clone();
    // const dfs = (fEntry: FolderEntry, currentSection: Section | null = null) => {
    //   if (fEntry.is_file) {
    //     // 是文件，创建文本节点
    //     const textNode = new TextNode(this.project, {
    //       uuid: v4(),
    //       text: fEntry.name,
    //       details: fEntry.path,
    //       location: currentLocation.toArray(),
    //       color: this.getColorByPath(fEntry.path).toArray(),
    //     });
    //     this.project.stageManager.add(textNode);
    //     if (currentSection) {
    //       this.project.stageManager.goInSection([textNode], currentSection);
    //     }
    //     return textNode;
    //   } else {
    //     // 是文件夹，先创建一个Section
    //     const section = new Section({
    //       uuid: v4(),
    //       text: fEntry.name,
    //       details: fEntry.path,
    //       location: currentLocation.toArray(),
    //     });
    //     this.project.stageManager.add(section);
    //     if (currentSection) {
    //       this.project.stageManager.goInSection([section], currentSection);
    //     }
    //     // 然后递归处理子文件夹
    //     if (fEntry.children) {
    //       for (const child of fEntry.children) {
    //         dfs(child, section);
    //       }
    //     }
    //     return section;
    //   }
    // };
    // const rootEntity = dfs(folderStructure);
    // LayoutToTightSquareManager.layoutToTightSquare([rootEntity]);
  }

  private getColorByPath(path: string): Color {
    if (path.includes(".")) {
      const ext = path.split(".").pop() as string;
      if (ext in GenerateFromFolder.fileExtColorMap) {
        return Color.fromHex(GenerateFromFolder.fileExtColorMap[ext]);
      } else {
        return Color.Transparent;
      }
    } else {
      return Color.Transparent;
    }
  }

  static fileExtColorMap: Record<string, string> = {
    txt: "#000000",
    md: "#000000",
    html: "#4ec9b0",
    css: "#da70cb",
    js: "#dcdcaa",
    mp4: "#181818",
    mp3: "#ca64ea",
    png: "#7a9a81",
    psd: "#001d26",
    jpg: "#49644e",
    jpeg: "#49644e",
    gif: "#ffca28",
  };
}
