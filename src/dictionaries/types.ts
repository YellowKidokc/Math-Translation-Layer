import { MathAst, TranslatedMath, TranslationDiagnostic } from "../core/types";

export interface DictionaryMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    factorOrder: string[];
    canonicalInputs: string[];
}

export interface DictionaryAlias {
    pattern: string;
    replacement: string;
}

export interface SymbolRule {
    id: string;
    pattern: string;
    label: string;
    spoken?: string;
    canonicalName?: string;
    spiritualReading?: string;
}

export interface StructureRule {
    id: string;
    pattern: string;
    label: string;
    spoken?: string;
}

export interface EquationRule {
    equationId: string;
    title: string;
    patterns: string[];
    narrative: string;
    summary: string;
}

export interface DictionaryData {
    metadata: DictionaryMetadata;
    aliases: DictionaryAlias[];
    symbols: SymbolRule[];
    structures: StructureRule[];
    equations: EquationRule[];
    summaries: Record<string, string>;
}

export interface DictionaryHooks {
    normalizeInput(input: string): string;
    decorateStructuralAst(ast: MathAst, context: { equationId?: string }): MathAst;
    buildDiagnostics(ast: MathAst, diagnostics: TranslationDiagnostic[]): TranslationDiagnostic[];
    fallbackSummary(translated: TranslatedMath): string | undefined;
}

export interface LoadedDictionary {
    data: DictionaryData;
    hooks: DictionaryHooks;
}
