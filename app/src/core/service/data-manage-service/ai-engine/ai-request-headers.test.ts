import { describe, expect, it } from "vitest";
import { parseAIRequestHeaders } from "./AIRequestHeaders";

describe("parseAIRequestHeaders", () => {
  it("解析 Name: Value 形式的请求头", () => {
    expect(parseAIRequestHeaders("x-opencode-org-id: org-123\nAuthorization: Bearer token")).toEqual({
      "x-opencode-org-id": "org-123",
      Authorization: "Bearer token",
    });
  });

  it("忽略空行、注释与非法行", () => {
    expect(parseAIRequestHeaders("\n# comment\nno-colon-here\n  \nX-Test: 1\n: empty-name")).toEqual({
      "X-Test": "1",
    });
  });

  it("去掉名称与值两侧的空白", () => {
    expect(parseAIRequestHeaders("  X-Test :   value  ")).toEqual({ "X-Test": "value" });
  });

  it("空字符串返回空对象", () => {
    expect(parseAIRequestHeaders("")).toEqual({});
  });
});
