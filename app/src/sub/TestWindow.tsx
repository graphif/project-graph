import Tree from "@/components/ui/tree";
import { TabWorkspace } from "@/core/TabWorkspace";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 测试使用
 * @returns
 */
export default function TestWindow() {
  return (
    <div>
      <h1>测试窗口</h1>
      <Tree obj={{ a: 1, b: { c: 2, d: [3, 4, 5] } }} />
    </div>
  );
}

TestWindow.open = () => {
  TabWorkspace.create({
    title: "测试",
    children: <TestWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(150, 500)),
  });
};
