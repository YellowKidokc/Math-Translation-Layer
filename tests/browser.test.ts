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
        const dom = new JSDOM(fixture);
        const states = enhanceDocument(dom.window.document);

        expect(states).toHaveLength(1);
        expect(dom.window.document.querySelector(".mtl-toggle")).toBeTruthy();
        expect(dom.window.document.querySelector(".mtl-summary")?.textContent).toContain("coherence");
        expect(dom.window.document.querySelector(".math")?.textContent).toContain("\\[");
    });
});
