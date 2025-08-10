import { createStore } from "@/utils/store";
import { Color } from "@graphif/color";
import { Store } from "@tauri-apps/plugin-store";

export namespace ColorManager {
  let store: Store;

  export async function init() {
    store = await createStore("colors2.json");
    store.save();
  }

  export async function getUserEntityFillColors(): Promise<Color[]> {
    const data = (await store.get<[number, number, number, number][]>("entityFillColors")) || [];
    const result: Color[] = [];
    for (const colorData of data) {
      const color = new Color(...colorData);
      result.push(color);
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
    await store.set(
      "entityFillColors",
      colorData.map((it) => it.toArray()),
    );
    store.save();
    return true;
  }

  /**
   * 删除一个颜色，如果没有则不做任何事情
   * @param color
   */
  export async function removeUserEntityFillColor(color: Color) {
    const colors = await getUserEntityFillColors();
    const colorData = colors.map((it) => it.toArray());

    let index = -1;
    for (let i = 0; i < colorData.length; i++) {
      const c = new Color(...colorData);
      if (c.equals(color)) {
        index = i;
        break;
      }
    }

    if (index >= 0) {
      colors.splice(index, 1);
      store.set(
        "entityFillColors",
        colors.map((it) => it.toArray()),
      );
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
    await store.set(
      "entityFillColors",
      sortedColors.map((it) => it.toArray()),
    );
    store.save();
  }

  /**
   * 按照色相环的顺序排序颜色（黑白最前，纯红其次，其他按色相）
   * @param colors
   */
  function sortColorsByHue(colors: Color[]): Color[] {
    return colors.sort((a, b) => a.h - b.h);
  }
}
