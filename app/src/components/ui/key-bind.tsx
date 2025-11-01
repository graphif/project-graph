import { Button } from "@/components/ui/button";
import { formatEmacsKey, parseEmacsKey } from "@/utils/emacs";
import { isLinux, isMac, isWindows } from "@/utils/platform";
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
  const { t } = useTranslation("keys");

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;
    setValue((prev) => prev + " " + formatEmacsKey(event));
  }, []);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0) {
      setValue((prev) => prev + " " + formatEmacsKey(event));
    }
  }, []);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setValue((prev) => prev + " " + formatEmacsKey(event));
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
        {value ? parseEmacsKey(value.trim()).map((key, index) => <RenderKey key={index} data={key} />) : t("none")}
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

export function RenderKey({ data }: { data: ReturnType<typeof parseEmacsKey>[number] }) {
  return (
    <span className="not-first:before:content-[',_'] inline-flex gap-1">
      <Modifiers modifiers={data} />
      {data.key.startsWith("<") ? <MouseButton key_={data.key} /> : data.key}
    </span>
  );
}

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
  const mods = [];

  if (modifiers.control) {
    if (isMac) {
      mods.push("⌃");
    } else if (isWindows) {
      mods.push("Ctrl");
    } else if (isLinux) {
      mods.push("Ctrl");
    } else {
      mods.push("control");
    }
  }
  if (modifiers.alt) {
    if (isMac) {
      mods.push("⌥");
    } else if (isWindows) {
      mods.push("Alt");
    } else if (isLinux) {
      mods.push("Alt");
    } else {
      mods.push("alt");
    }
  }
  if (modifiers.shift) {
    if (isMac) {
      mods.push("⇧");
    } else if (isWindows) {
      mods.push("Shift");
    } else if (isLinux) {
      mods.push("Shift");
    } else {
      mods.push("shift");
    }
  }
  if (modifiers.meta) {
    if (isMac) {
      mods.push("⌘");
    } else if (isWindows) {
      mods.push("❖");
    } else if (isLinux) {
      mods.push("Super");
    } else {
      mods.push("meta");
    }
  }
  return mods.map((modifier, index) => <span key={index}>{modifier}</span>);
}

export function MouseButton({ key_ }: { key_: string }) {
  const button = key_.slice(1, -1);

  return <span>{button === "MWU" ? "鼠标滚轮向上" : button === "MWD" ? "鼠标滚轮向下" : `鼠标按键${button}`}</span>;
}
