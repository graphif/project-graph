import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { CodeBlockKit } from "@/components/editor/plugins/code-block-kit";
import { FixedToolbarKit } from "@/components/editor/plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { FontKit } from "@/components/editor/plugins/font-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { MathKit } from "@/components/editor/plugins/math-kit";
import { TableKit } from "@/components/editor/plugins/table-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createSubWindow } from "@/core/subWindowOpen";
import { TabWorkspace } from "@/core/TabWorkspace";
import { store, tabsAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useEffect } from "react";

const detailTabIds = new Set<string>();

export default function NodeDetailsWindow({
  tabId,
  value = [],
  onChange = () => {},
}: {
  tabId: string;
  value?: Value;
  onChange?: (value: Value) => void;
}) {
  useEffect(() => {
    return () => {
      detailTabIds.delete(tabId);
    };
  }, [tabId]);

  const editor = usePlateEditor({
    plugins: [
      ...FloatingToolbarKit,
      ...FixedToolbarKit,
      ...BasicMarksKit,
      ...BasicBlocksKit,
      ...FontKit,
      ...TableKit,
      ...MathKit,
      ...CodeBlockKit,
      ...ListKit,
      ...LinkKit,
    ],
    value,
  });

  return (
    <Plate editor={editor} onChange={({ value }) => onChange(value)}>
      <EditorContainer>
        <Editor variant="nodeDetails" />
      </EditorContainer>
    </Plate>
  );
}

NodeDetailsWindow.open = (value?: Value, onChange?: (value: Value) => void) => {
  const existing = store.get(tabsAtom).find((tab) => !tab.closing && detailTabIds.has(tab.id));
  if (existing) {
    void TabWorkspace.close(existing.id);
    return;
  }

  const tab = createSubWindow("NodeDetailsWindow", {
    children: (componentTab) => <NodeDetailsWindow tabId={componentTab.id} value={value} onChange={onChange} />,
    rect: new Rectangle(
      new Vector(innerWidth * 0.75, innerHeight * 0.1),
      new Vector(innerWidth * 0.25, innerHeight * 0.9),
    ),
    titleBarOverlay: true,
  });
  detailTabIds.add(tab.id);
};
