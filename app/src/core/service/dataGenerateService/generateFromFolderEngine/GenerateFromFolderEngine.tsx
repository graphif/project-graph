import { Color, Vector } from "@graphif/data-structures";
import { Project, service } from "@/core/Project";
import { invoke } from "@tauri-apps/api/core";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/sprites/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Rectangle } from "@graphif/shapes";

@service("generateFromFolder")
export class GenerateFromFolder {
  constructor(private readonly project: Project) {}

  async generateFromFolder(folderPath: string): Promise<void> {
    const folderStructure = await readFolderStructure(folderPath);
    // 当前的放置点位
    const currentLocation = this.project.camera.location.clone();
    const dfs = (fEntry: FolderEntry, currentSection: Section | null = null) => {
      if (fEntry.is_file) {
        // 是文件，创建文本节点
        const textNode = new TextNode(this.project, {
          text: fEntry.name,
          details: DetailsManager.markdownToDetails(fEntry.path),
          collisionBox: new CollisionBox([new Rectangle(currentLocation.clone(), Vector.getZero())]),
          color: this.getColorByPath(fEntry.path),
        });
        this.project.stageManager.add(textNode);
        if (currentSection) {
          this.project.stageManager.goInSection([textNode], currentSection);
        }
        return textNode;
      } else {
        // 是文件夹，先创建一个Section
        const section = new Section(this.project, {
          text: fEntry.name,
          details: DetailsManager.markdownToDetails(fEntry.path),
          collisionBox: new CollisionBox([new Rectangle(currentLocation.clone(), Vector.getZero())]),
        });
        this.project.stageManager.add(section);
        if (currentSection) {
          this.project.stageManager.goInSection([section], currentSection);
        }
        // 然后递归处理子文件夹
        if (fEntry.children) {
          for (const child of fEntry.children) {
            dfs(child, section);
          }
        }
        return section;
      }
    };
    const rootEntity = dfs(folderStructure);
    this.project.stageManager.clearSelectAll();
    rootEntity.isSelected = true;
    setTimeout(() => {
      this.project.layoutManager.layoutBySelected(this.project.layoutManager.layoutToTightSquare, true);
    });
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

/**
 * 文件结构类型
 */
export type FolderEntry = {
  name: string;
  path: string;
  is_file: boolean;
  children?: FolderEntry[];
};

function readFolderStructure(path: string): Promise<FolderEntry> {
  // 不可能是isWeb的情况了
  return invoke("read_folder_structure", { path });
}
