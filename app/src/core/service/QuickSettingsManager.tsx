import { createStore } from "@/utils/store";
import { settingsSchema } from "./Settings";
import { settingsIcons } from "./SettingsIcons";
import { z } from "zod";

/**
 * 管理右侧快捷设置项列表
 * 有数据持久化机制
 */
export namespace QuickSettingsManager {
  let store: any;

  /**
   * 设置项的类型
   */
  export type SettingType = "boolean" | "enum" | "number" | "unknown";

  /**
   * 快捷设置项类型
   */
  export type QuickSettingItem = {
    /**
     * 设置项的 key（支持 boolean、enum、number 类型的设置项）
     */
    settingKey: keyof typeof settingsSchema.shape;
  };

  /**
   * 默认的快捷设置项列表（8个布尔类型的设置项）
   */
  const DEFAULT_QUICK_SETTINGS: QuickSettingItem[] = [
    { settingKey: "isStealthModeEnabled" },
    { settingKey: "stealthModeReverseMask" },
    { settingKey: "forceHideTextNodeBorder" },
    { settingKey: "alwaysShowDetails" },
    { settingKey: "showDebug" },
    { settingKey: "enableDragAutoAlign" },
    { settingKey: "reverseTreeMoveMode" },
    { settingKey: "textIntegerLocationAndSizeRender" },
  ];

  export async function init() {
    store = await createStore("quick-settings.json");
    // 如果存储中没有数据，则使用默认值
    const existingItems = await getQuickSettings();
    if (existingItems.length === 0) {
      await setQuickSettings(DEFAULT_QUICK_SETTINGS);
    }
    await store.save();
  }

  /**
   * 获取快捷设置项列表
   */
  export async function getQuickSettings(): Promise<QuickSettingItem[]> {
    const data = ((await store.get("quickSettings")) as QuickSettingItem[]) || [];
    return data;
  }

  /**
   * 设置快捷设置项列表
   */
  export async function setQuickSettings(items: QuickSettingItem[]): Promise<void> {
    await store.set("quickSettings", items);
    await store.save();
  }

  /**
   * 添加一个快捷设置项
   */
  export async function addQuickSetting(item: QuickSettingItem): Promise<void> {
    const existingItems = await getQuickSettings();
    // 检查是否已存在
    if (!existingItems.some((it) => it.settingKey === item.settingKey)) {
      existingItems.push(item);
      await setQuickSettings(existingItems);
    }
  }

  /**
   * 删除一个快捷设置项
   */
  export async function removeQuickSetting(settingKey: keyof typeof settingsSchema.shape): Promise<void> {
    const existingItems = await getQuickSettings();
    const filtered = existingItems.filter((it) => it.settingKey !== settingKey);
    await setQuickSettings(filtered);
  }

  /**
   * 更新快捷设置项的顺序
   */
  export async function reorderQuickSettings(newOrder: QuickSettingItem[]): Promise<void> {
    await setQuickSettings(newOrder);
  }

  /**
   * 解包 Zod schema（处理 ZodDefault / ZodOptional 包装）
   */
  function unwrapSchema(schema: any): any {
    if (schema instanceof z.ZodDefault) return unwrapSchema(schema._def.innerType);
    if (schema instanceof z.ZodOptional) return unwrapSchema(schema._def.innerType);
    return schema;
  }

  /**
   * 获取设置项的类型
   */
  export function getSettingType(settingKey: string): SettingType {
    const schema = settingsSchema.shape[settingKey as keyof typeof settingsSchema.shape];
    if (!schema) return "unknown";
    const inner = unwrapSchema(schema);
    if (inner instanceof z.ZodBoolean) return "boolean";
    if (inner instanceof z.ZodUnion) return "enum";
    if (inner instanceof z.ZodNumber) return "number";
    return "unknown";
  }

  /**
   * 验证设置项是否为布尔类型
   */
  export function isValidBooleanSetting(settingKey: string): boolean {
    return getSettingType(settingKey) === "boolean";
  }

  /**
   * 验证设置项是否为枚举（下拉）类型
   */
  export function isValidEnumSetting(settingKey: string): boolean {
    return getSettingType(settingKey) === "enum";
  }

  /**
   * 验证设置项是否为数值类型
   */
  export function isValidNumberSetting(settingKey: string): boolean {
    return getSettingType(settingKey) === "number";
  }

  /**
   * 验证设置项是否可以加入快捷栏（boolean/enum/number 且有图标）
   */
  export function isValidQuickSetting(settingKey: string): boolean {
    const type = getSettingType(settingKey);
    if (type === "unknown") return false;
    // 必须有对应图标才能在工具栏中展示
    return settingKey in settingsIcons;
  }

  /**
   * 获取所有可用的布尔类型设置项（向后兼容保留）
   */
  export function getAllAvailableBooleanSettings(): Array<keyof typeof settingsSchema.shape> {
    const schema = settingsSchema.shape;
    return Object.keys(schema).filter((key) => isValidBooleanSetting(key)) as Array<keyof typeof settingsSchema.shape>;
  }

  /**
   * 获取所有可加入快捷栏的设置项（boolean + enum + number，且有图标）
   */
  export function getAllAvailableSettings(): Array<keyof typeof settingsSchema.shape> {
    const schema = settingsSchema.shape;
    return Object.keys(schema).filter((key) => isValidQuickSetting(key)) as Array<keyof typeof settingsSchema.shape>;
  }

  /**
   * 从 schema 中提取枚举选项
   */
  export function getEnumOptions(settingKey: string): string[] {
    const schema = settingsSchema.shape[settingKey as keyof typeof settingsSchema.shape];
    if (!schema) return [];
    const inner = unwrapSchema(schema);
    if (!(inner instanceof z.ZodUnion)) return [];
    return inner._def.options.map((opt: any) => opt._def.values[0] as string);
  }

  /**
   * 从 schema 中提取数值范围信息
   */
  export function getNumberRange(settingKey: string): {
    min: number | null;
    max: number | null;
    step: number;
    hasRange: boolean;
  } {
    const schema = settingsSchema.shape[settingKey as keyof typeof settingsSchema.shape];
    if (!schema) return { min: null, max: null, step: 0.01, hasRange: false };
    const inner = unwrapSchema(schema);
    if (!(inner instanceof z.ZodNumber)) return { min: null, max: null, step: 0.01, hasRange: false };

    const bag = (inner as any)._zod?.bag ?? {};
    const min = bag.minimum ?? null;
    const max = bag.maximum ?? null;
    const isInt = bag.format === "safeint";
    const step = isInt ? 1 : 0.01;
    const hasRange = min !== null && max !== null;

    return { min, max, step, hasRange };
  }
}
