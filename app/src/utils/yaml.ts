import YAML from "yaml";

/**
 * 将一个yaml文件里的内容根据三横杠分割线，解析成两个部分，前者为frontmatter，后者为content。
 * 原格式：
 * ---
 * aaa
 * ---
 * bbb
 *
 * 将aaa放入frontmatter，bbb放入content。
 *
 * @param yaml
 * @returns
 */
export function parseYamlWithFrontmatter<F, C>(
  yaml: string,
): {
  frontmatter: F;
  content: C;
} {
  // const frontmatterMatch = yaml.match(/---\n([\s\S]*?)\n---/);
  // const frontmatter = frontmatterMatch ? frontmatterMatch[1] : "";
  // const content = frontmatter ? yaml.replace(/---\n([\s\S]*?)\n---/, "") : yaml;

  yaml = yaml.trim();
  let contentList = yaml.split("---");
  // 过滤掉空字符串
  contentList = contentList.filter(Boolean);
  const frontmatter = contentList[0];
  const content = contentList[1];

  return { frontmatter: YAML.parse(frontmatter), content: YAML.parse(content) };
}
