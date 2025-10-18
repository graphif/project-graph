import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * 根据纯文本生成树状结构
 * @returns
 */
export default function GenerateNodeTree() {
  const [text, setText] = useState("");
  const [indention, setIndention] = useState("4");
  const { t } = useTranslation("globalMenu");

  const [activeProject] = useAtom(activeProjectAtom);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold">{t("actions.generate.generateNodeTreeByText")}</h3>
        <p className="text-muted-foreground mb-4">{t("actions.generate.generateNodeTreeByTextDescription")}</p>
        <p className="text-xs opacity-50">提示：若想让节点内容本身换行，可以输入\n</p>
        <p className="text-xs opacity-50">
          注意：2.0.20+版本，生成树形结构后，先框选所有节点，再按ctrl键+框选所有节点，变成选中所有连线，将所有树内的连线改为从右侧发出，左侧接收，然后再alt
          shift f
          格式化，即可自动布局向右的树状结构（若感到疑惑可进群提问管理员或群主，后期此功能将会继续完善和提高新手友好性）
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("actions.generate.generateNodeTreeByTextPlaceholder")}
        className="min-h-[200px]"
      />
      <div className="flex items-center gap-2">
        <label htmlFor="indention">{t("actions.generate.indention")}:</label>
        <Input
          id="indention"
          type="number"
          value={indention}
          onChange={(e) => setIndention(e.target.value)}
          min="1"
          max="10"
          className="w-20"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            activeProject?.stageManager.generateNodeTreeByText(text, parseInt(indention) || 4);
          }}
        >
          {t("actions.confirm")}
        </Button>
      </div>
    </div>
  );
}

GenerateNodeTree.open = () => {
  SubWindow.create({
    title: "生成节点群",
    children: <GenerateNodeTree />,
    rect: new Rectangle(new Vector(100, 100), new Vector(500, 600)),
  });
};

export function GenerateNodeGraph() {
  const [text, setText] = useState("");
  const { t } = useTranslation("globalMenu");

  const [activeProject] = useAtom(activeProjectAtom);

  return (
    <div>
      <div>
        <h3 className="mb-2 text-xl font-semibold">{t("actions.generate.generateNodeGraphByText")}</h3>
        <p className="text-muted-foreground mb-4">{t("actions.generate.generateNodeGraphByTextDescription")}</p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("actions.generate.generateNodeGraphByTextPlaceholder")}
        className="min-h-[200px]"
      />
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            activeProject?.stageManager.generateNodeGraphByText(text);
          }}
        >
          {t("actions.confirm")}
        </Button>
      </div>
    </div>
  );
}

GenerateNodeGraph.open = () => {
  SubWindow.create({
    title: "生成节点网",
    children: <GenerateNodeGraph />,
    rect: new Rectangle(new Vector(100, 100), new Vector(600, 600)),
  });
};

/**
 * 根据mermaid文本生成框嵌套网状结构
 * @returns
 */
export function GenerateNodeMermaid() {
  const [text, setText] = useState("");
  const { t } = useTranslation("globalMenu");

  const [activeProject] = useAtom(activeProjectAtom);

  return (
    <div>
      <div>
        <h3 className="mb-2 text-xl font-semibold">{t("actions.generate.generateNodeMermaidByText")}</h3>
        <p className="text-muted-foreground mb-4">{t("actions.generate.generateNodeMermaidByTextDescription")}</p>
        <p className="text-xs opacity-50">示例格式：</p>
        <pre className="bg-muted mb-4 rounded p-2 text-xs opacity-50">
          graph TD; A[Section A] --{">"} B[Section B]; A --{">"} C[普通节点]; B --{">"} D[另一个节点]; E[Section E] --
          {">"} F[F];
        </pre>
        <p className="text-xs opacity-50">
          注意：节点名称中包含 Section 、 章节 、组 或 容器 关键词的将被创建为框（Section）。
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("actions.generate.generateNodeMermaidByTextPlaceholder")}
        className="min-h-[200px]"
      />
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            activeProject?.stageManager.generateNodeMermaidByText(text);
          }}
        >
          {t("actions.confirm")}
        </Button>
      </div>
    </div>
  );
}

GenerateNodeMermaid.open = () => {
  SubWindow.create({
    title: "生成框嵌套网状结构",
    children: <GenerateNodeMermaid />,
    rect: new Rectangle(new Vector(100, 100), new Vector(600, 600)),
  });
};
