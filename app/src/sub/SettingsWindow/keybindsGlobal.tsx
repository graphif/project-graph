import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  globalShortcutManager,
  type GlobalShortcutInfo,
} from "@/core/service/controlService/shortcutKeysEngine/GlobalShortcutManager";
import { isMac } from "@/utils/platform";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const modifierKeys = new Set(["Alt", "Control", "Meta", "Shift"]);

function keyboardEventToAccelerator(event: KeyboardEvent) {
  const modifiers: string[] = [];
  if (event.shiftKey) modifiers.push("Shift");
  if (event.ctrlKey) modifiers.push("Control");
  if (event.altKey) modifiers.push("Alt");
  if (event.metaKey) modifiers.push("Super");
  return [...modifiers, event.code].join("+");
}

function formatAccelerator(accelerator: string) {
  return accelerator
    .split("+")
    .map((part) => {
      if (part === "Control") return "Ctrl";
      if (part === "Super") return isMac ? "Command" : "Super";
      if (part.startsWith("Key")) return part.slice(3);
      if (part.startsWith("Digit")) return part.slice(5);
      return part;
    })
    .join(" + ");
}

function GlobalShortcutInput({
  value,
  disabled,
  onChange,
  onRecordingChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => Promise<void>;
  onRecordingChange: (isRecording: boolean) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat || modifierKeys.has(event.key)) return;
      if (!event.code || event.code === "Unidentified") {
        toast.warning("无法识别这个按键，请换一个组合键");
        return;
      }
      setIsRecording(false);
      void onChange(keyboardEventToAccelerator(event)).finally(() => onRecordingChange(false));
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isRecording, onChange, onRecordingChange]);

  useEffect(() => () => onRecordingChange(false), [onRecordingChange]);

  return (
    <Button
      type="button"
      variant={isRecording ? "outline" : "default"}
      disabled={disabled}
      aria-label="录入全局快捷键"
      onClick={() => {
        setIsRecording(true);
        onRecordingChange(true);
      }}
    >
      {isRecording ? "请按下快捷键" : formatAccelerator(value)}
    </Button>
  );
}

export default function KeyBindsGlobalPage() {
  const [shortcuts, setShortcuts] = useState<GlobalShortcutInfo[]>(() => globalShortcutManager.getShortcuts());
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    let isMounted = true;
    globalShortcutManager
      .init()
      .then(() => {
        if (isMounted) setShortcuts(globalShortcutManager.getShortcuts());
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : String(error));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    globalShortcutManager.setRecording(isRecording);
    return () => globalShortcutManager.setRecording(false);
  }, [isRecording]);

  const updateShortcut = async (update: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await update();
      setShortcuts(globalShortcutManager.getShortcuts());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {shortcuts.map((shortcut) => {
        const Icon = shortcut.icon;
        return (
          <Field
            key={shortcut.id}
            icon={<Icon />}
            title={shortcut.title}
            description={shortcut.description}
            className="border-accent border-b"
          >
            <div className="flex items-center gap-3">
              <GlobalShortcutInput
                value={shortcut.key}
                disabled={isBusy || isRecording}
                onChange={(key) => updateShortcut(() => globalShortcutManager.setShortcutKey(shortcut.id, key))}
                onRecordingChange={setIsRecording}
              />
              <Switch
                checked={shortcut.isEnabled}
                disabled={isBusy || isRecording}
                aria-label={`${shortcut.title}开关`}
                onCheckedChange={(isEnabled) =>
                  updateShortcut(() => globalShortcutManager.setShortcutEnabled(shortcut.id, isEnabled))
                }
              />
            </div>
          </Field>
        );
      })}
    </div>
  );
}
