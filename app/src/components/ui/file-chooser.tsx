import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { open } from "@/platform/dialogs";
import { FolderOpen } from "lucide-react";

export default function FileChooser({
  kind,
  value = "",
  onChange = () => {},
}: {
  kind: "file" | "directory";
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      <Button
        onClick={() => {
          open({
            directory: kind === "directory",
            multiple: false,
          }).then((result) => {
            onChange(result ?? "");
          });
        }}
      >
        {<FolderOpen />}
      </Button>
    </div>
  );
}
