import { Dexie } from "dexie";
import { ShortcutAction, ShortcutCondition } from "./core/service/controlService/shortcutKeysEngine/Shortcuts";

export const db = new Dexie("pg-main") as Dexie & {
  settings: Dexie.Table<{ key: string; value: any }, string>;
  shortcuts: Dexie.Table<
    {
      key: string[];
      action: ShortcutAction;
      commands: [command: string, args: any[]][];
      conditions: ShortcutCondition[];
    },
    string
  >;
  user_colors: Dexie.Table<{ key: string; value: string }, string>;
  onboardings: Dexie.Table<{ id: string; completed: boolean }, string>;
};
db.version(1).stores({
  settings: "key",
  shortcuts: "key",
  user_colors: "key, value",
  onboardings: "id",
});
