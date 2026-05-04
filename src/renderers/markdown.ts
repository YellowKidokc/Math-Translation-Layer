import { MathAst, TranslationMode } from "../core/types";
import { renderLatexStructural } from "./latex-structural";
import { renderPlaintext } from "./plaintext";

export function renderMarkdown(ast: MathAst, mode: TranslationMode, narrative?: string): string {
    if (mode === "narrative" && narrative) {
        return narrative;
    }

    return `$${renderLatexStructural(ast)}$`;
}

export function renderNarrativeMarkdown(ast: MathAst): string {
    return renderPlaintext(ast);
}
