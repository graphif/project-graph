import { camelCaseToDashCase } from "@/utils/font";
import { parseYamlWithFrontmatter } from "@/utils/yaml";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import YAML from "yaml";
import { Settings } from "./Settings";

export namespace Themes {
  export type Metadata = {
    id: string;
    type: "light" | "dark";
    author: Record<string, string>;
    description: Record<string, string>;
    name: Record<string, string>;
  };
  export type Theme = {
    metadata: Metadata;
    content: any;
  };
  export const builtinThemes = Object.values(
    import.meta.glob<string>("../../themes/*.pg-theme", {
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

  export async function getThemeById(id: string) {
    // 先尝试找内置主题
    const builtinTheme = builtinThemes.find((theme) => theme.metadata.id === id);
    if (builtinTheme) return builtinTheme;
    // 找不到就尝试从外部加载
    const path = await join(await appLocalDataDir(), "themes", `${id}.pg-theme`);
    const fileContent = await readTextFile(path);
    const data = parseYamlWithFrontmatter<Themes.Metadata, any>(fileContent);
    return {
      metadata: data.frontmatter,
      content: data.content,
    };
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
    try {
      const theme = await getThemeById(themeId);
      await applyTheme(theme.content);
    } catch {
      toast.warning("主题文件不存在，已为您切换至默认主题");
      Settings.theme = "dark";
    }
  }
  export async function applyTheme(themeContent: any) {
    let styleEl = document.querySelector("#pg-theme");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "pg-theme";
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      :root {
        ${convertThemeToCSS(themeContent)}
      }
    `;
  }

  export async function writeCustomTheme(theme: Theme) {
    // 创建文件夹
    await mkdir(await join(await appLocalDataDir(), "themes")).catch(() => {});
    // 写入文件
    const path = await join(await appLocalDataDir(), "themes", `${theme.metadata.id}.pg-theme`);
    const yamlContent = `---\n${YAML.stringify(theme.metadata)}---\n${YAML.stringify(theme.content)}`;
    await writeTextFile(path, yamlContent);
  }
  export async function deleteCustomTheme(themeId: string) {
    const path = await join(await appLocalDataDir(), "themes", `${themeId}.pg-theme`);
    await remove(path).catch(() => {});
  }

  export async function ids() {
    // 列出所有内置和自定义主题
    const customThemesDir = await join(await appLocalDataDir(), "themes");
    const customThemeFiles = await readDir(customThemesDir).catch(() => []);
    const customThemeIds = customThemeFiles
      .filter((file) => file.name?.endsWith(".pg-theme"))
      .map((file) => file.name!.replace(/\.pg-theme$/, ""));
    return [...builtinThemes.map((theme) => theme.metadata.id), ...customThemeIds];
  }
  export async function list() {
    const ids_ = await ids();
    const themes = await Promise.all(ids_.map((id) => getThemeById(id)));
    return themes.filter((theme): theme is Themes.Theme => theme !== undefined);
  }
}
