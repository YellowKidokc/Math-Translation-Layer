import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { enhanceDocument } from "../src/browser/overlay";

describe("browser overlay", () => {
    it("enhances real article-shaped math blocks with toggle and summary", () => {
        const fixture = fs.readFileSync(
            path.join(__dirname, "fixtures", "convergence-01-why-god-drown-everybody.html"),
            "utf8"
        );
        const dom = new JSDOM(fixture, { url: "https://local.test/fixture.html" });
        const states = enhanceDocument(dom.window.document);

        expect(states).toHaveLength(1);
        expect(dom.window.document.querySelector(".mtl-toggle")).toBeNull();
        expect(dom.window.document.querySelector(".mtl-master-toggle")).toBeNull();
        expect(dom.window.document.querySelector(".mtl-meaning")?.textContent).toContain("coherence");
        expect(dom.window.document.querySelector(".math")?.textContent).toContain("\\chi");
    });

    it("uses reviewed table wording when a lookup match exists", () => {
        const dom = new JSDOM(`<div class="equation-block"><span class="math">$C^* = \\frac{G}{G + S}$</span></div>`);
        Object.assign(dom.window, {
            MATH_TRANSLATION_TABLE_V2: [
                {
                    key: "cggs",
                    equation: "C^* = \\frac{G}{G + S}",
                    visual: "steady coherence = grace divided by grace plus entropy",
                    meaning: "At equilibrium, coherence rises when grace dominates entropy."
                }
            ]
        });

        enhanceDocument(dom.window.document);

        expect(dom.window.document.querySelector(".mtl-word-equation")?.textContent).toBe(
            "steady coherence = grace divided by grace plus entropy"
        );
        expect(dom.window.document.querySelector(".mtl-meaning")?.textContent).toBe(
            "At equilibrium, coherence rises when grace dominates entropy."
        );
    });

    it("keeps article equations in math-like plain notation", () => {
        const dom = new JSDOM(
            `<div class="equation-block"><span class="math">$\\frac{dC}{dt} = O \\cdot G(1-C) - S \\cdot C$</span></div>`
        );

        enhanceDocument(dom.window.document);

        expect(dom.window.document.querySelector(".mtl-structure-map")?.textContent).toContain(
            "change in coherence"
        );
        expect(dom.window.document.querySelector(".mtl-structure-map")?.textContent).toContain("dC/dt");
        expect(dom.window.document.querySelector(".mtl-word-equation")?.textContent).toBe(
            "d(inner wholeness)/dt = willingness to receive * outside-in restoration force * (1 - inner wholeness) - breakdown pressure * inner wholeness"
        );
        expect(dom.window.document.querySelector(".mtl-meaning")?.textContent).toContain("external restoration force");
        expect(dom.window.document.querySelector(".equation-block")?.getAttribute("data-tts-skip")).toBe("true");
        expect(dom.window.document.querySelector(".mtl-card")?.getAttribute("data-tts-mode")).toBe(
            "read-word-equation-and-explanation"
        );
    });

    it("enhances GTQ math-box blocks without swallowing labels and notes", () => {
        const dom = new JSDOM(
            `<div class="math-box">
                <span class="mlabel">Quantum Superposition State</span>
                $$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$$
                <div class="mnote"><strong>Plain English:</strong> Original note stays outside the source.</div>
            </div>`
        );

        enhanceDocument(dom.window.document);

        expect(dom.window.document.querySelectorAll(".mtl-card")).toHaveLength(1);
        expect(dom.window.document.querySelector(".mtl-word-equation")?.textContent).toContain("quantum state");
        expect(dom.window.document.querySelector(".mtl-word-equation")?.textContent).not.toContain(
            "Quantum Superposition State"
        );
    });

    it("falls back from reviewed visual text that is still raw TeX", () => {
        const dom = new JSDOM(
            `<div class="equation-block"><span class="math">$\\chi = \\iiint(G \\cdot M \\cdot E \\cdot S \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C) \\, dx \\, dy \\, dt$</span></div>`
        );
        Object.assign(dom.window, {
            MATH_TRANSLATION_TABLE_V2: [
                {
                    key: "chiintgmestkrqfcdxdydt",
                    equation: "\\chi = \\iiint(G \\cdot M \\cdot E \\cdot S \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C) \\, dx \\, dy \\, dt",
                    visual: "chi equals \\iiint (G \\cdot M \\cdot E \\cdot S \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C) \\, dx \\, dy \\, dt",
                    meaning: "Chi equals the integrated product of the ten framework factors across space and time."
                }
            ]
        });

        enhanceDocument(dom.window.document);

        expect(dom.window.document.querySelector(".mtl-word-equation")?.textContent).toContain(
            "coherence output = triple integral"
        );
        expect(dom.window.document.querySelector(".mtl-meaning")?.textContent).toContain(
            "integrated product of the ten framework factors"
        );
    });
});
