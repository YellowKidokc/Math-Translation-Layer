import { MathAst, MathNode } from "../core/types";

function escapeText(value: string): string {
    return value.replace(/\\/g, "\\textbackslash ").replace(/[{}]/g, "");
}

function renderChildren(children: MathNode[]): string {
    return children.map(renderNode).join(" ").replace(/\s+/g, " ").trim();
}

function renderScriptValue(node: MathAst | MathNode): string {
    if (node.kind === "group" && node.delimiter === "none") {
        return renderChildren(node.children);
    }
    return renderNode(node as MathNode);
}

function renderFunctionArgument(node: MathAst | MathNode): string {
    if (node.kind === "group") {
        return renderChildren(node.children);
    }

    return renderNode(node as MathNode);
}

function groupDelimiters(node: Extract<MathNode, { kind: "group" }>): [string, string] | null {
    if (node.leftDelimiter && node.rightDelimiter) {
        return [node.leftDelimiter, node.rightDelimiter];
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

function renderNode(node: MathNode): string {
    if (
        node.translatedText &&
        node.translationStrategy !== "replace-head" &&
        node.kind !== "group" &&
        node.kind !== "operator" &&
        node.kind !== "number"
    ) {
        return `\\text{${escapeText(node.translatedText)}}`;
    }

    switch (node.kind) {
        case "group": {
            const content = renderChildren(node.children);
            const delimiters = groupDelimiters(node);
            if (!delimiters) {
                return content;
            }
            const [left, right] = delimiters;
            if (node.scalable) {
                return `\\left${left}${content}\\right${right}`;
            }
            return `${left}${content}${right}`;
        }
        case "symbol":
            return node.name;
        case "number":
            return node.value;
        case "operator":
            return node.value === "·" ? "\\cdot" : node.value;
        case "fraction":
            return `\\frac{${renderScriptValue(node.numerator)}}{${renderScriptValue(node.denominator)}}`;
        case "root":
            return `\\sqrt{${renderScriptValue(node.radicand)}}`;
        case "superscript":
            return `${renderNode(node.base)}^{${renderScriptValue(node.exponent)}}`;
        case "subscript":
            return `${renderNode(node.base)}_{${renderScriptValue(node.subscript)}}`;
        case "function":
            return `${node.translationStrategy === "replace-head" && node.translatedText
                ? `\\text{${escapeText(node.translatedText)}}`
                : node.name}${node.args.map((arg) => `(${renderFunctionArgument(arg)})`).join("")}`;
        case "sum": {
            let value = "\\sum";
            if (node.lower) {
                value += `_{${renderScriptValue(node.lower)}}`;
            }
            if (node.upper) {
                value += `^{${renderScriptValue(node.upper)}}`;
            }
            return value;
        }
        case "product": {
            let value = "\\prod";
            if (node.lower) {
                value += `_{${renderScriptValue(node.lower)}}`;
            }
            if (node.upper) {
                value += `^{${renderScriptValue(node.upper)}}`;
            }
            return value;
        }
        case "integral": {
            let value = node.command;
            if (node.lower) {
                value += `_{${renderScriptValue(node.lower)}}`;
            }
            if (node.upper) {
                value += `^{${renderScriptValue(node.upper)}}`;
            }
            return value;
        }
        case "derivative": {
            const symbol = node.operator === "partial" ? "\\partial" : "d";
            return `\\frac{${symbol}${renderScriptValue(node.subject)}}{${symbol}${renderScriptValue(node.variable)}}`;
        }
        case "text":
            return `\\text{${escapeText(node.value)}}`;
        case "opaque":
            return node.value;
        default:
            return "";
    }
}

export function renderLatexStructural(ast: MathAst): string {
    return renderChildren(ast.children);
}
