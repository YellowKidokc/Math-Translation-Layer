import { describe, expect, it } from "vitest";
import { translate } from "../src/core";

describe("translation", () => {
    it("rewrites master equation entropy as effective entropy in structural mode", () => {
        const result = translate({
            input: "\\chi = G \\cdot M \\cdot E \\cdot S \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C",
            format: "tex",
            dictionary: "theophysics",
            mode: "structural",
            renderer: "latex-structural"
        });

        expect(result.output).toContain("Effective Entropy Factor");
        expect(result.output).not.toContain("\\text{Entropy}");
    });

    it("uses narrative overrides for mapped equations", () => {
        const result = translate({
            input: "\\frac{dS_m}{dt} = \\sigma - \\frac{W_{grace}}{T}",
            format: "tex",
            dictionary: "theophysics",
            mode: "narrative",
            renderer: "plaintext"
        });

        expect(result.output).toContain("Moral entropy");
        expect(result.summary).toContain("grace");
    });

    it("keeps C distinct from chi", () => {
        const result = translate({
            input: "\\chi = C",
            format: "tex",
            dictionary: "theophysics",
            mode: "structural",
            renderer: "latex-structural"
        });

        expect(result.output).toContain("Coherence Output");
        expect(result.output).toContain("Christ Factor");
    });

    it("preserves translated function heads with their arguments", () => {
        const result = translate({
            input: "\\chi(t) = R(t)",
            format: "tex",
            dictionary: "theophysics",
            mode: "structural",
            renderer: "latex-structural"
        });

        expect(result.output).toContain("\\text{Coherence Output}(t)");
        expect(result.output).toContain("\\text{Grace Resistance}");
    });
});
