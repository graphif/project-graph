/**
 * 分层脏标记位掩码，用于按需局部图层重绘。
 */
export enum DirtyLayer {
  None = 0,
  /** 背景层：底色、点阵、网格线、坐标系 */
  Background = 1 << 0,
  /** 主舞台层：Section、实体、连线、标签 */
  Stage = 1 << 1,
  /** 交互与覆盖层：悬停框、框选、特效、远程光标、遮罩、HUD、调试信息 */
  Overlay = 1 << 2,
  /** 全部图层 */
  All = Background | Stage | Overlay,
}

export type CanvasLayerName = "background" | "stage" | "overlay";
