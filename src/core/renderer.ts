import {
    RenderOptions,
    RendererId,
    TranslationOutput,
    TranslatedMath
} from "./types";
import {
    renderHtmlMathJax,
    renderJson,
    renderLatexStructural,
    renderMarkdown,
    renderNarrativeMarkdown,
    renderPlaintext,
    renderTtsPlaintext,
    renderWordEquation
} from "../renderers";

function renderById(translated: TranslatedMath, renderer: RendererId): string {
    switch (renderer) {
        case "latex-structural":
            return renderLatexStructural(translated.ast);
        case "plaintext":
            return translated.mode === "narrative" && translated.narrative
                ? translated.narrative
                : renderPlaintext(translated.ast);
        case "markdown":
            return translated.mode === "narrative" && translated.narrative
                ? renderNarrativeMarkdown(translated.ast)
                : renderMarkdown(translated.ast, translated.mode, translated.narrative);
        case "tts":
            return translated.mode === "narrative" && translated.narrative
                ? translated.narrative
                : renderTtsPlaintext(translated.ast);
        case "json":
            return renderJson(translated);
        case "html-mathjax":
            return renderHtmlMathJax(translated.ast);
        case "word-equation":
            return renderWordEquation(translated.ast);
        default:
            throw new Error(`Unsupported renderer: ${renderer}`);
    }
}

export function renderMath(translated: TranslatedMath, options: RenderOptions): string {
    return renderById(translated, options.renderer);
}

export function withRenderedOutput(
    translated: TranslatedMath,
    options: RenderOptions
): TranslationOutput {
    return {
        ...translated,
        output: renderMath(translated, options)
    };
}
