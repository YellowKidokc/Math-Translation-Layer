import { extractMathBlocks } from "./extract";
import { parseMath } from "./parser";
import { renderMath, withRenderedOutput } from "./renderer";
import { assessQuality } from "./quality-gate";
import { generateInsight } from "./structural-insight";
import { translateMath } from "./translator";
import {
    InputFormat,
    RenderOptions,
    RendererId,
    TranslationResult,
    TranslationMode,
    TranslationOutput
} from "./types";
import { renderLatexStructural, renderWordEquation } from "../renderers";
import { loadDictionary } from "../dictionaries";

export * from "./extract";
export * from "./parser";
export * from "./renderer";
export * from "./translator";
export * from "./types";

export interface TranslateRequest {
    input: string;
    format: InputFormat;
    dictionary: string;
    mode: TranslationMode;
    renderer: RendererId;
    displayMode?: boolean;
}

export interface TranslateEquationOptions {
    format?: InputFormat;
    dictionary?: string;
    enableFallback?: boolean;
    displayMode?: boolean;
}

let envLoaded = false;

function maybeLoadEnvFile(): void {
    if (envLoaded) {
        return;
    }

    envLoaded = true;
    const loader = (process as typeof process & { loadEnvFile?: (path?: string) => void }).loadEnvFile;
    if (typeof loader === "function") {
        try {
            loader();
        } catch {
            // Ignore missing .env files and continue with the process environment.
        }
    }
}

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}

export function translate(request: TranslateRequest): TranslationOutput {
    const ast = parseMath(request.input, {
        format: request.format,
        displayMode: request.displayMode
    });
    const translated = translateMath(ast, {
        dictionary: request.dictionary,
        mode: request.mode
    });
    return withRenderedOutput(translated, {
        renderer: request.renderer
    } as RenderOptions);
}

export async function translateEquation(
    input: string,
    options: TranslateEquationOptions = {}
): Promise<TranslationResult> {
    const format = options.format ?? "tex";
    const dictionaryId = options.dictionary ?? "theophysics";
    const enableFallback = options.enableFallback ?? true;
    const ast = parseMath(input, {
        format,
        displayMode: options.displayMode
    });
    const translated = translateMath(ast, {
        dictionary: dictionaryId,
        mode: "structural"
    });
    const original = renderLatexStructural(ast);
    let wordEquation = renderWordEquation(translated.ast);
    let spokenExplanation = generateInsight(translated.ast);
    const quality = assessQuality(translated.ast, wordEquation);
    const diagnostics = dedupe([
        ...ast.meta.parseIssues.map((issue) => issue.message),
        ...translated.diagnostics.map((diagnostic) => diagnostic.message),
        ...quality.structuralIssues
    ]);

    let usedFallback = false;
    if (quality.useFallback && enableFallback) {
        maybeLoadEnvFile();
        try {
            const { llmFallback } = await import("./llm-fallback");
            const dictionary = loadDictionary(dictionaryId);
            const fallback = await llmFallback(input, dictionary.data, {
                wordEquation,
                insight: spokenExplanation
            });
            wordEquation = fallback.wordEquation;
            spokenExplanation = fallback.spokenExplanation;
            usedFallback = true;
        } catch (error) {
            diagnostics.push(
                error instanceof Error
                    ? `Fallback unavailable: ${error.message}`
                    : `Fallback unavailable: ${String(error)}`
            );
        }
    }

    if (usedFallback) {
        diagnostics.push("LLM fallback applied after deterministic confidence fell below threshold.");
    }

    return {
        original,
        wordEquation,
        spokenExplanation,
        summary: translated.summary,
        equationId: translated.equationId,
        confidence: quality.confidence,
        usedFallback,
        diagnostics: dedupe(diagnostics)
    };
}

export function translateDocument(
    content: string,
    options: {
        dictionary: string;
        mode: TranslationMode;
        renderer: RendererId;
        format?: InputFormat;
    }
): Array<{ original: string; translation: string; position: number; summary?: string; equationId?: string }> {
    return extractMathBlocks(content).map((block) => {
        const translated = translate({
            input: block.latex,
            format: options.format ?? "tex",
            dictionary: options.dictionary,
            mode: options.mode,
            renderer: options.renderer,
            displayMode: block.isBlock
        });

        return {
            original: block.latex,
            translation: translated.output,
            position: block.start,
            summary: translated.summary,
            equationId: translated.equationId
        };
    });
}
