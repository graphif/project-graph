import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseEmacsKey } from "@/utils/emacs";
import { ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RenderKey } from "./ui/key-bind";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";

export default function KeyTooltip({ keyId, children = <></> }: { keyId: string; children: ReactNode }) {
  const [keySeq, setKeySeq] = useState<ReturnType<typeof parseEmacsKey>[number][]>();
  const { t } = useTranslation("keyBinds");

  useEffect(() => {
    // 立即获取当前快捷键配置
    const updateKeySeq = (keyBind: any) => {
      if (keyBind) {
        const keyStr = keyBind.key;
        const parsed = parseEmacsKey(keyStr);
        if (parsed.length > 0) {
          setKeySeq(parsed);
        } else {
          setKeySeq(undefined);
        }
      } else {
        setKeySeq(undefined);
      }
    };

    // 初始获取
    const currentKeyBind = KeyBindsUI.getUIKeyBind(keyId);
    updateKeySeq(currentKeyBind);

    // 监听快捷键变化
    const unsubscribe = KeyBindsUI.onKeyBindChange(keyId, updateKeySeq);

    return () => {
      unsubscribe();
    };
  }, [keyId]);

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
