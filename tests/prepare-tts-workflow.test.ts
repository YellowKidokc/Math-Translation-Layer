import { describe, expect, it } from "vitest";

const workflow = require("../scripts/prepare-tts-workflow.js");

describe("prepare-tts-workflow extraction + speech shaping", () => {
  it("extracts fallback main article body and records strategy", () => {
    const stats = { extractionStrategy: "none", mathBlocks: 0, failedMathBlocks: 0, diagnostics: [], translationEvents: [], runUuid: "r", documentUuid: "d" };
    const text = workflow.visibleHtmlToText(
      `<html><body><main><article><h1>Title</h1><p>Body line.</p><div class='equation-block'>$\\chi = G$</div></article></main></body></html>`,
      { opener: "", skipMath: true },
      stats
    );
    expect(text).toContain("Body line.");
    expect(stats.extractionStrategy).toBe("fallback-article");
  });

  it("speech cleanup strips raw tex markers", () => {
    const cleaned = workflow.cleanText("Value: \\chi \\cdot C >= 0 and \\text{ok}");
    expect(cleaned).toContain("chi");
    expect(cleaned).toContain("times");
    expect(cleaned).not.toContain("\\\\text");
  });
});
