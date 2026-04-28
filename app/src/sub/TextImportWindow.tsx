import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubWindow } from "@/core/service/SubWindow";
import { activeTabAtom } from "@/state";
import { TextFileImporter } from "@/core/service/dataGenerateService/TextFileImporter";
import { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { FileText, FolderOpen, List, FileUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TextImportWindow() {
  const [tab] = useAtom(activeTabAtom);
  const project = tab instanceof Project ? tab : undefined;
  const [fileContent, setFileContent] = useState<{ fileName: string; content: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [lineCount, setLineCount] = useState(1);
  const [sentenceCount, setSentenceCount] = useState(3);
  const [customSeparator, setCustomSeparator] = useState("===");

  const handleSelectFile = async () => {
    if (!project) return;
    setIsLoading(true);
    try {
      const result = await TextFileImporter.getTextFileContent();
      if (result) {
        setFileContent(result);
      }
    } catch (error) {
      toast.error("读取文件失败");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportAsFile = async () => {
    if (!project) return;
    setIsLoading(true);
    try {
      const count = await TextFileImporter.importTextFiles(project);
      if (count > 0) {
        toast.success(`成功导入 ${count} 个文件`);
      }
    } catch (error) {
      toast.error("导入失败");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const splitByLines = (text: string, linesPerGroup: number): string[] => {
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const groups: string[] = [];
    for (let i = 0; i < lines.length; i += linesPerGroup) {
      const group = lines.slice(i, i + linesPerGroup).join("\n");
      groups.push(group);
    }
    return groups;
  };

  const splitBySentences = (text: string, sentencesPerGroup: number): string[] => {
    const sentences = text
      .split(/(?<=[。！？.!?])\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const groups: string[] = [];
    for (let i = 0; i < sentences.length; i += sentencesPerGroup) {
      const group = sentences.slice(i, i + sentencesPerGroup).join(" ");
      groups.push(group);
    }
    return groups;
  };

  const splitByCustomSeparator = (text: string, separator: string): string[] => {
    if (!separator) return [text];
    const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text
      .split(new RegExp(escapedSeparator))
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  };

  const createNodesFromParts = (parts: string[]) => {
    if (!project || parts.length === 0) return;

    const startX = 100;
    const startY = 100;
    const nodeWidth = 350;
    const verticalGap = 20;
    let currentY = startY;

    for (const part of parts) {
      const node = new TextNode(project, {
        text: part,
        color: new Color(0, 0, 0, 0),
        collisionBox: new CollisionBox([new Rectangle(new Vector(startX, currentY), new Vector(nodeWidth, 50))]),
        sizeAdjust: "auto",
      });
      project.stageManager.add(node);
      currentY += node.collisionBox.getRectangle().size.y + verticalGap;
    }
    project.historyManager.recordStep();
  };

  const handleSplitByLine = () => {
    if (!fileContent) return;
    const parts = splitByLines(fileContent.content, lineCount);
    createNodesFromParts(parts);
    toast.success(`已创建 ${parts.length} 个文本节点`);
  };

  const handleSplitBySentence = () => {
    if (!fileContent) return;
    const parts = splitBySentences(fileContent.content, sentenceCount);
    createNodesFromParts(parts);
    toast.success(`已创建 ${parts.length} 个文本节点`);
  };

  const handleSplitByCustom = () => {
    if (!fileContent) return;
    if (!customSeparator.trim()) {
      toast.error("请输入自定义分隔符");
      return;
    }
    const parts = splitByCustomSeparator(fileContent.content, customSeparator);
    createNodesFromParts(parts);
    toast.success(`已创建 ${parts.length} 个文本节点`);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center gap-2 border-b pb-4">
        <FileText className="h-5 w-5" />
        <span className="text-lg font-semibold">文本导入工具</span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-muted-foreground text-sm">
          将文本文件拆分为多个文本节点，然后可通过右键菜单进行AI处理。
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleSelectFile}
            disabled={!project || isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            选择文件
          </Button>
          <Button
            onClick={handleImportAsFile}
            disabled={!project || isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileUp className="h-4 w-4" />
            导入整个文件
          </Button>
        </div>

        <div className="text-muted-foreground text-xs">
          • <b>选择文件</b>：预览内容后可进行拆分
          <br />• <b>导入整个文件</b>：直接将文件内容创建为节点
        </div>

        {fileContent && (
          <div className="mt-2 rounded-md border p-3">
            <div className="mb-2 font-medium">
              {fileContent.fileName} ({fileContent.content.length} 字)
            </div>
            <div className="text-muted-foreground max-h-32 overflow-auto whitespace-pre-wrap text-sm">
              {fileContent.content.slice(0, 500)}
              {fileContent.content.length > 500 && "..."}
            </div>
          </div>
        )}

        <div className="mt-2 border-t pt-4">
          <div className="mb-2 text-sm font-medium">拆分设置</div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-muted-foreground mb-1 text-xs">按行拆分（每N行合并为一个节点）</div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={lineCount}
                    onChange={(e) => setLineCount(parseInt(e.target.value) || 1)}
                    className="w-16"
                    disabled={!fileContent || isLoading}
                  />
                  <span className="self-center text-xs">行/节点</span>
                  <Button
                    onClick={handleSplitByLine}
                    disabled={!fileContent || isLoading}
                    variant="secondary"
                    size="sm"
                  >
                    <List className="mr-1 h-4 w-4" />
                    拆分
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-muted-foreground mb-1 text-xs">
                  按句子拆分（根据句号、问号、感叹号，每N句合并）
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={sentenceCount}
                    onChange={(e) => setSentenceCount(parseInt(e.target.value) || 3)}
                    className="w-16"
                    disabled={!fileContent || isLoading}
                  />
                  <span className="self-center text-xs">句/节点</span>
                  <Button
                    onClick={handleSplitBySentence}
                    disabled={!fileContent || isLoading}
                    variant="secondary"
                    size="sm"
                  >
                    <List className="mr-1 h-4 w-4" />
                    拆分
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-muted-foreground mb-1 text-xs">按自定义符号拆分（识别到该符号时切分）</div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={customSeparator}
                    onChange={(e) => setCustomSeparator(e.target.value)}
                    className="w-24"
                    placeholder="==="
                    disabled={!fileContent || isLoading}
                  />
                  <Button
                    onClick={handleSplitByCustom}
                    disabled={!fileContent || isLoading || !customSeparator.trim()}
                    variant="secondary"
                    size="sm"
                  >
                    <List className="mr-1 h-4 w-4" />
                    拆分
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function openTextImportWindow() {
  SubWindow.create({
    title: "文本导入",
    children: <TextImportWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(420, 480)),
    closable: true,
    closeWhenClickOutside: false,
  });
}
