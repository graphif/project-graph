import { Button } from "@/components/ui/button";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { ColorManager } from "@/core/service/feedbackService/ColorManager";
import { SubWindow } from "@/core/service/SubWindow";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/sprites/TextNode";
import { activeProjectAtom } from "@/state";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { ArrowRightLeft, Blend, Pipette } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * 上色盘面板
 * @param param0
 * @returns
 */
export default function ColorWindow() {
  const [currentColors, setCurrentColors] = useState<Color[]>([]);
  const [project] = useAtom(activeProjectAtom);

  useEffect(() => {
    ColorManager.getUserEntityFillColors().then((colors) => {
      setCurrentColors(colors);
    });
  }, []);

  const handleChagneColor = (color: Color) => {
    return () => {
      project?.stageObjectColorManager.setSelectedStageObjectColor(color);
    };
  };

  return (
    <div className="flex flex-col">
      {/* 官方提供的默认颜色 */}
      <div className="flex flex-wrap items-center justify-center">
        <div
          className="m-1 h-5 w-5 cursor-pointer rounded bg-red-500 hover:scale-125"
          onClick={handleChagneColor(new Color(239, 68, 68))}
          onMouseEnter={handleChagneColor(new Color(239, 68, 68))}
        />
        <div
          className="m-1 h-5 w-5 cursor-pointer rounded bg-yellow-500 hover:scale-125"
          onClick={handleChagneColor(new Color(234, 179, 8))}
          onMouseEnter={handleChagneColor(new Color(234, 179, 8))}
        />
        <div
          className="m-1 h-5 w-5 cursor-pointer rounded bg-green-600 hover:scale-125"
          onClick={handleChagneColor(new Color(22, 163, 74))}
          onMouseEnter={handleChagneColor(new Color(22, 163, 74))}
        />
        <div
          className="m-1 h-5 w-5 cursor-pointer rounded bg-blue-500 hover:scale-125"
          onClick={handleChagneColor(new Color(59, 130, 246))}
          onMouseEnter={handleChagneColor(new Color(59, 130, 246))}
        />
        <div
          className="m-1 h-5 w-5 cursor-pointer rounded bg-purple-500 hover:scale-125"
          onClick={handleChagneColor(new Color(168, 85, 247))}
          onMouseEnter={handleChagneColor(new Color(168, 85, 247))}
        />
        {/* 清除颜色 */}
        <div
          className="m-1 h-5 w-5 animate-pulse cursor-pointer rounded bg-transparent text-center text-sm hover:scale-125"
          onClick={handleChagneColor(Color.Transparent)}
          onMouseEnter={handleChagneColor(Color.Transparent)}
        >
          <Blend className="h-5 w-5" />
        </div>
      </div>
      {/* 按钮 */}
      <div className="flex flex-wrap items-center justify-center">
        {/* 临时自定义 */}
        <input
          type="color"
          id="colorPicker"
          value="#ff0000"
          onChange={(e) => {
            const color = e.target.value;
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            project?.stageObjectColorManager.setSelectedStageObjectColor(new Color(r, g, b));
          }}
          onClick={(e) => e.stopPropagation()}
        ></input>
        <Button
          onClick={() => {
            ColorManagerPanel.open();
          }}
        >
          打开颜色管理
        </Button>
      </div>
      {/* <hr className="text-panel-details-text my-2" /> */}
      {/* 用户颜色库 */}
      <div className="flex max-w-64 flex-1 flex-wrap items-center justify-center">
        {currentColors.length === 0 && (
          <div className="m-1 h-5 w-5 rounded bg-transparent text-center text-sm">暂无颜色</div>
        )}
        {currentColors.map((color) => {
          return (
            <div
              className="m-1 h-5 w-5 cursor-pointer rounded hover:scale-125"
              key={color.toString()}
              style={{
                backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
              }}
              onClick={() => {
                project?.stageObjectColorManager.setSelectedStageObjectColor(color);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

ColorWindow.open = () => {
  SubWindow.create({
    title: "调色盘",
    children: <ColorWindow />,
    rect: new Rectangle(MouseLocation.vector().clone(), new Vector(256, 256)),
    closeWhenClickOutside: true,
    closeWhenClickInside: true,
  });
};

// ======= 颜色管理面板 =======

/**
 * 自定义颜色设置面板
 *
 *
 */
function ColorManagerPanel() {
  useEffect(() => {
    ColorManager.getUserEntityFillColors().then((colors) => {
      setCurrentColorList(colors);
    });
  });
  const [preAddColor, setPreAddColor] = useState("#000000");
  const [currentColorList, setCurrentColorList] = useState<Color[]>([]);
  const [project] = useAtom(activeProjectAtom);

  return (
    <div className="bg-panel-bg flex flex-col p-4">
      <div>
        <p>我的颜色库：</p>
        {/* <ColorDotElement color={Color.Red} /> */}
        <div className="flex flex-wrap items-center justify-center">
          {currentColorList.map((color) => (
            <ColorDotElement
              key={color.toString()}
              color={color}
              onclick={() => {
                const rgbSharpString = color.toHexString();
                if (rgbSharpString.length === 9) {
                  // 去掉透明度
                  setPreAddColor(rgbSharpString.slice(0, 7));
                }
              }}
            />
          ))}
        </div>
        {currentColorList.length !== 0 && (
          <div className="text-panel-details-text text-center text-xs">提示：点击颜色可以复制颜色值到待添加颜色</div>
        )}
      </div>
      <div className="flex items-center justify-center">
        <p>添加颜色：</p>
        <input
          type="color"
          id="colorPicker"
          value={preAddColor}
          onChange={(e) => {
            const color = e.target.value;
            setPreAddColor(color);
          }}
        ></input>
        <Button
          className="text-xs"
          onClick={() => {
            const color = new Color(
              parseInt(preAddColor.slice(1, 3), 16),
              parseInt(preAddColor.slice(3, 5), 16),
              parseInt(preAddColor.slice(5, 7), 16),
            );
            ColorManager.addUserEntityFillColor(color).then((res) => {
              // setPreAddColor(Color.getRandom().toHexString());
              if (!res) {
                toast.warning("颜色已存在");
              }
            });
          }}
        >
          确认添加
        </Button>
      </div>

      <div className="flex flex-col">
        <Button
          onClick={() => {
            if (!project) return;
            const selectedStageObjects = project.stageManager.getSelectedStageObjects();
            if (selectedStageObjects.length === 0) {
              toast.warning("请先选择一个或多个有颜色的节点或连线");
              return;
            }
            selectedStageObjects.forEach((stageObject) => {
              if (stageObject instanceof TextNode) {
                ColorManager.addUserEntityFillColor(stageObject.color);
              } else if (stageObject instanceof Section) {
                ColorManager.addUserEntityFillColor(stageObject.color);
              } else if (stageObject instanceof LineEdge) {
                ColorManager.addUserEntityFillColor(stageObject.color);
              }
            });
          }}
        >
          <Pipette />
          将选中的节点颜色添加到库
        </Button>
        <Button
          onClick={() => {
            ColorManager.organizeUserEntityFillColors();
          }}
        >
          <ArrowRightLeft />
          整理顺序
        </Button>
      </div>
    </div>
  );
}

ColorManagerPanel.open = () => {
  SubWindow.create({
    title: "调色盘",
    children: <ColorManagerPanel />,
    rect: new Rectangle(MouseLocation.vector().clone(), new Vector(256, 500)),
    closeWhenClickOutside: false,
    closeWhenClickInside: false,
  });
};

function ColorDotElement({ color, onclick }: { color: Color; onclick: (e: any) => void }) {
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a;
  return (
    <div className="my-1">
      <div
        className="relative mx-1 h-4 min-w-4 rounded-full hover:cursor-pointer"
        style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})` }}
        onClick={onclick}
      >
        <Button
          className="absolute -right-2 -top-2 h-2 w-2 rounded-full text-xs"
          onClick={() => {
            ColorManager.removeUserEntityFillColor(color);
          }}
        >
          x
        </Button>
      </div>
      <span className="mx-0.5 cursor-text select-all rounded bg-black px-1 text-xs text-neutral-300">{`${r}, ${g}, ${b}`}</span>
    </div>
  );
}
