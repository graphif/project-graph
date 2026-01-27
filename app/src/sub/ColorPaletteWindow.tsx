import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

interface ColorInfo {
  color: Color;
  count: number;
}

/**
 * 颜色表窗口 - 显示当前文件中所有颜色及其使用数量
 */
export default function ColorPaletteWindow() {
  const [project] = useAtom(activeProjectAtom);
  const [colorInfos, setColorInfos] = useState<ColorInfo[]>([]);

  useEffect(() => {
    if (!project) return;

    // 统计所有颜色及其使用数量
    // 使用颜色字符串作为key，格式：r,g,b,a
    const colorMap = new Map<string, { color: Color; count: number }>();

    // 获取颜色key的函数
    const getColorKey = (color: Color): string => {
      return `${color.r},${color.g},${color.b},${color.a}`;
    };

    // 遍历所有实体
    for (const entity of project.stageManager.getEntities()) {
      if ("color" in entity && entity.color instanceof Color) {
        const colorKey = getColorKey(entity.color);
        if (colorMap.has(colorKey)) {
          colorMap.get(colorKey)!.count++;
        } else {
          colorMap.set(colorKey, { color: entity.color, count: 1 });
        }
      }
    }

    // 遍历所有关系
    for (const association of project.stageManager.getAssociations()) {
      if ("color" in association && association.color instanceof Color) {
        const colorKey = getColorKey(association.color);
        if (colorMap.has(colorKey)) {
          colorMap.get(colorKey)!.count++;
        } else {
          colorMap.set(colorKey, { color: association.color, count: 1 });
        }
      }
    }

    // 转换为数组并按使用数量排序（从多到少）
    const colors = Array.from(colorMap.values())
      .map((item) => ({ color: item.color, count: item.count }))
      .sort((a, b) => b.count - a.count);

    setColorInfos(colors);
  }, [project]);

  const handleColorClick = (color: Color) => {
    if (project) {
      project.stageObjectColorManager.setSelectedStageObjectColor(color);
    }
  };

  return (
    <div className="bg-panel-bg flex flex-col p-4">
      <div className="mb-2 text-sm font-semibold">当前文件包含的所有颜色：</div>
      {colorInfos.length === 0 ? (
        <div className="text-center text-sm text-gray-500">暂无颜色</div>
      ) : (
        <div className="flex max-w-96 flex-wrap gap-2">
          {colorInfos.map((colorInfo, index) => {
            const { color, count } = colorInfo;
            return (
              <div
                key={`${color.r},${color.g},${color.b},${color.a}-${index}`}
                className="relative flex cursor-pointer flex-col items-center"
                onClick={() => handleColorClick(color)}
              >
                <div
                  className="h-12 w-12 rounded border-2 border-gray-300 hover:scale-110 hover:border-blue-500"
                  style={{
                    backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
                  }}
                />
                <div className="mt-1 text-xs font-semibold">{count}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 text-xs text-gray-500">提示：点击颜色块可以设置当前选中对象的颜色</div>
    </div>
  );
}

ColorPaletteWindow.open = () => {
  SubWindow.create({
    title: "当前文件颜色表",
    children: <ColorPaletteWindow />,
    rect: new Rectangle(MouseLocation.vector().clone(), new Vector(400, 400)),
    closeWhenClickOutside: true,
    closeWhenClickInside: false,
  });
};
