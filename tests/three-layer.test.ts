import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResponsesCreate = vi.fn();

vi.mock("openai", () => {
    class OpenAI {
        responses = {
            create: mockResponsesCreate
        };
    }

    return {
        default: OpenAI
    };
});

import { translateEquation } from "../src/core";

describe("three-layer pipeline", () => {
    beforeEach(() => {
        mockResponsesCreate.mockReset();
        delete process.env.OPENAI_API_KEY;
    });

    it("translates the master equation deterministically", async () => {
        const result = await translateEquation(
            "\\chi = G \\cdot M \\cdot E \\cdot S_{eff} \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C",
            {
                enableFallback: true
            }
        );

        expect(result.original).toContain("\\chi");
        expect(result.wordEquation).toContain("Coherence Output");
        expect(result.wordEquation).toContain("Grace × Alignment × Truth");
        expect(result.spokenExplanation).toContain("chain where every link must hold");
        expect(result.confidence).toBeGreaterThan(0.9);
        expect(result.usedFallback).toBe(false);
        expect(mockResponsesCreate).not.toHaveBeenCalled();
    });

    it("translates the moral entropy equation deterministically", async () => {
        const result = await translateEquation(
            "\\frac{dS_m}{dt} = \\sigma - \\frac{W_{grace}}{T}",
            {
                enableFallback: true
            }
        );

        expect(result.wordEquation).toContain("Moral Entropy");
        expect(result.wordEquation).toContain("Entropy Generation");
        expect(result.wordEquation).toContain("Grace Work");
        expect(result.spokenExplanation).toContain("rate of change");
        expect(result.usedFallback).toBe(false);
    });

    it("translates the grace function without fallback", async () => {
        const result = await translateEquation(
            "G(t) = G_0 \\cdot e^{\\int r(t') dt'} \\cdot (1 - R(t))",
            {
                enableFallback: true
            }
        );

        expect(result.wordEquation).toContain("Initial Grace");
        expect(result.wordEquation).toContain("Grace Resistance");
        expect(result.spokenExplanation).toContain("accumulates the quantity over time");
        expect(result.usedFallback).toBe(false);
    });

    it("uses the fallback for low-confidence complex equations", async () => {
        process.env.OPENAI_API_KEY = "test-key";
        mockResponsesCreate.mockResolvedValue({
            output_text: JSON.stringify({
                wordEquation: "Lagrangian = Corrected Word Equation",
                spokenExplanation: "This equation has two competing terms, and the balance between motion and decay determines the dynamics."
            })
        });

        const result = await translateEquation(
            "\\mathcal{L} = \\chi(t) \\left( \\frac{d}{dt} \\sum_i v_i \\right)^2 - S \\cdot \\chi(t)",
            {
                enableFallback: true
            }
        );

        expect(result.usedFallback).toBe(true);
        expect(result.wordEquation).toContain("Corrected Word Equation");
        expect(result.spokenExplanation).toContain("competing terms");
        expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
    });
});
