import { db } from "@/db";

/**
 * 教程记录
 */
export namespace Onboardings {
  export async function finish(tourial: string) {
    db.onboardings.put({ id: tourial, completed: true });
  }

  export async function tour(tourial: string, fn: () => void | Promise<void>) {
    if (await db.onboardings.get(tourial)) {
      return;
    }
    await fn();
    await finish(tourial);
  }
}
