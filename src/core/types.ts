export type InputFormat = "tex" | "unicode" | "mathml";
export type TranslationMode = "structural" | "narrative";
export type RendererId =
    | "latex-structural"
    | "plaintext"
    | "markdown"
    | "tts"
    | "json"
    | "html-mathjax"
    | "word-equation";

export type GroupDelimiter = "none" | "brace" | "paren" | "bracket";
export type DifferentialOperator = "d" | "partial";
export type TranslationStrategy = "replace-node" | "replace-head";

export interface ParseIssue {
    code:
        | "missing-argument"
        | "missing-group-close"
        | "unmatched-left-right"
        | "unexpected-right";
    message: string;
    source?: string;
}

export interface NodeBase {
    kind:
        | "group"
        | "symbol"
        | "number"
        | "operator"
        | "fraction"
        | "root"
        | "superscript"
        | "subscript"
        | "function"
        | "sum"
        | "product"
        | "integral"
        | "derivative"
        | "text"
        | "opaque";
    source?: string;
    translatedText?: string;
    spokenText?: string;
    translationStrategy?: TranslationStrategy;
}

export interface GroupNode extends NodeBase {
    kind: "group";
    delimiter: GroupDelimiter;
    children: MathNode[];
    leftDelimiter?: string;
    rightDelimiter?: string;
    scalable?: boolean;
}

export interface SymbolNode extends NodeBase {
    kind: "symbol";
    name: string;
}

export interface NumberNode extends NodeBase {
    kind: "number";
    value: string;
}

export interface OperatorNode extends NodeBase {
    kind: "operator";
    value: string;
    implicit?: boolean;
}

export interface FractionNode extends NodeBase {
    kind: "fraction";
    numerator: GroupNode;
    denominator: GroupNode;
}

export interface RootNode extends NodeBase {
    kind: "root";
    radicand: GroupNode;
}

export interface SuperscriptNode extends NodeBase {
    kind: "superscript";
    base: MathNode;
    exponent: GroupNode;
}

export interface SubscriptNode extends NodeBase {
    kind: "subscript";
    base: MathNode;
    subscript: GroupNode;
}

export interface FunctionNode extends NodeBase {
    kind: "function";
    name: string;
    args: GroupNode[];
}

export interface IntegralNode extends NodeBase {
    kind: "integral";
    command: "\\int" | "\\iint" | "\\iiint" | "\\oint";
    lower?: GroupNode;
    upper?: GroupNode;
}

export interface SumNode extends NodeBase {
    kind: "sum";
    lower?: GroupNode;
    upper?: GroupNode;
}

export interface ProductNode extends NodeBase {
    kind: "product";
    lower?: GroupNode;
    upper?: GroupNode;
}

export interface DerivativeNode extends NodeBase {
    kind: "derivative";
    operator: DifferentialOperator;
    subject: GroupNode;
    variable: GroupNode;
}

export interface TextNode extends NodeBase {
    kind: "text";
    value: string;
}

export interface OpaqueNode extends NodeBase {
    kind: "opaque";
    value: string;
}

export type MathNode =
    | GroupNode
    | SymbolNode
    | NumberNode
    | OperatorNode
    | FractionNode
    | RootNode
    | SuperscriptNode
    | SubscriptNode
    | FunctionNode
    | SumNode
    | ProductNode
    | IntegralNode
    | DerivativeNode
    | TextNode
    | OpaqueNode;

export interface MathAst extends GroupNode {
    delimiter: "none";
    kind: "group";
    meta: {
        format: InputFormat;
        rawInput: string;
        displayMode?: boolean;
        parseIssues: ParseIssue[];
    };
}

export interface ParseOptions {
    format: InputFormat;
    displayMode?: boolean;
}

export interface TranslationOptions {
    dictionary: string;
    mode: TranslationMode;
}

export interface RenderOptions {
    renderer: RendererId;
}

export interface TranslationDiagnostic {
    type: "unsupported" | "unmapped";
    message: string;
    source: string;
}

export interface TranslatedMath {
    dictionaryId: string;
    mode: TranslationMode;
    ast: MathAst;
    equationId?: string;
    summary?: string;
    narrative?: string;
    matchedPattern?: string;
    diagnostics: TranslationDiagnostic[];
    resolvedSymbolCount: number;
}

export interface TranslationOutput extends TranslatedMath {
    output: string;
}

export interface TranslationQuality {
    confidence: number;
    unmappedSymbols: string[];
    opaqueNodes: number;
    structuralIssues: string[];
    useFallback: boolean;
}

export interface TranslationResult {
    original: string;
    wordEquation: string;
    spokenExplanation: string;
    summary?: string;
    equationId?: string;
    confidence: number;
    usedFallback: boolean;
    diagnostics: string[];
}
