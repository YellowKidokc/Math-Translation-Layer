import { nodeSource, walkMath } from "./ast-utils";
import { MathAst, MathNode } from "./types";

function segmentByOperators(children: MathNode[], operators: string[]): MathNode[][] {
    const segments: MathNode[][] = [];
    let current: MathNode[] = [];

    for (const child of children) {
        if (child.kind === "operator" && operators.includes(child.value)) {
            if (current.length > 0) {
                segments.push(current);
                current = [];
            }
            continue;
        }
        current.push(child);
    }

    if (current.length > 0) {
        segments.push(current);
    }

    return segments;
}

function multiplicationSegments(children: MathNode[]): MathNode[][] {
    return segmentByOperators(children, ["·", "\\cdot", "\\times"]);
}

function readableNode(node: MathNode): string {
    if (node.translatedText && node.translationStrategy !== "replace-head") {
        return node.translatedText;
    }

    if (node.kind === "function" && node.translationStrategy === "replace-head" && node.translatedText) {
        return node.translatedText;
    }

    if (node.kind === "group") {
        return node.children.map(readableNode).join(" ").replace(/\s+/g, " ").trim();
    }

    if (node.kind === "subscript") {
        return `${readableNode(node.base)} ${readableNode(node.subscript)}`.trim();
    }

    if (node.kind === "superscript") {
        const base = readableNode(node.base);
        const exponent = readableNode(node.exponent);
        return exponent === "2" ? `${base} squared` : `${base} to the power of ${exponent}`;
    }

    if (node.kind === "function") {
        return `${node.translatedText ?? node.name}`;
    }

    if (node.kind === "fraction") {
        return `${readableNode(node.numerator)} over ${readableNode(node.denominator)}`;
    }

    if (node.kind === "derivative") {
        return "the rate of change";
    }

    if (node.kind === "integral") {
        return "the accumulated quantity";
    }

    if (node.kind === "sum") {
        return "the sum";
    }

    if (node.kind === "product") {
        return "the product";
    }

    if (node.kind === "text") {
        return node.value;
    }

    return nodeSource(node).replace(/\\/g, "");
}

function joinLabels(labels: string[]): string {
    if (labels.length === 0) {
        return "";
    }
    if (labels.length === 1) {
        return labels[0];
    }
    if (labels.length === 2) {
        return `${labels[0]} and ${labels[1]}`;
    }
    return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function containsKind(nodes: MathNode[], kind: MathNode["kind"]): boolean {
    return nodes.some((node) => {
        let found = false;
        walkMath(node, (current) => {
            if (current.kind === kind) {
                found = true;
            }
        });
        return found;
    });
}

function findFirst(nodes: MathNode[], predicate: (node: MathNode) => boolean): MathNode | undefined {
    for (const node of nodes) {
        let match: MathNode | undefined;
        walkMath(node, (current) => {
            if (!match && predicate(current)) {
                match = current;
            }
        });
        if (match) {
            return match;
        }
    }

    return undefined;
}

export function generateInsight(ast: MathAst): string {
    const equalsIndex = ast.children.findIndex((child) => child.kind === "operator" && child.value === "=");
    const lhs = equalsIndex >= 0 ? ast.children.slice(0, equalsIndex) : [];
    const rhs = equalsIndex >= 0 ? ast.children.slice(equalsIndex + 1) : ast.children;
    const fullExpression = ast.children;
    const subtractionSegments = segmentByOperators(rhs, ["-"]);
    const productSegments = multiplicationSegments(rhs);
    const sentences: string[] = [];

    if (productSegments.length >= 3) {
        const labels = productSegments.map((segment) => readableNode(segment[0]));
        sentences.push(
            `This equation is a chain where every link must hold. ${joinLabels(labels)} all multiply together, which means if any one factor drops to zero, the entire output collapses with it.`
        );
        sentences.push("Each factor is necessary, but none is sufficient on its own.");
    }

    if (subtractionSegments.length === 2) {
        const leftTerm = subtractionSegments[0];
        const rightTerm = subtractionSegments[1];
        const derivativeSquare = findFirst(leftTerm, (node) =>
            node.kind === "superscript" &&
            readableNode(node.exponent) === "2" &&
            findFirst([node.base], (inner) => inner.kind === "derivative") !== undefined
        );

        if (lhs.some((node) => readableNode(node).includes("Lagrangian")) || derivativeSquare) {
            sentences.push("This equation has two competing terms.");
            sentences.push("The first term couples coherence to the squared rate of change of the system state, so faster motion is amplified rather than merely recorded.");
            sentences.push(`The second term subtracts ${readableNode(rightTerm[0])}, which means that term works against the first and pulls the overall output downward.`);
        } else {
            sentences.push(`The second term opposes the first, so ${readableNode(rightTerm[0])} works against ${readableNode(leftTerm[0])} and pulls the output down.`);
        }
    }

    if (containsKind(fullExpression, "sum") && !sentences.some((sentence) => sentence.includes("add together"))) {
        sentences.push("Where terms add together, each one contributes to the total, so a weakness in one area can be offset by strength in another.");
    }

    const fraction = findFirst(fullExpression, (node) => node.kind === "fraction");
    if (fraction && fraction.kind === "fraction") {
        sentences.push(`The numerator increases the output while the denominator constrains it, so as ${readableNode(fraction.denominator)} grows, the overall value shrinks.`);
    }

    if (containsKind(fullExpression, "integral")) {
        sentences.push("This integral accumulates the quantity over time, which means history matters because the present output depends on everything that came before.");
    }

    if (containsKind(fullExpression, "derivative") && !sentences.some((sentence) => sentence.includes("rate of change"))) {
        sentences.push("This derivative captures the rate of change, not the value by itself, so the equation is tracking motion instead of a static position.");
    }

    const squaredTerm = findFirst(fullExpression, (node) => node.kind === "superscript" && readableNode(node.exponent) === "2");
    if (squaredTerm && !sentences.some((sentence) => sentence.includes("squared"))) {
        sentences.push("The squared term amplifies differences, because small values shrink toward zero while larger values accelerate upward.");
    }

    if (sentences.length === 0) {
        const subject = lhs.length > 0 ? joinLabels(lhs.map(readableNode)) : "This expression";
        sentences.push(`${subject} is being translated structurally, so the main point is how the terms interact rather than any one label in isolation.`);
    }

    return sentences.join(" ");
}
