/**
 * 解析用户在设置中填写的 AI 请求头。
 * 每行一个请求头，格式为 `Name: Value`；空行与以 # 开头的行会被忽略。
 * 例如 OpenCode 推理 API 需要的 `x-opencode-org-id: <org-id>`。
 */
export function parseAIRequestHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) continue;
    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!name) continue;
    headers[name] = value;
  }
  return headers;
}
