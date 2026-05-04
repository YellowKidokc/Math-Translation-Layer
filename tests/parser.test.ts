import { describe, expect, it } from "vitest";
import { parseMath } from "../src/core";
import { renderLatexStructural } from "../src/renderers";

describe("parser", () => {
    it("parses derivatives and nested fractions", () => {
        const ast = parseMath("\\frac{dS_m}{dt} = \\sigma - \\frac{W_{grace}}{T}", {
            format: "tex"
        });

        expect(ast.children.some((node) => node.kind === "derivative")).toBe(true);
        expect(ast.children.some((node) => node.kind === "fraction")).toBe(true);
    });

    it("parses integrals and preserves structure nodes", () => {
        const ast = parseMath("\\int_0^\\infty G \\cdot K \\, dt", {
            format: "tex"
        });

        expect(ast.children[0]?.kind).toBe("integral");
        expect(ast.children.some((node) => node.kind === "operator")).toBe(true);
    });

    it("preserves styled symbols and left-right grouping without phantom multiplication", () => {
        const ast = parseMath("\\mathcal{L} = \\chi(t) \\left( \\frac{d}{dt} \\sum_i v_i \\right)^2 - S \\cdot \\chi(t)", {
            format: "tex"
        });

        const rendered = renderLatexStructural(ast);

        expect(rendered).toContain("\\mathcal{L}");
        expect(rendered).toContain("\\left(");
        expect(rendered).toContain("\\right)");
        expect(rendered).not.toContain("\\chi(t) \\cdot \\left");
        expect(rendered).not.toContain("\\sum_{i} \\cdot v_{i}");
    });

    it("records parse issues for unmatched left-right delimiters", () => {
        const ast = parseMath("\\left( G + M", {
            format: "tex"
        });

        expect(ast.meta.parseIssues.length).toBeGreaterThan(0);
        expect(ast.meta.parseIssues[0]?.message).toContain("matching \\right");
    });
});
