import { MathAst, MathNode } from "../core/types";

function renderChildren(children: MathNode[], spoken = false): string {
    return children.map((child) => renderNode(child, spoken)).join(" ").replace(/\s+/g, " ").trim();
}

function operatorText(value: string, spoken: boolean): string {
    if (!spoken) {
        return value === "\\cdot" ? "·" : value;
    }

    switch (value) {
        case "=":
            return "equals";
        case "+":
            return "plus";
        case "-":
            return "minus";
        case "·":
        case "\\cdot":
            return "times";
        case "/":
            return "divided by";
        case "\\ge":
            return "is greater than or equal to";
        case "\\le":
            return "is less than or equal to";
        case "\\rightarrow":
            return "leads to";
        default:
            return value;
    }
}

function groupDelimiters(node: Extract<MathNode, { kind: "group" }>): [string, string] | null {
    if (node.leftDelimiter && node.rightDelimiter) {
        const left = node.leftDelimiter === "\\{" ? "{" : node.leftDelimiter;
        const right = node.rightDelimiter === "\\}" ? "}" : node.rightDelimiter;
        return [left, right];
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

function renderFunctionArgument(node: MathNode): string {
    if (node.kind === "group") {
        return renderChildren(node.children, false);
    }

    return renderNode(node, false);
}

function renderSpokenFunctionArgument(node: MathNode): string {
    if (node.kind === "group") {
        return renderChildren(node.children, true);
    }

    return renderNode(node, true);
}

function renderNode(node: MathNode, spoken: boolean): string {
    if (
        node.translatedText &&
        node.translationStrategy !== "replace-head" &&
        node.kind !== "group" &&
        node.kind !== "operator" &&
        node.kind !== "number"
    ) {
        return spoken ? node.spokenText ?? node.translatedText : node.translatedText;
    }

    switch (node.kind) {
        case "group": {
            const content = renderChildren(node.children, spoken);
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
            return operatorText(node.value, spoken);
        case "fraction":
            return spoken
                ? `the ratio of ${renderNode(node.numerator, spoken)} to ${renderNode(node.denominator, spoken)}`
                : `${renderNode(node.numerator, spoken)} / ${renderNode(node.denominator, spoken)}`;
        case "root":
            return spoken
                ? `the square root of ${renderNode(node.radicand, spoken)}`
                : `sqrt(${renderNode(node.radicand, spoken)})`;
        case "superscript":
            return spoken
                ? `${renderNode(node.base, spoken)} to the power of ${renderNode(node.exponent, spoken)}`
                : `${renderNode(node.base, spoken)}^${renderNode(node.exponent, spoken)}`;
        case "subscript":
            return spoken
                ? `${renderNode(node.base, spoken)} sub ${renderNode(node.subscript, spoken)}`
                : `${renderNode(node.base, spoken)}_${renderNode(node.subscript, spoken)}`;
        case "function":
            return `${node.translationStrategy === "replace-head" && node.translatedText
                ? spoken ? node.spokenText ?? node.translatedText : node.translatedText
                : node.name}(${node.args.map((arg) => spoken
                    ? renderSpokenFunctionArgument(arg)
                    : renderFunctionArgument(arg)).join(", ")})`;
        case "sum":
            return spoken ? "sum" : "sum";
        case "product":
            return spoken ? "product" : "prod";
        case "integral":
            return spoken ? "integral" : node.command;
        case "derivative":
            return spoken
                ? `${node.operator === "partial" ? "partial" : "d"} ${renderNode(node.subject, spoken)} over ${node.operator === "partial" ? "partial" : "d"} ${renderNode(node.variable, spoken)}`
                : `${node.operator === "partial" ? "∂" : "d"}(${renderNode(node.subject, spoken)})/${node.operator === "partial" ? "∂" : "d"}(${renderNode(node.variable, spoken)})`;
        case "text":
            return node.value;
        case "opaque":
            return node.value;
        default:
            return "";
    }
}

export function renderPlaintext(ast: MathAst): string {
    return renderChildren(ast.children, false);
}

export function renderTtsPlaintext(ast: MathAst): string {
    return renderChildren(ast.children, true);
}
