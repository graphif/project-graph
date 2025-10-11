import { CanvasTextOptions, Text } from "pixi.js";
import { Settings } from "../service/Settings";

export class MyText extends Text {
  constructor(text: string = "", options?: CanvasTextOptions) {
    super({
      text,
      layout: true,
      resolution: Settings.textResolution,
      ...options,
      style: {
        fill: "white",
        fontFamily: "system-ui",
        ...(options?.style ?? {}),
      },
    });
  }
}
