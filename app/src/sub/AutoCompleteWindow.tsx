import { SubWindow } from "@/core/service/SubWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

export default function AutoCompleteWindow({
  // winId = "",
  items = {},
  onSelect = () => {},
}: {
  // winId?: string;
  items: Record<string, string>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex max-h-96 flex-col gap-1 p-2">
      {Object.entries(items).map(([k, v]) => (
        <div key={k} className="flex justify-between" onClick={() => onSelect(k)}>
          <span className="mr-2">{k}</span>
          <span className="opacity-75">{v}</span>
        </div>
      ))}
    </div>
  );
}

AutoCompleteWindow.open = (location: Vector, items: Record<string, string>, onSelect: (value: string) => void) => {
  return SubWindow.create({
    children: <AutoCompleteWindow items={items} onSelect={onSelect} />,
    rect: new Rectangle(location, Vector.same(-1)),
    closeWhenClickOutside: true,
    titleBarOverlay: true,
    closable: false,
  });
};
