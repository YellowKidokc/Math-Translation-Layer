import { nodeSource } from "./ast-utils";
import { MathAst, MathNode, TranslationQuality } from "./types";

function unique(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}

export function assessQuality(ast: MathAst, wordEquation: string): TranslationQuality {
    const unmappedSymbols: string[] = [];
    let opaqueNodes = 0;
    let hasDerivative = false;
    let hasSum = false;
    let hasSquared = false;

    const visit = (node: MathNode): void => {
        if (node.kind === "derivative") {
            hasDerivative = true;
        }

        if (node.kind === "sum") {
            hasSum = true;
        }

        if (node.kind === "superscript" && (nodeSource(node.exponent) === "2" || nodeSource(node.exponent) === "{2}")) {
            hasSquared = true;
        }

        if (node.kind === "opaque") {
            opaqueNodes += 1;
            return;
        }

        if (node.translatedText && node.translationStrategy !== "replace-head") {
            return;
        }

        if (node.kind === "symbol" && !node.translatedText) {
            unmappedSymbols.push(node.name);
        }

        if (node.kind === "function" && !node.translatedText) {
            unmappedSymbols.push(node.name);
        }

        switch (node.kind) {
            case "group":
                node.children.forEach(visit);
                return;
            case "fraction":
                visit(node.numerator);
                visit(node.denominator);
                return;
            case "root":
                visit(node.radicand);
                return;
            case "superscript":
                visit(node.base);
                visit(node.exponent);
                return;
            case "subscript":
                visit(node.base);
                visit(node.subscript);
                return;
            case "function":
                node.args.forEach(visit);
                return;
            case "sum":
            case "product":
            case "integral":
                if (node.lower) {
                    visit(node.lower);
                }
                if (node.upper) {
                    visit(node.upper);
                }
                return;
            case "derivative":
                visit(node.subject);
                visit(node.variable);
                return;
            default:
                return;
        }
    };

    ast.children.forEach(visit);

    const structuralIssues = ast.meta.parseIssues.map((issue) => issue.message);
    const uniqueUnmapped = unique(unmappedSymbols);
    let confidence = 1;
    confidence -= uniqueUnmapped.length * 0.1;
    confidence -= opaqueNodes * 0.15;
    confidence -= structuralIssues.length * 0.2;

    if (hasDerivative && hasSum && hasSquared && uniqueUnmapped.length >= 2) {
        confidence -= 0.15;
        structuralIssues.push("Complex higher-order structure remains only partially resolved.");
    }

    if (/\\[A-Za-z]+/.test(wordEquation)) {
        confidence -= 0.3;
        structuralIssues.push("Residual LaTeX commands remain in the word equation.");
    }

    confidence = Math.max(0, Math.min(1, confidence));

    return {
        confidence,
        unmappedSymbols: uniqueUnmapped,
        opaqueNodes,
        structuralIssues: unique(structuralIssues),
        useFallback: confidence < 0.7
    };
}
