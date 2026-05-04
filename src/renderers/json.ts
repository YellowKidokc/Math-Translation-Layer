import { TranslatedMath } from "../core/types";

export function renderJson(translated: TranslatedMath): string {
    return JSON.stringify(
        {
            dictionaryId: translated.dictionaryId,
            mode: translated.mode,
            equationId: translated.equationId,
            summary: translated.summary,
            narrative: translated.narrative,
            diagnostics: translated.diagnostics,
            resolvedSymbolCount: translated.resolvedSymbolCount
        },
        null,
        2
    );
}
