import { MathAst, MathNode, TranslationDiagnostic, TranslatedMath } from "../core/types";
import { DictionaryHooks } from "./types";

function cloneNode<T extends MathNode>(node: T): T {
    return JSON.parse(JSON.stringify(node)) as T;
}

function walk(node: MathNode, visitor: (current: MathNode) => void): void {
    visitor(node);

    switch (node.kind) {
        case "group":
            node.children.forEach((child) => walk(child, visitor));
            return;
        case "fraction":
            walk(node.numerator, visitor);
            walk(node.denominator, visitor);
            return;
        case "root":
            walk(node.radicand, visitor);
            return;
        case "superscript":
            walk(node.base, visitor);
            walk(node.exponent, visitor);
            return;
        case "subscript":
            walk(node.base, visitor);
            walk(node.subscript, visitor);
            return;
        case "function":
            node.args.forEach((arg) => walk(arg, visitor));
            return;
        case "sum":
        case "product":
        case "integral":
            if (node.lower) {
                walk(node.lower, visitor);
            }
            if (node.upper) {
                walk(node.upper, visitor);
            }
            return;
        case "derivative":
            walk(node.subject, visitor);
            walk(node.variable, visitor);
            return;
        default:
            return;
    }
}

function structuralizeMasterEntropy(node: MathNode): void {
    if (node.kind === "symbol" && (node.name === "S" || node.name === "S_prod")) {
        node.translatedText = "Effective Entropy Factor";
        node.spokenText = "S effective";
    }
}

export const theophysicsHooks: DictionaryHooks = {
    normalizeInput(input: string): string {
        return input
            .replace(/\$\$/g, "")
            .replace(/\$/g, "")
            .replace(/\\,/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    },

    decorateStructuralAst(ast: MathAst, context: { equationId?: string }): MathAst {
        const clone = cloneNode(ast);

        if (context.equationId === "master-equation-local" || context.equationId === "master-equation-total") {
            walk(clone, structuralizeMasterEntropy);
        }

        return clone;
    },

    buildDiagnostics(ast: MathAst, diagnostics: TranslationDiagnostic[]): TranslationDiagnostic[] {
        const next = [...diagnostics];
        walk(ast, (node) => {
            if (node.kind === "opaque") {
                next.push({
                    type: "unsupported",
                    message: "Opaque construct preserved during parsing.",
                    source: node.value
                });
            }
        });
        return next;
    },

    fallbackSummary(translated: TranslatedMath): string | undefined {
        if (translated.equationId) {
            return translated.summary;
        }

        if (translated.resolvedSymbolCount > 0) {
            return "Structural translation applied using the Theophysics dictionary.";
        }

        return undefined;
    }
};
