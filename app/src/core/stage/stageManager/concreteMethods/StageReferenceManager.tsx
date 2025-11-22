import { Project, service } from "@/core/Project";
import { Vector } from "@graphif/data-structures";
import { Section } from "../../stageObject/entity/Section";
import { toast } from "sonner";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { PathString } from "@/utils/pathString";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { ReferenceBlockNode } from "../../stageObject/entity/ReferenceBlockNode";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
import { SectionReferencePanel } from "@/sub/ReferencesWindow";
import { loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { projectsAtom, store } from "@/state";

interface parserResult {
  /**
   * 是否是一个合法的引用块内容
   */
  isValid: boolean;
  /**
   * 不合法的原因
   */
  invalidReason: string;
  /**
   * 引用的文件名
   */
  fileName: string;
  /**
   * 引用的章节名，为空表示引用整个文件
   */
  sectionName: string;
}

@service("referenceManager")
export class ReferenceManager {
  constructor(private readonly project: Project) {}

  /**
   * 保险检查函数
   * 解析用户在文本节点中输入的引用格式文本，防止直接退出编辑模式后触发转换，导致引用块内容被错误解析
   * @param text 引用块文本
   * @returns
   */
  public static referenceBlockTextParser(text: string): parserResult {
    if (!text.startsWith("[[") || !text.endsWith("]]")) {
      return {
        isValid: false,
        invalidReason: "引用块内容格式错误, 必须用双中括号包裹起来，且双中括号外侧不能有空格",
        fileName: "",
        sectionName: "",
      };
    }
    const content = text.slice(2, -2);
    if (content.includes("#")) {
      const [fileName, sectionName] = content.split("#");
      if (!fileName) {
        return {
          isValid: false,
          invalidReason: "引用块格式错误，文件名不能为空",
          fileName: "",
          sectionName: "",
        };
      }
      if (!sectionName) {
        return {
          isValid: false,
          invalidReason: "引用块格式错误，章节名不能为空",
          fileName: fileName,
          sectionName: "",
        };
      }
      return {
        isValid: true,
        invalidReason: "",
        fileName: fileName,
        sectionName: sectionName,
      };
    } else {
      if (!content) {
        return {
          isValid: false,
          invalidReason: "引用块内容格式错误, 文件名不能为空",
          fileName: "",
          sectionName: "",
        };
      }
      return {
        isValid: true,
        invalidReason: "",
        fileName: content,
        sectionName: "",
      };
    }
  }

  /**
   * 处理引用按钮点击事件
   * O(N) 需要查找每一个引用的Section
   * @param clickLocation 点击位置
   */
  public onClickReferenceNumber(clickLocation: Vector) {
    if (Object.keys(this.project.references.sections).length === 0) return;
    const sectionNameMap = this.buildSectionName2SectionMap(Object.keys(this.project.references.sections));
    for (const sectionName in this.project.references.sections) {
      const section = sectionNameMap[sectionName];
      if (section) {
        if (section.isMouseInReferenceButton(clickLocation)) {
          // 打开这个详细信息的引用弹窗
          this.openSectionReferencePanel(section);
          return;
        }
      }
    }
  }

  private buildSectionName2SectionMap(sectionNames: string[]): Record<string, Section> {
    const res: Record<string, Section> = {};
    const sectionNameSet = new Set(sectionNames);
    for (const section of this.project.stage.filter((obj) => obj instanceof Section)) {
      if (sectionNameSet.has(section.text)) {
        res[section.text] = section;
      }
    }
    return res;
  }

  /**
   * 更新当前项目的引用信息
   * （清理无效的引用）
   */
  public async updateCurrentProjectReference() {
    const recentFiles = await RecentFileManager.getRecentFiles();

    // 遍历当前项目的每一个被引用的Section框
    for (const sectionName in this.project.references.sections) {
      const fileNameList = this.project.references.sections[sectionName];
      const fileNameListNew = [];
      for (const fileName of fileNameList) {
        const file = recentFiles.find(
          (file) =>
            PathString.getFileNameFromPath(file.uri.path) === fileName ||
            PathString.getFileNameFromPath(file.uri.fsPath) === fileName,
        );
        if (file) {
          // 即使文件存在，也要打开看一看引用块是否在那个文件中。
          const thatProject = new Project(file.uri);
          loadAllServicesBeforeInit(thatProject);
          await thatProject.init();
          if (this.checkReferenceBlockInProject(thatProject, fileName, sectionName)) {
            fileNameListNew.push(fileName);
          }
          thatProject.dispose();
        }
      }
      if (fileNameListNew.length === 0) {
        // 直接把这个章节从引用列表中删除
        delete this.project.references.sections[sectionName];
      } else {
        this.project.references.sections[sectionName] = fileNameListNew;
      }
    }

    // 遍历每一个直接引用自己整个文件的文件
    const fileNameListNew = [];
    for (const fileName of this.project.references.files) {
      const file = recentFiles.find(
        (file) =>
          PathString.getFileNameFromPath(file.uri.path) === fileName ||
          PathString.getFileNameFromPath(file.uri.fsPath) === fileName,
      );
      if (file) {
        // 即使文件存在，也要打开看一看引用块是否在那个文件中。
        const thatProject = new Project(file.uri);
        loadAllServicesBeforeInit(thatProject);
        await thatProject.init();
        if (this.checkReferenceBlockInProject(thatProject, fileName, "")) {
          fileNameListNew.push(fileName);
        }
        thatProject.dispose();
      }
    }
    this.project.references.files = fileNameListNew;
  }

  public checkReferenceBlockInProject(project: Project, fileName: string, sectionName: string) {
    const referenceBlocks = project.stage
      .filter((object) => object instanceof ReferenceBlockNode)
      .filter(
        (referenceBlockNode) =>
          referenceBlockNode.fileName === fileName && referenceBlockNode.sectionName === sectionName,
      );
    if (referenceBlocks.length > 0) {
      return true;
    }
    return false;
  }

  public async insertRefDataToSourcePrgFile(fileName: string, sectionName: string) {
    // 更新被引用文件的reference.msgpack
    const currentFileName = PathString.getFileNameFromPath(this.project.uri.path);
    if (!currentFileName) return;

    try {
      // 根据文件名查找被引用文件
      const recentFiles = await RecentFileManager.getRecentFiles();
      const referencedFile = recentFiles.find(
        (file) =>
          PathString.getFileNameFromPath(file.uri.path) === fileName ||
          PathString.getFileNameFromPath(file.uri.fsPath) === fileName,
      );
      if (!referencedFile) return;

      // 先检查当前是否已经打开了该文件的Project实例
      const allProjects = store.get(projectsAtom);
      let referencedProject = allProjects.find((project) => {
        const projectFileName = PathString.getFileNameFromPath(project.uri.path);
        const projectFileNameFs = PathString.getFileNameFromPath(project.uri.fsPath);
        return projectFileName === fileName || projectFileNameFs === fileName;
      });

      // 如果没有打开，则创建新的Project实例
      let shouldDisposeProject = false;
      if (!referencedProject) {
        referencedProject = new Project(referencedFile.uri);
        loadAllServicesBeforeInit(referencedProject);
        await referencedProject.init();
        shouldDisposeProject = true;
      }

      // 更新引用
      if (sectionName) {
        // 引用特定Section的情况
        if (!referencedProject.references.sections[sectionName]) {
          referencedProject.references.sections[sectionName] = [];
        }

        // 确保数组中没有重复的文件名
        const index = referencedProject.references.sections[sectionName].indexOf(currentFileName);
        if (index === -1) {
          referencedProject.references.sections[sectionName].push(currentFileName);
          // 保存更新
          await referencedProject.save();
        }
      } else {
        // 引用整个文件的情况
        if (!referencedProject.references.files) {
          referencedProject.references.files = [];
        }

        // 确保数组中没有重复的文件名
        const index = referencedProject.references.files.indexOf(currentFileName);
        if (index === -1) {
          referencedProject.references.files.push(currentFileName);
          // 保存更新
          await referencedProject.save();
        }
      }

      // 只有在我们创建的情况下才需要dispose
      if (shouldDisposeProject) {
        await referencedProject.dispose();
      }
    } catch (error) {
      toast.error("更新reference.msgpack失败：" + String(error));
    }
  }

  /**
   * 从源头 跳转到引用位置
   * @param section
   */
  public async jumpToReferenceLocation(fileName: string, referenceBlockNodeSectionName: string) {
    const recentFiles = await RecentFileManager.getRecentFiles();
    const file = recentFiles.find(
      (file) =>
        PathString.getFileNameFromPath(file.uri.path) === fileName ||
        PathString.getFileNameFromPath(file.uri.fsPath) === fileName,
    );
    if (!file) {
      toast.error(`文件 ${fileName} 未找到`);
      return;
    }
    const project = await onOpenFile(file.uri, "ReferencesWindow跳转打开-prg文件");
    // 从被引用的源头，跳转到引用的地方
    if (project && referenceBlockNodeSectionName) {
      setTimeout(() => {
        const referenceBlockNode = project.stage
          .filter((o) => o instanceof ReferenceBlockNode)
          .find((o) => o.sectionName === referenceBlockNodeSectionName);
        if (referenceBlockNode) {
          const center = referenceBlockNode.collisionBox.getRectangle().center;
          project.camera.location = center;
          // 加一个特效
          project.effects.addEffect(RectangleLittleNoteEffect.fromUtilsSlowNote(referenceBlockNode));
        } else {
          toast.error(`没有找到引用标题为 “${referenceBlockNodeSectionName}” 的引用块节点`);
        }
      }, 100);
    }
  }

  private openSectionReferencePanel(section: Section) {
    // 打开这个详细信息的引用弹窗
    SectionReferencePanel.open(
      this.project.uri,
      section.text,
      this.project.renderer.transformWorld2View(section.rectangle.leftTop),
    );
  }

  private findSectionBySectionName(sectionName: string) {
    const section = this.project.stage
      .filter((object) => object instanceof Section)
      .find((section) => section.text === sectionName);
    if (section) {
      return section;
    }
    return null;
  }
}
