import { describe, expect, it } from "vitest";
import { loadDictionary } from "../src/dictionaries";

describe("dictionary", () => {
    it("publishes the canonical factor order", () => {
        const dictionary = loadDictionary("theophysics");
        expect(dictionary.data.metadata.factorOrder).toEqual([
            "G",
            "M",
            "E",
            "S_eff",
            "T",
            "K",
            "R",
            "Q",
            "F",
            "C"
        ]);
    });

    it("has summaries for every equation rule", () => {
        const dictionary = loadDictionary("theophysics");
        for (const equation of dictionary.data.equations) {
            expect(dictionary.data.summaries[equation.equationId]).toBeTruthy();
        }
    });
});
