import { writeFile } from "node:fs/promises";
import { getBuiltInToolCliEntries } from "../src/core/service/data-manage-service/ai-engine/built-in-tool-cli-adapter";

const catalog = `${JSON.stringify(getBuiltInToolCliEntries(), null, 2)}\n`;
await writeFile(new URL("../internal/automation/tools.json", import.meta.url), catalog);
