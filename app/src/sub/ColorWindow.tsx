import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { ColorManager } from "@/core/service/feedbackService/ColorManager";
import { SubWindow } from "@/core/service/SubWindow";
import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useEffect, useState } from "react";

/**
 * 上色盘面板
 * @param param0
 * @returns
 */
export default function ColorWindow() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentColors, setCurrentColors] = useState<Color[]>([]);

  useEffect(() => {
    ColorManager.getUserEntityFillColors().then((colors) => {
      setCurrentColors(colors);
    });
  }, []);

  // TODO: 调色盘窗口
  return <></>;
  // return (
  //   <div className="flex flex-col">
  //     {/* 官方提供的默认颜色 */}
  //     <div className="flex flex-wrap items-center justify-center">
  //       <div
  //         className="m-1 h-5 w-5 cursor-pointer rounded bg-red-500 hover:scale-125"
  //         onClick={() => {
  //           const color = new Color(239, 68, 68);
  //           StageObjectColorManager.setSelectedStageObjectColor(color);
  //         }}
  //       >
  //         {isMac && "."}
  //       </div>
  //       <div
  //         className="m-1 h-5 w-5 cursor-pointer rounded bg-yellow-500 hover:scale-125"
  //         onClick={() => {
  //           const color = new Color(234, 179, 8);
  //           StageObjectColorManager.setSelectedStageObjectColor(color);
  //         }}
  //       >
  //         {isMac && "."}
  //       </div>
  //       <div
  //         className="m-1 h-5 w-5 cursor-pointer rounded bg-green-600 hover:scale-125"
  //         onClick={() => {
  //           const color = new Color(22, 163, 74);
  //           StageObjectColorManager.setSelectedStageObjectColor(color);
  //         }}
  //       >
  //         {isMac && "."}
  //       </div>
  //       <div
  //         className="m-1 h-5 w-5 cursor-pointer rounded bg-blue-500 hover:scale-125"
  //         onClick={() => {
  //           const color = new Color(59, 130, 246);
  //           StageObjectColorManager.setSelectedStageObjectColor(color);
  //         }}
  //       >
  //         {isMac && "."}
  //       </div>
  //       <div
  //         className="m-1 h-5 w-5 cursor-pointer rounded bg-purple-500 hover:scale-125"
  //         onClick={() => {
  //           const color = new Color(168, 85, 247);
  //           StageObjectColorManager.setSelectedStageObjectColor(color);
  //         }}
  //       >
  //         {isMac && "."}
  //       </div>
  //       {/* 清除颜色 */}
  //       <div
  //         className="m-1 h-5 w-5 animate-pulse cursor-pointer rounded bg-transparent text-center text-sm hover:scale-125"
  //         onClick={() => {
  //           const color = Color.Transparent;
  //           StageObjectColorManager.setSelectedStageObjectColor(color);
  //         }}
  //       >
  //         <Blend className="h-5 w-5" />
  //       </div>
  //     </div>
  //     {/* 按钮 */}
  //     <div className="flex flex-wrap items-center justify-center">
  //       {/* 临时自定义 */}
  //       <input
  //         type="color"
  //         id="colorPicker"
  //         value="#ff0000"
  //         onChange={(e) => {
  //           const color = e.target.value;
  //           const r = parseInt(color.slice(1, 3), 16);
  //           const g = parseInt(color.slice(3, 5), 16);
  //           const b = parseInt(color.slice(5, 7), 16);
  //           StageObjectColorManager.setSelectedStageObjectColor(new Color(r, g, b));
  //         }}
  //         onClick={(e) => e.stopPropagation()}
  //       ></input>
  //       <Button
  //         onClick={() => {
  //           Popup.show(<ColorManagerPanel />, true);
  //         }}
  //       >
  //         打开颜色管理
  //       </Button>
  //     </div>
  //     <hr className="text-panel-details-text my-2" />
  //     {/* 用户颜色库 */}
  //     <div className="flex max-w-64 flex-1 flex-wrap items-center justify-center">
  //       {currentColors.length === 0 && (
  //         <div className="m-1 h-5 w-5 rounded bg-transparent text-center text-sm">暂无颜色</div>
  //       )}
  //       {currentColors.map((color) => {
  //         return (
  //           <div
  //             className="m-1 h-5 w-5 cursor-pointer rounded hover:scale-125"
  //             key={color.toString()}
  //             style={{
  //               backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
  //             }}
  //             onClick={() => {
  //               StageObjectColorManager.setSelectedStageObjectColor(color);
  //             }}
  //           />
  //         );
  //       })}
  //     </div>
  //   </div>
  // );
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
