import { Canvas } from "@/core.compontents/Canvas";

/**
 * 应用程序全局类，采用单例模式，所有核心组件，通过该类实例都可以访问到。
 */
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
