import { Button } from "@/components/ui/button";
import { formatEmacsKey } from "@/utils/emacs";
import { formatKeyBindSequence, formatSigalKeyForDisplay, getModifierDisplayTexts } from "@/utils/keyDisplay";
import { Check, Delete } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * 绑定快捷键的组件
 * 非受控！！
 */
export default function KeyBind({
  defaultValue = "",
  onChange = () => {},
}: {
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const [choosing, setChoosing] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const { t } = useTranslation("keyBinds");

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;
    setValue((prev) => `${prev} ${formatEmacsKey(event)}`);
  }, []);

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

  const endInput = useCallback(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("wheel", handleWheel);
    setChoosing(false);
    onChange(value.trim());
  }, [handleKeyDown, handleMouseDown, handleMouseUp, handleWheel, value, onChange]);

  return (
    <>
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
      {choosing && (
        <>
          <Button
            onClick={() => {
              setValue((v) => v.trim().split(" ").slice(0, -1).join(" "));
            }}
            size="icon"
          >
            <Delete />
          </Button>
          <Button onClick={endInput} size="icon">
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
