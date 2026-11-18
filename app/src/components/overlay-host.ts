import { store } from "@/state";
import { atom, useAtomValue } from "jotai";
import React from "react";

interface OverlayEntry {
  id: string;
  children: React.ReactNode;
}

const overlaysAtom = atom<OverlayEntry[]>([]);

export namespace OverlayHost {
  export function open(children: React.ReactNode) {
    const entry = { id: crypto.randomUUID(), children };
    store.set(overlaysAtom, [...store.get(overlaysAtom), entry]);
    return entry;
  }

  export function close(id: string) {
    store.set(
      overlaysAtom,
      store.get(overlaysAtom).filter((entry) => entry.id !== id),
    );
  }
}

export default function RenderOverlays() {
  const overlays = useAtomValue(overlaysAtom);
  return overlays.map((overlay) =>
    React.isValidElement(overlay.children)
      ? React.cloneElement(overlay.children as React.ReactElement<{ overlayId?: string }>, {
          key: overlay.id,
          overlayId: overlay.id,
        })
      : overlay.children,
  );
}
