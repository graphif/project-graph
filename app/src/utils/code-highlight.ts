import { common, createLowlight } from "lowlight";

export const codeHighlighter = createLowlight(common);
let remainingLanguages: Promise<void> | undefined;

export async function ensureCodeLanguage(language?: string): Promise<boolean> {
  if (!language || language === "plaintext" || codeHighlighter.registered(language)) return false;
  remainingLanguages ??= import("./codeHighlightLanguages")
    .then(({ all }) => {
      codeHighlighter.register(all);
    })
    .catch((error: unknown) => {
      remainingLanguages = undefined;
      throw error;
    });
  await remainingLanguages;
  return codeHighlighter.registered(language);
}
