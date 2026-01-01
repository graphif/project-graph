import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { activeProjectAtom } from "@/state";
import { parseEmacsKey } from "@/utils/emacs";
import { useAtom } from "jotai";
import { ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RenderKey } from "./ui/key-bind";

export default function KeyTooltip({ keyId, children = <></> }: { keyId: string; children: ReactNode }) {
  const [keySeq, setKeySeq] = useState<ReturnType<typeof parseEmacsKey>[number][]>();
  const [activeProject] = useAtom(activeProjectAtom);
  const { t } = useTranslation("keyBinds");

  useEffect(() => {
    activeProject?.keyBinds.get(keyId)?.then((key) => {
      if (key) {
        const keyStr = typeof key === "string" ? key : key.key;
        const parsed = parseEmacsKey(keyStr);
        if (parsed.length > 0) {
          setKeySeq(parsed);
        } else {
          setKeySeq(undefined);
        }
      } else {
        setKeySeq(undefined);
      }
    });
  }, [keyId, activeProject]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      {/* 给下面的组件加属性，sideOffset={12}，可以缓解右键菜单按钮比较密集的tooltip遮挡的问题 */}
      <TooltipContent className="pointer-events-none flex gap-2">
        <span>{t(`${keyId}.title`)}</span>
        <div className="flex">
          {keySeq ? keySeq.map((data, index) => <RenderKey key={index} data={data} />) : "[未绑定快捷键]"}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
