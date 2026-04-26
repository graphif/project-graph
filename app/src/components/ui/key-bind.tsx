import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatEmacsKey } from "@/utils/emacs";
import { formatKeyBindSequence, formatSigalKeyForDisplay, getModifierDisplayTexts } from "@/utils/keyDisplay";
import { Check, Delete, Info } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * 绑定快捷键的组件
 * 非受控！！
 */
export default function KeyBind({
  defaultValue = "",
  onChange = () => {},
  isContinuous = false,
}: {
  defaultValue?: string;
  onChange?: (value: string) => void;
  isContinuous?: boolean;
}) {
  const [choosing, setChoosing] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const { t } = useTranslation("keyBinds");

  const endInputRef = useRef<() => void>(() => {});

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault();
      if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;
      if (isContinuous) {
        // 持续型：只允许单键，录入第一个键后立即完成
        const singleKey = formatEmacsKey(event);
        setValue(singleKey);
        // 延迟调用 endInput 确保 value 已更新
        setTimeout(() => {
          document.removeEventListener("keydown", handleKeyDown);
          document.removeEventListener("mousedown", handleMouseDown);
          document.removeEventListener("mouseup", handleMouseUp);
          document.removeEventListener("wheel", handleWheel);
          setChoosing(false);
          onChange(singleKey);
        }, 0);
      } else {
        setValue((prev) => `${prev} ${formatEmacsKey(event)}`);
      }
    },
    [isContinuous, onChange], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0) {
      setValue((prev) => `${prev} ${formatEmacsKey(event)}`);
    }
  }, []);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setValue((prev) => `${prev} ${formatEmacsKey(event)}`);
  }, []);

  const startInput = useCallback(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("wheel", handleWheel);
    setChoosing(true);
    setValue("");
  }, [handleKeyDown, handleMouseDown, handleMouseUp, handleWheel]);

  const endInputCallback = useCallback(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("wheel", handleWheel);
    setChoosing(false);
    onChange(value.trim());
  }, [handleKeyDown, handleMouseDown, handleMouseUp, handleWheel, value, onChange]);

  useEffect(() => {
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("wheel", handleWheel);
    };
  }, [handleKeyDown, handleMouseDown, handleMouseUp, handleWheel]);

  // 保持 ref 最新
  endInputRef.current = endInputCallback;

  return (
    <>
      {isContinuous && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="bg-accent text-accent-foreground flex cursor-help items-center gap-1 rounded px-1.5 py-0.5 text-xs">
              <Info size={12} />
              {t("continuousShortcut.title")}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("continuousShortcutTooltip.description")}</p>
          </TooltipContent>
        </Tooltip>
      )}
      <Button onClick={startInput} variant={choosing ? "outline" : "default"} className="gap-0">
        {value
          ? formatKeyBindSequence(value.trim()).map((item, index) => (
              <span key={index} className="not-first:before:content-[',_'] flex gap-1 font-bold">
                {item.modifiers.map((modifier, modIndex) => (
                  <span className="bg-card text-foreground rounded-sm px-1 font-semibold" key={modIndex}>
                    {modifier}
                  </span>
                ))}
                {item.key}
              </span>
            ))
          : t("none")}
      </Button>
      {choosing && !isContinuous && (
        <>
          <Button
            onClick={() => {
              setValue((v) => v.trim().split(" ").slice(0, -1).join(" "));
            }}
            size="icon"
          >
            <Delete />
          </Button>
          <Button onClick={endInputCallback} size="icon">
            <Check />
          </Button>
        </>
      )}
    </>
  );
}

/**
 * @deprecated 使用 @/utils/keyDisplay 中的函数替代
 */
export function RenderKey({ data }: { data: ReturnType<typeof import("@/utils/emacs").parseEmacsKey>[number] }) {
  const modifiers = getModifierDisplayTexts(data);
  const keyShow = formatSigalKeyForDisplay(data.key);
  return (
    <span className="not-first:before:content-[',_'] flex gap-1 font-bold">
      {modifiers.map((modifier, index) => (
        <span className="bg-card text-foreground rounded-sm px-1 font-semibold" key={index}>
          {modifier}
        </span>
      ))}
      {data.key.startsWith("<") ? <MouseButton key_={data.key} /> : keyShow}
    </span>
  );
}

/**
 * @deprecated 使用 @/utils/keyDisplay 中的 getModifierDisplayTexts 替代
 */
export function Modifiers({
  modifiers,
}: {
  modifiers: {
    control: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}) {
  const mods = getModifierDisplayTexts(modifiers);
  return mods.map((modifier, index) => (
    <span className="bg-card text-foreground rounded-sm px-1 font-semibold" key={index}>
      {modifier}
    </span>
  ));
}

export function MouseButton({ key_ }: { key_: string }) {
  const button = key_.slice(1, -1);

  return <span>{button === "MWU" ? "鼠标滚轮向上" : button === "MWD" ? "鼠标滚轮向下" : `鼠标按键${button}`}</span>;
}
