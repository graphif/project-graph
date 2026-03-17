import { Canvas } from "@/core.compontents/Canvas";

export class APP {
  // static async getInstance() {
  public static getInstance() {
    return this.APP;
  }

  private static readonly APP = new APP();
  private constructor() {}
  // tabBar
  // canvas Group
  canvases: Canvas[] = new Array<Canvas>();
}
