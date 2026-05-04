import { MathNode } from "./types";

export function nodeSource(node: MathNode): string {
    switch (node.kind) {
        case "group":
            return node.children.map(nodeSource).join(" ").trim();
        case "symbol":
            return node.name;
        case "number":
            return node.value;
        case "operator":
            return node.value;
        case "fraction":
            return `\\frac{${nodeSource(node.numerator)}}{${nodeSource(node.denominator)}}`;
        case "root":
            return `\\sqrt{${nodeSource(node.radicand)}}`;
        case "superscript":
            return `${nodeSource(node.base)}^${nodeSource(node.exponent)}`;
        case "subscript":
            return `${nodeSource(node.base)}_${nodeSource(node.subscript)}`;
        case "function":
            return `${node.name}${node.args.map((arg) => `(${nodeSource(arg)})`).join("")}`;
        case "integral":
            return node.command;
        case "sum":
            return "\\sum";
        case "product":
            return "\\prod";
        case "derivative":
            return `\\frac{${node.operator}${nodeSource(node.subject)}}{${node.operator}${nodeSource(node.variable)}}`;
        case "text":
            return node.value;
        case "opaque":
            return node.value;
        default:
            return "";
    }
}

export function walkMath(node: MathNode, visitor: (current: MathNode) => void): void {
    visitor(node);

    switch (node.kind) {
        case "group":
            node.children.forEach((child) => walkMath(child, visitor));
            return;
        case "fraction":
            walkMath(node.numerator, visitor);
            walkMath(node.denominator, visitor);
            return;
        case "root":
            walkMath(node.radicand, visitor);
            return;
        case "superscript":
            walkMath(node.base, visitor);
            walkMath(node.exponent, visitor);
            return;
        case "subscript":
            walkMath(node.base, visitor);
            walkMath(node.subscript, visitor);
            return;
        case "function":
            node.args.forEach((arg) => walkMath(arg, visitor));
            return;
        case "sum":
        case "product":
        case "integral":
            if (node.lower) {
                walkMath(node.lower, visitor);
            }
            if (node.upper) {
                walkMath(node.upper, visitor);
            }
            return;
        case "derivative":
            walkMath(node.subject, visitor);
            walkMath(node.variable, visitor);
            return;
        default:
            return;
    }
}
