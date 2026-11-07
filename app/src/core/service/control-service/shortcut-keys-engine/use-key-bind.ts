import { useEffect, useState } from "react";
import { formatKeyBindSequenceToString } from "@/utils/keyDisplay";
import { KeyBindsUI } from "./KeyBindsUI";

export function useKeyBind(id: string): string {
  const [keyBind, setKeyBind] = useState<string>("");

  useEffect(() => {
    const currentKeyBind = KeyBindsUI.getUIKeyBind(id);
    if (currentKeyBind?.key) {
      setKeyBind(formatKeyBindSequenceToString(currentKeyBind.key, "+", ","));
    }

    const unsubscribe = KeyBindsUI.onKeyBindChange(id, (uiKeyBind) => {
      if (uiKeyBind?.key) {
        setKeyBind(formatKeyBindSequenceToString(uiKeyBind.key, "+", ","));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  return keyBind;
}
