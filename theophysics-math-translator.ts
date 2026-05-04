import { extractMathBlocks, translate, translateDocument as translateStandaloneDocument } from "./src/core";

export class MathTranslator {
    static translate(latex: string): string {
        return translate({
            input: latex,
            format: "tex",
            dictionary: "theophysics",
            mode: "narrative",
            renderer: "plaintext"
        }).output;
    }

    static extractMathBlocks(content: string): Array<{ latex: string; start: number; end: number; isBlock: boolean }> {
        return extractMathBlocks(content);
    }

    static translateDocument(content: string): Array<{ original: string; translation: string; position: number }> {
        return translateStandaloneDocument(content, {
            dictionary: "theophysics",
            mode: "narrative",
            renderer: "plaintext"
        }).map((item) => ({
            original: item.original,
            translation: item.translation,
            position: item.position
        }));
    }
}
