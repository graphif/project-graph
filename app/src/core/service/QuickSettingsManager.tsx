import { createStore } from "@/utils/store";
import { settingsSchema } from "./Settings";
import { z } from "zod";

/**
 * 管理右侧快捷设置项列表
 * 有数据持久化机制
 */
export namespace QuickSettingsManager {
  let store: any;

  /**
   * 快捷设置项类型
   */
  export type QuickSettingItem = {
    /**
     * 设置项的 key（必须是布尔类型的设置项）
     */
    settingKey: keyof ReturnType<typeof settingsSchema._def.shape>;
  };

  /**
   * 默认的快捷设置项列表（9个布尔类型的设置项）
   */
  const DEFAULT_QUICK_SETTINGS: QuickSettingItem[] = [
    { settingKey: "isStealthModeEnabled" },
    { settingKey: "stealthModeReverseMask" },
    { settingKey: "showTextNodeBorder" },
    { settingKey: "alwaysShowDetails" },
    { settingKey: "showDebug" },
    { settingKey: "enableDragAutoAlign" },
    { settingKey: "reverseTreeMoveMode" },
    { settingKey: "allowMoveCameraByWSAD" },
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
  export async function removeQuickSetting(
    settingKey: keyof ReturnType<typeof settingsSchema._def.shape>,
  ): Promise<void> {
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
   * 验证设置项是否为布尔类型
   */
  export function isValidBooleanSetting(settingKey: string): boolean {
    const schema = settingsSchema._def.shape();
    const fieldSchema = schema[settingKey as keyof typeof schema];
    if (!fieldSchema) return false;

    // 使用递归函数检查是否为布尔类型
    const checkIsBoolean = (schema: any): boolean => {
      if (schema instanceof z.ZodBoolean) return true;
      if (schema instanceof z.ZodDefault) return checkIsBoolean(schema._def.innerType);
      if (schema instanceof z.ZodOptional) return checkIsBoolean(schema._def.innerType);
      return false;
    };

    return checkIsBoolean(fieldSchema);
  }

  /**
   * 获取所有可用的布尔类型设置项
   */
  export function getAllAvailableBooleanSettings(): Array<keyof ReturnType<typeof settingsSchema._def.shape>> {
    const schema = settingsSchema._def.shape();
    return Object.keys(schema).filter((key) => isValidBooleanSetting(key)) as Array<
      keyof ReturnType<typeof settingsSchema._def.shape>
    >;
  }
}
