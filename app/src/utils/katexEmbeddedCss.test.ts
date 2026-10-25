import { describe, expect, it } from "vitest";
import { katexEmbeddedCss } from "./katexEmbeddedCss";

describe("embedded KaTeX fonts", () => {
  it("embeds every font face without external font URLs", () => {
    const faces = katexEmbeddedCss.match(/@font-face\{[^}]+\}/g) ?? [];
    expect(faces).toHaveLength(20);
    for (const face of faces) {
      expect(face).toMatch(/src:url\("data:font\/woff2;base64,[A-Za-z0-9+/=]+"\) format\("woff2"\)/);
    }
    expect(katexEmbeddedCss).not.toMatch(/url\((?!"data:)/);
    expect(katexEmbeddedCss).toContain("KaTeX_Math");
    expect(katexEmbeddedCss).toContain("KaTeX_Size4");
  });
});
