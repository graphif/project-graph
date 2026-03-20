import { Dexie } from "dexie";

export const db = new Dexie("project_graph");

db.version(1).stores({
  settings: "key",
  user_colors: "key",
});
