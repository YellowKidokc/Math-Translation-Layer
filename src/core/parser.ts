import {
    DerivativeNode,
    FunctionNode,
    GroupDelimiter,
    GroupNode,
    InputFormat,
    IntegralNode,
    MathAst,
    MathNode,
    NumberNode,
    OpaqueNode,
    OperatorNode,
    ParseIssue,
    ParseOptions,
    ProductNode,
    RootNode,
    SubscriptNode,
    SumNode,
    SuperscriptNode,
    SymbolNode,
    TextNode
} from "./types";
import { nodeSource } from "./ast-utils";

type TokenType =
    | "command"
    | "identifier"
    | "number"
    | "operator"
    | "braceOpen"
    | "braceClose"
    | "parenOpen"
    | "parenClose"
    | "bracketOpen"
    | "bracketClose"
    | "superscript"
    | "subscript"
    | "comma"
    | "eof";

interface Token {
    type: TokenType;
    value: string;
}

const INTEGRAL_COMMANDS = new Set(["\\int", "\\iint", "\\iiint", "\\oint"]);
const FLATTENED_STRUCTURAL_COMMANDS = new Set([
    "\\mathrm",
    "\\mathbf",
    "\\operatorname"
]);
const PRESERVED_STRUCTURAL_COMMANDS = new Set([
    "\\mathcal",
    "\\mathbb",
    "\\vec",
    "\\dot",
    "\\ddot",
    "\\bar",
    "\\hat",
    "\\tilde"
]);
const OPERATOR_COMMANDS = new Set([
    "\\cdot",
    "\\times",
    "\\approx",
    "\\ge",
    "\\le",
    "\\gg",
    "\\ll",
    "\\equiv",
    "\\rightarrow",
    "\\Rightarrow",
    "\\Leftrightarrow",
    "\\sim",
    "\\propto",
    "\\neq",
    "\\in",
    "\\notin"
]);

interface GroupOptions {
    leftDelimiter?: string;
    rightDelimiter?: string;
    scalable?: boolean;
}

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let index = 0;

    while (index < input.length) {
        const char = input[index];

        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (char === "\\") {
            let value = "\\";
            let lookahead = index + 1;

            if (lookahead < input.length && /[A-Za-z]/.test(input[lookahead])) {
                while (lookahead < input.length && /[A-Za-z]/.test(input[lookahead])) {
                    value += input[lookahead];
                    lookahead += 1;
                }
            } else if (lookahead < input.length) {
                value += input[lookahead];
                lookahead += 1;
            }

            tokens.push({ type: "command", value });
            index = lookahead;
            continue;
        }

        if (char === "{") {
            tokens.push({ type: "braceOpen", value: char });
            index += 1;
            continue;
        }

        if (char === "}") {
            tokens.push({ type: "braceClose", value: char });
            index += 1;
            continue;
        }

        if (char === "(") {
            tokens.push({ type: "parenOpen", value: char });
            index += 1;
            continue;
        }

        if (char === ")") {
            tokens.push({ type: "parenClose", value: char });
            index += 1;
            continue;
        }

        if (char === "[") {
            tokens.push({ type: "bracketOpen", value: char });
            index += 1;
            continue;
        }

        if (char === "]") {
            tokens.push({ type: "bracketClose", value: char });
            index += 1;
            continue;
        }

        if (char === "^") {
            tokens.push({ type: "superscript", value: char });
            index += 1;
            continue;
        }

        if (char === "_") {
            tokens.push({ type: "subscript", value: char });
            index += 1;
            continue;
        }

        if (char === ",") {
            tokens.push({ type: "comma", value: char });
            index += 1;
            continue;
        }

        if (/[0-9]/.test(char)) {
            let value = char;
            let lookahead = index + 1;
            while (lookahead < input.length && /[0-9.]/.test(input[lookahead])) {
                value += input[lookahead];
                lookahead += 1;
            }
            tokens.push({ type: "number", value });
            index = lookahead;
            continue;
        }

        if (/[=+\-*/·<>|:]/.test(char)) {
            tokens.push({ type: "operator", value: char });
            index += 1;
            continue;
        }

        if (/[A-Za-z\u00C0-\u024F\u0370-\u03FF0-9']/u.test(char)) {
            let value = char;
            let lookahead = index + 1;
            while (lookahead < input.length && /[A-Za-z\u00C0-\u024F\u0370-\u03FF0-9']/u.test(input[lookahead])) {
                value += input[lookahead];
                lookahead += 1;
            }
            tokens.push({ type: "identifier", value });
            index = lookahead;
            continue;
        }

        tokens.push({ type: "operator", value: char });
        index += 1;
    }

    tokens.push({ type: "eof", value: "" });
    return tokens;
}

function createGroup(
    delimiter: GroupDelimiter,
    children: MathNode[],
    source?: string,
    options?: GroupOptions
): GroupNode {
    return {
        kind: "group",
        delimiter,
        children,
        source,
        ...options
    };
}

function canStartPrimary(token: Token): boolean {
    if (token.type === "command") {
        return !OPERATOR_COMMANDS.has(token.value) && token.value !== "\\left" && token.value !== "\\right";
    }

    return [
        "identifier",
        "number",
        "braceOpen",
        "parenOpen",
        "bracketOpen"
    ].includes(token.type);
}

function canImplicitMultiply(node: MathNode): boolean {
    return !(
        node.kind === "operator" ||
        node.kind === "integral" ||
        node.kind === "sum" ||
        node.kind === "product" ||
        node.kind === "derivative" ||
        node.kind === "group" && node.children.length === 0
    );
}

class Parser {
    private readonly tokens: Token[];
    private position = 0;
    private readonly issues: ParseIssue[] = [];

    constructor(private readonly input: string) {
        this.tokens = tokenize(input);
    }

    parse(format: InputFormat, displayMode?: boolean): MathAst {
        const children = this.parseChildren((token) => token.type === "eof");
        return {
            kind: "group",
            delimiter: "none",
            children,
            source: this.input,
            meta: {
                format,
                rawInput: this.input,
                displayMode,
                parseIssues: [...this.issues]
            }
        };
    }

    private current(): Token {
        return this.tokens[this.position];
    }

    private advance(): Token {
        const token = this.tokens[this.position];
        this.position += 1;
        return token;
    }

    private addIssue(issue: ParseIssue): void {
        this.issues.push(issue);
    }

    private parseChildren(stop: (token: Token) => boolean): MathNode[] {
        const children: MathNode[] = [];

        while (!stop(this.current())) {
            if (
                children.length > 0 &&
                canImplicitMultiply(children[children.length - 1]) &&
                canStartPrimary(this.current())
            ) {
                children.push({ kind: "operator", value: "·", implicit: true });
            }

            const node = this.parseNode();
            if (!node) {
                break;
            }

            children.push(node);
        }

        return children;
    }

    private parseNode(): MathNode | null {
        const token = this.current();

        switch (token.type) {
            case "identifier":
                return this.parsePostfix({ kind: "symbol", name: this.advance().value });
            case "number":
                return { kind: "number", value: this.advance().value } as NumberNode;
            case "operator":
                return { kind: "operator", value: this.advance().value } as OperatorNode;
            case "command":
                return this.parseCommand();
            case "braceOpen":
                return this.parseGroup("brace", "braceClose");
            case "parenOpen":
                return this.parseGroup("paren", "parenClose");
            case "bracketOpen":
                return this.parseGroup("bracket", "bracketClose");
            case "comma":
                return { kind: "operator", value: this.advance().value } as OperatorNode;
            default:
                return null;
        }
    }

    private parseCommand(): MathNode {
        const token = this.advance();

        if (token.value === "\\left") {
            return this.parseLeftRightGroup();
        }

        if (token.value === "\\right") {
            const delimiter = this.consumeDelimiterToken();
            this.addIssue({
                code: "unexpected-right",
                message: "Encountered \\right without a matching \\left.",
                source: delimiter.raw ? `\\right${delimiter.raw}` : "\\right"
            });
            return {
                kind: "opaque",
                value: delimiter.raw ? `\\right${delimiter.raw}` : "\\right"
            } as OpaqueNode;
        }

        if (token.value === "\\frac") {
            const numerator = this.consumeScriptArgument();
            const denominator = this.consumeScriptArgument();
            return this.maybeDerivative(numerator, denominator);
        }

        if (token.value === "\\sqrt") {
            return {
                kind: "root",
                radicand: this.consumeScriptArgument(),
                source: token.value
            } as RootNode;
        }

        if (token.value === "\\text") {
            const group = this.consumeScriptArgument();
            return {
                kind: "text",
                value: nodeSource(group)
            } as TextNode;
        }

        if (INTEGRAL_COMMANDS.has(token.value)) {
            return this.parseIntegral(token.value as IntegralNode["command"]);
        }

        if (token.value === "\\sum") {
            return this.parseSummation("sum");
        }

        if (token.value === "\\prod") {
            return this.parseSummation("product");
        }

        if (OPERATOR_COMMANDS.has(token.value)) {
            return { kind: "operator", value: token.value } as OperatorNode;
        }

        if (FLATTENED_STRUCTURAL_COMMANDS.has(token.value) || PRESERVED_STRUCTURAL_COMMANDS.has(token.value)) {
            const argument = this.consumeScriptArgument();
            const argumentSource = nodeSource(argument).replace(/\s+/g, "");
            const name = FLATTENED_STRUCTURAL_COMMANDS.has(token.value)
                ? argumentSource
                : `${token.value}{${argumentSource}}`;
            return this.parsePostfix({ kind: "symbol", name } as SymbolNode);
        }

        if (this.current().type === "parenOpen") {
            const call = {
                kind: "function",
                name: token.value,
                args: [this.parseGroup("paren", "parenClose")]
            } as FunctionNode;
            return this.parseScripts(call);
        }

        return this.parsePostfix({ kind: "symbol", name: token.value } as SymbolNode);
    }

    private parseIntegral(command: IntegralNode["command"]): IntegralNode {
        const node: IntegralNode = {
            kind: "integral",
            command
        };

        this.applyLimits(node);
        return node;
    }

    private parseSummation(kind: "sum" | "product"): SumNode | ProductNode {
        const node: SumNode | ProductNode = kind === "sum"
            ? { kind: "sum" }
            : { kind: "product" };

        this.applyLimits(node);
        return node;
    }

    private applyLimits(node: IntegralNode | SumNode | ProductNode): void {
        while (this.current().type === "subscript" || this.current().type === "superscript") {
            const token = this.advance();
            if (token.type === "subscript") {
                node.lower = this.consumeScriptArgument();
            } else {
                node.upper = this.consumeScriptArgument();
            }
        }
    }

    private parseGroup(delimiter: GroupDelimiter, closingToken: TokenType): GroupNode {
        this.advance();
        const children = this.parseChildren((token) => token.type === closingToken || token.type === "eof");
        if (this.current().type === closingToken) {
            this.advance();
        } else {
            this.addIssue({
                code: "missing-group-close",
                message: `Missing closing token for ${delimiter} group.`,
                source: this.input
            });
        }
        return this.parsePostfix(createGroup(delimiter, children));
    }

    private parsePostfix<T extends MathNode>(node: T): T {
        const withScripts = this.parseScripts(node);
        if (
            (withScripts.kind === "symbol" || withScripts.kind === "text") &&
            this.current().type === "parenOpen"
        ) {
            return {
                kind: "function",
                name: withScripts.kind === "symbol" ? withScripts.name : withScripts.value,
                args: [this.parseGroup("paren", "parenClose")]
            } as T;
        }
        return withScripts as T;
    }

    private parseScripts<T extends MathNode>(node: T): T {
        let currentNode: MathNode = node;

        while (this.current().type === "subscript" || this.current().type === "superscript") {
            const token = this.advance();
            if (token.type === "subscript") {
                currentNode = {
                    kind: "subscript",
                    base: currentNode,
                    subscript: this.consumeScriptArgument()
                } as SubscriptNode;
            } else {
                currentNode = {
                    kind: "superscript",
                    base: currentNode,
                    exponent: this.consumeScriptArgument()
                } as SuperscriptNode;
            }
        }

        return currentNode as T;
    }

    private consumeScriptArgument(): GroupNode {
        const token = this.current();
        if (token.type === "braceOpen") {
            return this.parseGroup("brace", "braceClose");
        }
        if (token.type === "parenOpen") {
            return this.parseGroup("paren", "parenClose");
        }
        if (token.type === "bracketOpen") {
            return this.parseGroup("bracket", "bracketClose");
        }

        if (token.type === "eof") {
            this.addIssue({
                code: "missing-argument",
                message: "Expected an argument but reached the end of input.",
                source: this.input
            });
            return createGroup("none", []);
        }

        const node = this.parseNode();
        return createGroup("none", node ? [node] : []);
    }

    private parseLeftRightGroup(): GroupNode {
        const left = this.consumeDelimiterToken();
        const children = this.parseChildren(
            (token) => token.type === "eof" || token.type === "command" && token.value === "\\right"
        );

        let right = { raw: left.raw, delimiter: left.delimiter };
        if (this.current().type === "command" && this.current().value === "\\right") {
            this.advance();
            right = this.consumeDelimiterToken();
        } else {
            this.addIssue({
                code: "unmatched-left-right",
                message: "Encountered \\left without a matching \\right.",
                source: `\\left${left.raw}`
            });
        }

        return this.parsePostfix(createGroup(
            left.delimiter === "none" ? right.delimiter : left.delimiter,
            children,
            undefined,
            {
                leftDelimiter: left.raw,
                rightDelimiter: right.raw,
                scalable: true
            }
        ));
    }

    private consumeDelimiterToken(): { raw: string; delimiter: GroupDelimiter } {
        const token = this.current();
        if (token.type === "parenOpen" || token.type === "parenClose") {
            this.advance();
            return { raw: token.value, delimiter: "paren" };
        }
        if (token.type === "bracketOpen" || token.type === "bracketClose") {
            this.advance();
            return { raw: token.value, delimiter: "bracket" };
        }
        if (token.type === "braceOpen" || token.type === "braceClose") {
            this.advance();
            return { raw: token.value, delimiter: "brace" };
        }
        if (token.type === "operator" || token.type === "command") {
            this.advance();
            return {
                raw: token.value,
                delimiter: token.value === "(" || token.value === ")" ? "paren"
                    : token.value === "[" || token.value === "]" ? "bracket"
                        : token.value === "{" || token.value === "}" || token.value === "\\{" || token.value === "\\}" ? "brace"
                            : "none"
            };
        }

        this.addIssue({
            code: "missing-argument",
            message: "Expected a delimiter after \\left or \\right.",
            source: this.input
        });
        return { raw: ".", delimiter: "none" };
    }

    private maybeDerivative(numerator: GroupNode, denominator: GroupNode): MathNode {
        const numeratorSource = nodeSource(numerator).replace(/\s+/g, "");
        const denominatorSource = nodeSource(denominator).replace(/\s+/g, "");

        const totalPattern = numeratorSource.startsWith("\\partial") && denominatorSource.startsWith("\\partial");
        const plainPattern = numeratorSource.startsWith("d") && denominatorSource.startsWith("d");

        if (!totalPattern && !plainPattern) {
            return {
                kind: "fraction",
                numerator,
                denominator
            };
        }

        const operator = totalPattern ? "partial" : "d";
        const subjectSource = totalPattern
            ? numeratorSource.replace(/^\\partial/, "")
            : numeratorSource.slice(1);
        const variableSource = totalPattern
            ? denominatorSource.replace(/^\\partial/, "")
            : denominatorSource.slice(1);

        return {
            kind: "derivative",
            operator,
            subject: this.parseSubExpression(subjectSource),
            variable: this.parseSubExpression(variableSource)
        } as DerivativeNode;
    }

    private parseSubExpression(source: string): GroupNode {
        const nested = new Parser(source);
        return createGroup("none", nested.parseChildren((token) => token.type === "eof"), source);
    }
}

export function parseMath(input: string, options: ParseOptions): MathAst {
    if (options.format !== "tex" && options.format !== "unicode" && options.format !== "mathml") {
        return {
            kind: "group",
            delimiter: "none",
            children: [{ kind: "opaque", value: input } as OpaqueNode],
            source: input,
            meta: {
                format: options.format,
                rawInput: input,
                displayMode: options.displayMode,
                parseIssues: []
            }
        };
    }

    const parser = new Parser(input);
    return parser.parse(options.format, options.displayMode);
}
