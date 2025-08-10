import { describe, expect, test } from "vitest";
import { Color } from "../src";

describe("Color 颜色", () => {
  test("静态常量提供预设颜色", () => {
    expect(Color.White.toString()).toEqual("oklch(1 0 0/1)");
    expect(Color.Black.toString()).toEqual("oklch(0 0 0/1)");
    expect(Color.Transparent.a).toEqual(0);
  });

  test("构造并输出oklch字符串", () => {
    const c = new Color(0.5, 0.2, 300);
    expect(c.toString()).toEqual("oklch(0.5 0.2 300/1)");
  });

  test("判断两个颜色是否相等", () => {
    const a = new Color(0.5, 0.2, 300);
    const b = new Color(0.5, 0.2, 300);
    const c = new Color(0.5, 0.2, 301);
    expect(a.equals(b)).toEqual(true);
    expect(a.equals(c)).toEqual(false);
  });

  test("克隆颜色", () => {
    const original = new Color(0.5, 0.2, 300, 0.5);
    const cloned = original.clone();
    expect(original.equals(cloned)).toEqual(true);
    expect(original).not.toBe(cloned);
  });

  test("生成不透明颜色", () => {
    const c = new Color(0.5, 0.2, 300, 0.5);
    expect(c.toSolid().a).toEqual(1);
  });

  test("生成完全透明颜色", () => {
    const c = new Color(0.5, 0.2, 300, 0.5);
    expect(c.toTransparent().a).toEqual(0);
  });

  test("从RGB转换到oklch", () => {
    const c = Color.fromRGB(255, 255, 255);
    console.log(c.toString());
    expect(c.l).toBeCloseTo(1, 1);
    expect(c.c).toBeCloseTo(0, 1);
  });

  test("从RGBA转换到oklch并保留透明度", () => {
    const rgba = Color.fromRGBA(0, 255, 0, 0.5);
    expect(rgba.a).toEqual(0.5);
  });

  test("解析oklch字符串", () => {
    const c1 = Color.fromCSS("oklch(0.5 0.1 45deg)");
    expect(c1.l).toEqual(0.5);
    expect(c1.c).toEqual(0.1);
    expect(c1.h).toEqual(45);
  });

  test("解析带百分比和透明度的oklch字符串", () => {
    const c2 = Color.fromCSS("oklch(50% 25% 90 / 0.3)");
    expect(c2.l).toEqual(0.5);
    expect(c2.c).toEqual(0.1);
    expect(c2.h).toEqual(90);
    expect(c2.a).toEqual(0.3);
  });

  test("非法格式抛出异常", () => {
    expect(() => Color.fromCSS("rgb(0 0 0)")).toThrow();
  });

  test("部分属性覆盖生成新颜色", () => {
    const base = new Color(0.5, 0.2, 300, 0.8);
    const darker = base.with({ l: 0.3 });
    expect(darker.l).toEqual(0.3);
    expect(darker.c).toEqual(0.2);
    expect(darker.h).toEqual(300);
    expect(darker.a).toEqual(0.8);
  });

  test("混合两个颜色", () => {
    const a = new Color(0.5, 0.2, 300, 0.8);
    const b = new Color(0.3, 0.1, 200, 0.6);
    const mixed = a.mix(b, 0.5);
    expect(mixed.l).toBeCloseTo(0.4, 1);
    expect(mixed.c).toBeCloseTo(0.15, 1);
    expect(mixed.h).toBeCloseTo(250, 1);
  });
});
