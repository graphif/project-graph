import {
  LogicNodeNameEnum,
  LogicNodeNameToArgsTipsMap,
  LogicNodeNameToRenderNameMap,
} from "@/core/service/dataGenerateService/autoComputeEngine/logicNodeNameEnum";
import { SubWindow } from "@/core/service/SubWindow";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeProjectAtom } from "@/state";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";

/**
 *
 */
export default function LogicNodePanel({ className = "" }: { className?: string }) {
  const [project] = useAtom(activeProjectAtom);
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
  SubWindow.create({
    title: "逻辑节点",
    children: <LogicNodePanel />,
    rect: new Rectangle(new Vector(100, 100), new Vector(500, 600)),
    // closeWhenClickOutside: true,
    // closeWhenClickInside: true,
  });
};
