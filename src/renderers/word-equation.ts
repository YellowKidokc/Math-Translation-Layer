import { MathAst, MathNode } from "../core/types";

function cleanDelimiter(value: string): string {
    return value
        .replace(/^\\left/, "")
        .replace(/^\\right/, "")
        .replace(/^\\/, "");
}

function groupDelimiters(node: Extract<MathNode, { kind: "group" }>): [string, string] | null {
    if (node.leftDelimiter && node.rightDelimiter) {
        return [cleanDelimiter(node.leftDelimiter), cleanDelimiter(node.rightDelimiter)];
    }

    if (node.delimiter === "none") {
        return null;
    }

    const delimiters = {
        brace: ["{", "}"],
        paren: ["(", ")"],
        bracket: ["[", "]"]
    } as const;

    return [...delimiters[node.delimiter]] as [string, string];
}

function joinChildren(children: MathNode[]): string {
    return children.map(renderNode).join(" ").replace(/\s+/g, " ").trim();
}

function renderFunctionArgument(node: MathNode): string {
    if (node.kind === "group") {
        return joinChildren(node.children);
    }

    return renderNode(node);
}

function operatorText(value: string): string {
    switch (value) {
        case "·":
        case "\\cdot":
        case "\\times":
            return "×";
        case "-":
            return "−";
        default:
            return value;
    }
}

function renderFunctionName(node: Extract<MathNode, { kind: "function" }>): string {
    if (node.translationStrategy === "replace-head" && node.translatedText) {
        return node.translatedText;
    }

    if (node.translatedText) {
        return node.translatedText;
    }

    return node.name;
}

function renderNode(node: MathNode): string {
    if (
        node.translatedText &&
        node.translationStrategy !== "replace-head" &&
        node.kind !== "group" &&
        node.kind !== "operator" &&
        node.kind !== "number"
    ) {
        return node.translatedText;
    }

    switch (node.kind) {
        case "group": {
            const content = joinChildren(node.children);
            const delimiters = groupDelimiters(node);
            if (!delimiters) {
                return content;
            }
            return `${delimiters[0]}${content}${delimiters[1]}`;
        }
        case "symbol":
            return node.name;
        case "number":
            return node.value;
        case "operator":
            return operatorText(node.value);
        case "fraction":
            return `(${renderNode(node.numerator)}) / (${renderNode(node.denominator)})`;
        case "root":
            return `sqrt(${renderNode(node.radicand)})`;
        case "superscript": {
            const base = renderNode(node.base);
            const exponent = renderNode(node.exponent);
            if (exponent === "2") {
                return `${base} squared`;
            }
            if (exponent === "3") {
                return `${base} cubed`;
            }
            return `${base}^${exponent}`;
        }
        case "subscript":
            return `${renderNode(node.base)}_${renderNode(node.subscript)}`;
        case "function":
            return `${renderFunctionName(node)}(${node.args.map(renderFunctionArgument).join(", ")})`;
        case "sum": {
            let value = "sum";
            if (node.lower) {
                value += `_${renderNode(node.lower)}`;
            }
            if (node.upper) {
                value += `^${renderNode(node.upper)}`;
            }
            return value;
        }
        case "product": {
            let value = "product";
            if (node.lower) {
                value += `_${renderNode(node.lower)}`;
            }
            if (node.upper) {
                value += `^${renderNode(node.upper)}`;
            }
            return value;
        }
        case "integral": {
            let value = "integral";
            if (node.lower) {
                value += `_${renderNode(node.lower)}`;
            }
            if (node.upper) {
                value += `^${renderNode(node.upper)}`;
            }
            return value;
        }
        case "derivative": {
            const symbol = node.operator === "partial" ? "partial" : "d";
            return `${symbol}(${renderNode(node.subject)}) / ${symbol}(${renderNode(node.variable)})`;
        }
        case "text":
            return node.value;
        case "opaque":
            return node.value;
        default:
            return "";
    }
}

export function renderWordEquation(ast: MathAst): string {
    return joinChildren(ast.children);
}
