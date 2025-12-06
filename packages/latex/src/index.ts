/** @see https://github.com/mathjax/MathJax/issues/2385#issuecomment-1253051223 */

import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html";
import { TeX } from "mathjax-full/js/input/tex";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages";
import { mathjax } from "mathjax-full/js/mathjax";
import { SVG } from "mathjax-full/js/output/svg";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const mathjaxDocument = mathjax.document("", {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: "local" }),
});

export function latex2svg(math: string): string {
  const node = mathjaxDocument.convert(math, {
    em: 16,
    ex: 8,
    containerWidth: 1280,
  });
  return adaptor.innerHTML(node);
}
