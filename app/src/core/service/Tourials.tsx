/**
 * 教程记录
 */
export namespace Tutorials {
  let store: Store | null = null;

  // 只在最初始时创建一次
  export async function init() {
    store = await createStore("tourials.json");
  }

  export async function finish(tourial: string) {
    await store?.set(tourial, true);
    await store?.save();
  }

  export async function reset() {
    await store?.clear();
    await store?.save();
  }

  export async function tour(tourial: string, fn: () => void | Promise<void>) {
    if (await store?.get(tourial)) {
      return;
    }
    await fn();
    await finish(tourial);
  }
}
