import { Settings } from "@/core/service/Settings";
import { Themes } from "@/core/service/Themes";
import { Color } from "@graphif/color";

export interface EffectColors {
  /** 闪光线，切割线等白光刃的白色 */
  flash: Color;
  /** 粒子效果的颜色 */
  dash: Color;
  windowFlash: Color;
  /** 警告阴影的颜色 */
  warningShadow: Color;
  /** 成功阴影的颜色 */
  successShadow: Color;
}

export class StageStyle {
  /** 背景颜色 */
  Background: Color = Color.Black;
  /** 网格其他坐标轴上的颜色 */
  GridNormal: Color = Color.Black;
  /** 网格上y=0或x=0坐标轴上的颜色 */
  GridHeavy: Color = Color.Black;
  /** 左上角调试信息颜色 */
  DetailsDebugText: Color = Color.Black;

  /** 选择矩形边框颜色 */
  SelectRectangleBorder: Color = Color.Black;
  /** 选择矩形填充颜色 */
  SelectRectangleFill: Color = Color.Black;

  /** 节点边框颜色，包括线条颜色，节点边框，箭头等等 */
  StageObjectBorder: Color = Color.Black;
  /** 节点详细信息文本颜色 */
  NodeDetailsText: Color = Color.Black;

  /** 已经选中的颜色 */
  CollideBoxSelected: Color = Color.Black;
  /** 准备选中的绿色 */
  CollideBoxPreSelected: Color = Color.Black;
  /** 准备删除的红色 */
  CollideBoxPreDelete: Color = Color.Black;

  effects: EffectColors = {
    flash: Color.White,
    dash: Color.White,
    windowFlash: Color.White,
    warningShadow: Color.Red,
    successShadow: Color.Green,
  };

  // 其他风格的静态工厂方法可以按照类似的方式添加
  static styleFromTheme(theme: Settings["theme"]): StageStyle {
    const themeObj = Themes.getThemeById(theme);
    if (!themeObj) {
      // 未知的主题
      return new StageStyle();
    }
    const style = new StageStyle();
    Object.assign(
      style,
      Object.fromEntries(Object.entries(themeObj?.content.stage).map(([k, v]) => [k, Color.fromCss(v as string)])),
    );
    style.effects = Object.fromEntries(
      Object.entries(themeObj?.content.effects).map(([k, v]) => [k, Color.fromCss(v as string)]),
    ) as any as EffectColors;
    return style;
  }
}
