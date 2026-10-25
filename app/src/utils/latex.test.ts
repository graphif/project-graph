import { describe, expect, it } from "vitest";
import katex from "katex";
import { extractLatexSource } from "./latex";

describe("whole-node LaTeX detection", () => {
  it.each(["$x^2$", "$$x^2$$", "\\[x^2\\]", "\\(x^2\\)"])("recognizes %s", (source) => {
    expect(extractLatexSource(source)).toBe("x^2");
  });
  it.each([
    "",
    "$$",
    "$$$$",
    "$ $",
    "$a$ and $b$",
    "价格 $20",
    "说明 \\begin{equation}x\\end{equation}",
    "\\begin{equation}x\\end{align}",
  ])("keeps non-formulas as text: %s", (source) => {
    expect(extractLatexSource(source)).toBeNull();
  });
  it("recognizes and renders the equation from test.prg with Chinese text", () => {
    const source = String.raw`\begin{equation}
    \mathbf{F} = \frac{d\mathbf{p}}{dt}, \quad \text{其中 } \mathbf{p} = m\mathbf{v}
\end{equation}`;
    expect(extractLatexSource(source)).toBe(source);
    const html = katex.renderToString(source, { throwOnError: true, displayMode: true });
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('class="katex-error"');
    expect(html).toContain("其中");
  });
});
