import { Project } from "@/core/project";
import {
  LogicNodeNameEnum,
  LogicNodeNameToArgsTipsMap,
  LogicNodeNameToRenderNameMap,
} from "@/core/service/data-generate-service/auto-compute-engine/logic-node-name-enum";
import { CollisionBox } from "@/core/stage/stage-object/collision-box/collision-box";
import { TextNode } from "@/core/stage/stage-object/entity/text-node";
import { createSubWindow } from "@/core/sub-window-open";
import { activeResourceTabAtom } from "@/state";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";

/**
 *
 */
export default function LogicNodePanel({ className = "" }: { className?: string }) {
  const [tab] = useAtom(activeResourceTabAtom);
  const project = tab instanceof Project ? tab : undefined;
  return (
    <div className={cn("flex h-full w-full flex-col p-2 pb-32 transition-all", className)}>
      <table className="w-full">
        <thead>
          <tr className="text-left">
            <th>节点名称</th>
            <th>参数说明</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(LogicNodeNameEnum).map((name) => {
            return (
              <tr
                key={name}
                className="text-xs opacity-80 hover:opacity-100"
                onClick={() => {
                  project?.stageManager.add(
                    new TextNode(project, {
                      collisionBox: new CollisionBox([
                        new Rectangle(
                          new Vector(project.camera.location.x, project.camera.location.y),
                          Vector.getZero(),
                        ),
                      ]),
                      text: name,
                    }),
                  );
                }}
              >
                <td className="cursor-pointer">{LogicNodeNameToRenderNameMap[name]}</td>
                <td className="cursor-pointer">{LogicNodeNameToArgsTipsMap[name]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

LogicNodePanel.open = () => {
  createSubWindow("LogicNodePanel", {
    title: "逻辑节点",
    contextTarget: "activeResourceTab",
    children: <LogicNodePanel />,
    rect: new Rectangle(new Vector(100, 100), new Vector(500, 600)),
    // closeWhenClickOutside: true,
    // closeWhenClickInside: true,
  });
};
