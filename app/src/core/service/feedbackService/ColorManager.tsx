import { Color } from "@graphif/color";
import { Store } from "@tauri-apps/plugin-store";
import { createStore } from "@/utils/store";

export namespace ColorManager {
  let store: Store;

  export type ColorData = {
    r: number;
    g: number;
    b: number;
    a: number;
  };

  export async function init() {
    store = await createStore("colors.json");
    store.save();
  }

  export async function getUserEntityFillColors(): Promise<Color[]> {
    const data = ((await store.get("entityFillColors")) as ColorData[]) || [];
    const result: Color[] = [];
    for (const colorData of data) {
      const color = new Color(colorData.r, colorData.g, colorData.b, colorData.a);
      result.push(color);
    }
    return result;
  }

  function colorToColorData(colors: Color[]): ColorData[] {
    const result: ColorData[] = [];
    for (const color of colors) {
      const colorData: ColorData = {
        r: color.r,
        g: color.g,
        b: color.b,
        a: color.a,
      };
      result.push(colorData);
    }
    return result;
  }

  /**
   * 添加一个颜色，如果已经有这个颜色了，则不做任何事情
   * @param color
   */
  export async function addUserEntityFillColor(color: Color) {
    const colorData = await getUserEntityFillColors();
    // 先检查下有没有这个颜色
    for (const c of colorData) {
      if (c.equals(color)) {
        return false;
      }
    }
    colorData.push(color);
    await store.set("entityFillColors", colorToColorData(colorData));
    store.save();
    return true;
  }

  /**
   * 删除一个颜色，如果没有则不做任何事情
   * @param color
   */
  export async function removeUserEntityFillColor(color: Color) {
    const colors = await getUserEntityFillColors();
    const colorData = colorToColorData(colors);

    let index = -1;
    for (let i = 0; i < colorData.length; i++) {
      const c = new Color(colorData[i].r, colorData[i].g, colorData[i].b, colorData[i].a);
      if (c.equals(color)) {
        index = i;
        break;
      }
    }

    if (index >= 0) {
      colors.splice(index, 1);
      store.set("entityFillColors", colorToColorData(colors));
      store.save();
      return true;
    }
    return false;
  }
  /**
   * 按照色相环的顺序整理用户实体填充颜色
   */
  export async function organizeUserEntityFillColors() {
    const colors = await getUserEntityFillColors();
    const sortedColors = sortColorsByHue(colors);
    await store.set("entityFillColors", colorToColorData(sortedColors));
    store.save();
  }

  /**
   * 按照色相环的顺序排序颜色（黑白最前，纯红其次，其他按色相）
   * @param colors
   */
  function sortColorsByHue(colors: Color[]): Color[] {
    return colors.sort((a, b) => {
      // 判断颜色类型
      const isGrayA = isGrayscale(a);
      const isGrayB = isGrayscale(b);

      // 优先级：灰度 > 彩色
      if (isGrayA !== isGrayB) {
        return isGrayA ? -1 : 1;
      }

      // 同类型比较
      if (isGrayA) {
        // 灰度颜色按亮度降序（从白到黑）
        return getGrayscaleBrightness(b) - getGrayscaleBrightness(a);
      } else {
        // 彩色按色相升序
        return getColorHue(a) - getColorHue(b);
      }
    });
  }
  /**
   * 判断是否是灰度颜色
   */
  function isGrayscale(color: Color): boolean {
    const rgb = color;
    return rgb.r === rgb.g && rgb.g === rgb.b;
  }

  /**
   * 获取灰度颜色的亮度（0-255）
   */
  function getGrayscaleBrightness(color: Color): number {
    const rgb = color;
    return rgb.r; // 因为r=g=b，直接返回红色通道值
  }
  /**
   * 计算颜色的色相
   * @param color
   * @returns 色相值（0-360）
   */
  function getColorHue(color: Color): number {
    return Color.getHue(color);
  }
}
/**
json数据格式
{
  "entityFillColors": [
    [r, g, b, a],
    [r, g, b, a],
  ]
}
 *
 */
