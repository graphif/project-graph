import { CanvasTextOptions, Text } from "pixi.js";
import { Settings } from "../service/Settings";

export class MyText extends Text {
  constructor(text: string = "", options?: CanvasTextOptions) {
    console.log({
      text,
      resolution: Settings.textResolution,
      layout: {
        width: "intrinsic",
        height: "intrinsic",
      },
      ...options,
      style: {
        fill: 0xffffff,
        fontFamily: "system-ui",
        ...(options?.style ?? {}),
      },
    });
    super({
      text,
      resolution: Settings.textResolution,
      layout: {
        width: "intrinsic",
        height: "intrinsic",
      },
      ...options,
      style: {
        fill: 0xffffff,
        fontFamily: "system-ui",
        ...(options?.style ?? {}),
      },
    });
  }
}
