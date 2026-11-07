import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSubWindow } from "@/core/subWindowOpen";
import { TabWorkspace } from "@/core/TabWorkspace";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function EditUrlNodeLinkWindow({
  initialUrl,
  onConfirm,
  onCancel,
}: {
  initialUrl: string;
  onConfirm: (newUrl: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const { t } = useTranslation("contextMenu");

  return (
    <div className="bg-background flex flex-col gap-3 p-4">
      <div className="text-sm font-medium">{t("editUrlNodeLink")}</div>
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." autoFocus />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={() => onConfirm(url)}>
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}

EditUrlNodeLinkWindow.open = (initialUrl: string, onConfirm: (newUrl: string) => void) => {
  const win = createSubWindow("EditUrlNodeLinkWindow", {
    title: "",
    children: (
      <EditUrlNodeLinkWindow
        initialUrl={initialUrl}
        onConfirm={(newUrl) => {
          void TabWorkspace.close(win.id);
          onConfirm(newUrl);
        }}
        onCancel={() => void TabWorkspace.close(win.id)}
      />
    ),
    rect: new Rectangle(new Vector(200, 200), new Vector(420, 160)),
    titleBarOverlay: true,
    closable: true,
    closeOnEscape: true,
  });
  return win;
};
