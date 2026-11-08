import { describe, expect, it, vi } from "vitest";

// 渲染器会连带加载设置与宿主存储，特效注册表本身不需要它。
vi.mock("@/core/render/canvas2d/renderer", () => ({ Renderer: { NODE_ROUNDED_RADIUS: 16 } }));

import { registeredEffectClasses, registeredEffectIds } from "./effect-registry";

const concreteModules = import.meta.glob<Record<string, unknown>>(["./concrete/*.ts", "!./concrete/*.test.ts"], {
  eager: true,
});

describe("特效注册表", () => {
  it("每个特效都声明了非空且唯一的稳定标识", () => {
    for (const effectClass of registeredEffectClasses) {
      expect(effectClass.effectId, `${effectClass.name} 缺少 effectId`).toBeTruthy();
    }
    expect(new Set(registeredEffectIds).size).toBe(registeredEffectIds.length);
  });

  it("concrete 目录下的全部特效实现都已登记", () => {
    const declaredIds = Object.values(concreteModules)
      .flatMap((module) => Object.values(module))
      .map((exported) => (exported as { effectId?: unknown }).effectId)
      .filter((effectId): effectId is string => typeof effectId === "string")
      .sort();

    expect(declaredIds).toEqual([...registeredEffectIds].sort());
  });
});
