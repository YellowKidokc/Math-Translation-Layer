import { MathAst } from "../core/types";
import { renderLatexStructural } from "./latex-structural";

export function renderHtmlMathJax(ast: MathAst): string {
    const latex = renderLatexStructural(ast);
    const wrapper = ast.meta.displayMode ? ["\\[", "\\]"] : ["\\(", "\\)"];
    return `${wrapper[0]}${latex}${wrapper[1]}`;
}
