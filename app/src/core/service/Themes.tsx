import type { Extension } from "@/core/extension/Extension";
import { camelCaseToDashCase } from "@/utils/font";
import { parseYamlWithFrontmatter } from "@/utils/yaml";

export namespace Themes {
  export type Metadata = {
    id: string;
    type: "light" | "dark";
    name: string;
    description?: string;
    source?: Extension;
  };
  export type Theme = {
    metadata: Metadata;
    content: any;
  };
  export const builtinThemes = Object.values(
    import.meta.glob<string>("../../themes/*.yml", {
      eager: true,
      import: "default",
      query: "?raw",
    }),
  ).map((theme) => {
    const data = parseYamlWithFrontmatter<Themes.Metadata, any>(theme);
    return {
      metadata: data.frontmatter,
      content: data.content,
    };
  });

  // 扩展注册的主题
  const extensionThemes = new Map<string, Theme>();
  const extensionThemeIndex = new Map<string, string[]>();

  export function registerExtensionTheme(id: string, extensionId: string, theme: Theme) {
    extensionThemes.set(id, theme);
    const ids = extensionThemeIndex.get(extensionId) ?? [];
    ids.push(id);
    extensionThemeIndex.set(extensionId, ids);
  }

  /** 获取所有注册了主题的扩展 ID */
  export function getExtensionIdsWithThemes(): string[] {
    return Array.from(extensionThemeIndex.keys());
  }

  /** 获取指定扩展注册的所有主题（同步，因为扩展主题在运行时注册） */
  export function getExtensionThemesByExtensionId(extensionId: string): Theme[] {
    const ids = extensionThemeIndex.get(extensionId) ?? [];
    return ids.map((id) => extensionThemes.get(id)).filter((t): t is Theme => t !== undefined);
  }

  export async function getThemeById(id: string) {
    // 先尝试找内置主题
    const builtinTheme = builtinThemes.find((theme) => theme.metadata.id === id);
    if (builtinTheme) return builtinTheme;
    // 再尝试找扩展注册的主题
    const extensionTheme = extensionThemes.get(id);
    if (extensionTheme) return extensionTheme;
    return undefined;
  }
  /**
   * 把theme.content转换成CSS样式
   * @param theme getThemeById返回的theme对象中的content属性
   */
  export function convertThemeToCSS(theme: any) {
    function generateCSSVariables(obj: any, prefix: string = "--", css: string = ""): string {
      for (const key in obj) {
        if (typeof obj[key] === "object") {
          // 如果值是对象，递归调用函数，并更新前缀
          css = generateCSSVariables(obj[key], `${prefix}${camelCaseToDashCase(key)}-`, css);
        } else {
          // 否则，生成CSS变量
          css += `${prefix}${camelCaseToDashCase(key)}: ${obj[key]};\n`;
        }
      }
      return css;
    }
    return generateCSSVariables(theme);
  }
  /** 将主题CSS挂载到网页上 */
  export async function applyThemeById(themeId: string) {
    const theme = await getThemeById(themeId);
    if (!theme) return;
    await applyTheme(theme.content, theme.metadata.type);
  }
  export async function applyTheme(themeContent: any, type?: "light" | "dark") {
    let styleEl = document.querySelector("#pg-theme");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "pg-theme";
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      :root {
        color-scheme: ${type || "light"};
        ${convertThemeToCSS(themeContent)}
      }
    `;
  }

  export async function ids() {
    const builtinIds = builtinThemes.map((theme) => theme.metadata.id);
    const extensionIds = Array.from(extensionThemes.keys());
    return [...builtinIds, ...extensionIds];
  }
  export async function list() {
    const ids_ = await ids();
    const themes = await Promise.all(ids_.map((id) => getThemeById(id)));
    return themes.filter((theme): theme is Themes.Theme => theme !== undefined);
  }
}
