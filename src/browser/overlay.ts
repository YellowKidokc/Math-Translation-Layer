import { translate } from "../core";

interface OverlayState {
    root: HTMLElement;
    card: HTMLElement;
    source: string;
    spokenStructure: string;
    visualEquation: string;
    everydayMeaning: string;
    summary?: string;
    mode: "translation" | "hidden";
}

interface ReviewedTranslation {
    key: string;
    equation: string;
    visual: string;
    meaning: string;
}

const STYLE_ID = "mtl-overlay-style";
const STATE = new WeakMap<HTMLElement, OverlayState>();

function ensureStyles(document: Document): void {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .mtl-shell {
            margin: 0.75rem auto 2rem;
            max-width: min(50rem, calc(100vw - 2rem));
        }
        .mtl-original-equation {
            display: block !important;
            margin: 1.5rem auto !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            text-align: center !important;
            font-size: clamp(1.1rem, 2.4vw, 1.75rem) !important;
            line-height: 1.35 !important;
        }
        .mtl-card {
            display: grid;
            gap: 0.75rem;
            margin-top: 0;
            color: var(--text, #e0e0e0);
            line-height: 1.55;
        }
        .mtl-card[hidden] {
            display: none;
        }

        .mtl-equation-callout {
            border: 1px solid rgba(212, 175, 55, 0.25);
            background: linear-gradient(180deg, rgba(212, 175, 55, 0.06), rgba(0, 0, 0, 0));
            border-radius: 0.7rem;
            padding: 0.8rem 1rem;
            margin-bottom: 0.75rem;
            text-align: center;
        }
        .mtl-structure-label {
            color: var(--text-secondary, #a0a0a0);
            font-size: 0.68rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 0.25rem;
        }
        .mtl-layer {
            border-radius: 0 0.5rem 0.5rem 0;
            padding: 1rem 1.5rem;
            text-align: left;
        }
        .mtl-word-card {
            background: var(--gold-glow, rgba(212, 175, 55, 0.06));
            border: 1px solid var(--gold-dim, rgba(212, 175, 55, 0.15));
            border-left: 3px solid var(--gold, #d4af37);
        }
        .mtl-explanation-card {
            background: var(--green-dim, rgba(34, 197, 94, 0.1));
            border: 1px solid rgba(34, 197, 94, 0.15);
            border-left: 3px solid var(--green, #22c55e);
            margin-bottom: 1.25rem;
        }
        .mtl-label {
            color: var(--gold, #d4af37);
            font-family: var(--mono-font, "JetBrains Mono", monospace);
            font-size: 0.55rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-bottom: 0.4rem;
        }
        .mtl-explanation-card .mtl-label {
            color: var(--green, #22c55e);
        }
        .mtl-spoken,
        .mtl-meaning {
            margin: 0.45rem 0 0;
        }
        .mtl-word-equation {
            color: var(--text, #e0e0e0);
            font-family: var(--serif-font, "Crimson Text", Georgia, serif);
            font-size: clamp(1rem, 1.8vw, 1.15rem);
            font-style: italic;
            line-height: 1.6;
            margin: 0;
            overflow-x: auto;
            white-space: normal;
            overflow-wrap: anywhere;
        }
        .mtl-word-equation .mtl-operator {
            color: var(--gold, #d4af37);
            font-weight: 800;
            padding: 0 0.12rem;
        }
        .mtl-word-equation .mtl-grouping {
            color: var(--gold, #d4af37);
        }
        .mtl-word-equation .mtl-number {
            color: var(--blue, #4a9eff);
        }
        .mtl-structure-map {
            display: grid;
            gap: 0.25rem;
            margin: 0.15rem 0 0.8rem;
            overflow-x: auto;
            padding-bottom: 0.2rem;
        }
        .mtl-structure-row {
            display: inline-grid;
            grid-auto-flow: column;
            grid-auto-columns: minmax(3.25rem, max-content);
            align-items: stretch;
            gap: 0.25rem;
            min-width: max-content;
        }
        .mtl-structure-token {
            border: 1px solid rgba(212, 175, 55, 0.16);
            border-radius: 0.35rem;
            padding: 0.32rem 0.45rem;
            text-align: center;
        }
        .mtl-structure-word .mtl-structure-token {
            background: rgba(212, 175, 55, 0.08);
            color: var(--text, #e0e0e0);
            font-family: var(--sans-font, "Inter", sans-serif);
            font-size: 0.72rem;
            line-height: 1.25;
        }
        .mtl-structure-math .mtl-structure-token {
            background: rgba(0, 0, 0, 0.18);
            color: var(--gold, #d4af37);
            font-family: var(--mono-font, "JetBrains Mono", monospace);
            font-size: 0.86rem;
            line-height: 1.35;
            white-space: nowrap;
        }
        .mtl-meaning {
            color: var(--text-dim, #a0a0a0);
            font-family: var(--sans-font, "Inter", sans-serif);
            font-size: 0.9rem;
            line-height: 1.7;
            margin: 0;
            max-width: 100%;
            text-align: left;
        }
        .mtl-key {
            display: grid;
            gap: 0.28rem;
            margin-top: 0.6rem;
        }
        .mtl-key div {
            font-size: 0.92rem;
        }
        .mtl-symbol {
            color: var(--gold, #d4af37);
            font-weight: 700;
        }
        .mtl-summary {
            color: var(--text-secondary, #a0a0a0);
            font-size: 0.92rem;
            font-style: italic;
            margin-top: 0.65rem;
        }
        .mtl-toggle,
        .mtl-master-toggle {
            background: none;
            border: none;
            color: var(--gold, #d4af37);
            cursor: pointer;
            font-family: var(--mono-font, "JetBrains Mono", monospace);
            font-size: 0.76rem;
            padding: 0;
            margin-top: 0.5rem;
            text-decoration: underline;
            text-underline-offset: 0.18rem;
        }
        .mtl-master-toggle {
            position: fixed;
            right: 1rem;
            top: 1rem;
            z-index: 9999;
        }
        .mtl-tts-cue {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
    `;
    document.head.appendChild(style);
}

function stripDelimiters(source: string): string {
    return source
        .replace(/^\$\$/, "")
        .replace(/\$\$$/, "")
        .replace(/^\$/, "")
        .replace(/\$$/, "")
        .replace(/^\\\[/, "")
        .replace(/\\\]$/, "")
        .replace(/^\\\(/, "")
        .replace(/\\\)$/, "")
        .trim();
}

function normalizeForLookup(source: string): string {
    const replacements: Array<[RegExp, string]> = [
        [/\\chi|\u03c7|𝜒/g, "chi"],
        [/\\iiint|\u222d|\\iint|\u222b|\\int/g, "int"],
        [/\\cdot|⋅|·|\*/g, ""],
        [/\\,|\\left|\\right|\\text|\\mathrm/g, ""],
        [/\\geq|≥/g, "ge"],
        [/\\leq|≤/g, "le"],
        [/\\neq|≠/g, "ne"],
        [/\\propto|∝/g, "propto"],
        [/\\to|→/g, "to"],
        [/\\Delta|Δ/g, "delta"],
        [/\\Phi|Φ/g, "phi"],
        [/\\Psi|Ψ/g, "psi"],
        [/\\sigma|σ/g, "sigma"],
        [/\\gamma|γ/g, "gamma"],
        [/\\mu|μ/g, "mu"],
        [/\\nu|ν/g, "nu"],
        [/\\rho|ρ/g, "rho"],
        [/\\Lambda|Λ/g, "lambda"],
        [/\\Theta|Θ/g, "theta"],
        [/\\hbar|ℏ/g, "hbar"],
        [/\\pi|π/g, "pi"]
    ];
    let normalized = source;
    for (const [pattern, replacement] of replacements) {
        normalized = normalized.replace(pattern, replacement);
    }
    return normalized
        .replace(/\\[A-Za-z]+/g, "")
        .replace(/[^A-Za-z0-9]+/g, "")
        .toLowerCase();
}

function findReviewedTranslation(source: string, document: Document): ReviewedTranslation | undefined {
    const win = document.defaultView as typeof window & {
        MATH_TRANSLATION_TABLE_V2?: ReviewedTranslation[];
    } | null;
    if (!win) {
        return undefined;
    }
    const table = win.MATH_TRANSLATION_TABLE_V2;
    if (!table?.length) {
        return undefined;
    }

    const key = normalizeForLookup(source);
    return table.find((entry) => entry.key === key);
}

function reviewedVisualIsReadable(visual: string | undefined): visual is string {
    return Boolean(visual && !/[\\{}_^]/.test(visual));
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderWordEquationMarkup(value: string): string {
    return escapeHtml(value).replace(/(\d+(?:\.\d+)?|[=+*/-]|[()])/g, (match) => {
        if (/^\d/.test(match)) {
            return `<span class="mtl-number">${match}</span>`;
        }
        if (/[()]/.test(match)) {
            return `<span class="mtl-grouping">${match}</span>`;
        }
        return `<span class="mtl-operator">${match}</span>`;
    });
}

function isLikelyMath(source: string): boolean {
    return /\\[A-Za-z]+|=|·|\^|_|\$/.test(source);
}

function extractSource(element: HTMLElement): string | undefined {
    const dataSource = element.dataset.mtlSource ?? element.dataset.tex;
    if (dataSource) {
        return dataSource;
    }

    const clone = element.cloneNode(true) as HTMLElement;
    clone
        .querySelectorAll(".eq-label, .elbl, .lbl, .mlabel, .mnote, .mtl-shell, .mtl-card")
        .forEach((node) => node.remove());
    const text = clone.textContent?.replace(/\s+/g, " ").trim();
    if (text && isLikelyMath(text)) {
        return text;
    }

    return undefined;
}

function renderMathJax(element: HTMLElement, markup: string): void {
    element.textContent = markup;
    const win = element.ownerDocument.defaultView as typeof window & {
        MathJax?: {
            typesetPromise?: (nodes: HTMLElement[]) => Promise<unknown>;
        };
    };

    if (win.MathJax?.typesetPromise) {
        void win.MathJax.typesetPromise([element]);
    }
}

function setMode(state: OverlayState, mode: "translation" | "hidden"): void {
    state.mode = mode;
    state.card.hidden = mode === "hidden";
}

function attachToggle(state: OverlayState, shell: HTMLElement): void {
    const button = shell.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "mtl-toggle";
    button.textContent = "Hide translation";
    button.addEventListener("click", () => {
        const nextMode = state.mode === "translation" ? "hidden" : "translation";
        setMode(state, nextMode);
        button.textContent = nextMode === "translation" ? "Hide translation" : "Show translation";
    });
    shell.appendChild(button);
}

const TERMS: Record<string, string> = {
    "\\chi": "coherence output",
    "\u03c7": "coherence output",
    G: "outside-in restoration force",
    M: "moral alignment",
    E: "truth transmission",
    S: "breakdown pressure",
    S_eff: "effective entropy factor",
    T: "time",
    K: "Logos",
    R: "phase lock",
    Q: "faith potential",
    F: "faith bond",
    C: "inner wholeness",
    O_eff: "effective observer or ordering strength"
};

function termLabel(source: string, symbol: string): string | undefined {
    if (symbol === "C" && !/\\frac\{dC\}\{dt\}|dC\/dt|C\^\*/.test(source)) {
        return "Christ factor";
    }

    if (symbol === "G" && /G_\{\\mu\\nu\}/.test(source)) {
        return undefined;
    }

    return TERMS[symbol];
}

function sourceHas(source: string, symbol: string): boolean {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`).test(source);
}

interface StructureToken {
    math: string;
    word: string;
}

function stableHash(value: string): string {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

function browserEventId(source: string, tokens: StructureToken[]): string {
    const tokenText = tokens.map((token) => `${token.math}:${token.word}`).join("|");
    return `mtl-struct-${stableHash(`${source}\u001f${tokenText}`)}`;
}

function structureLabel(source: string, math: string): string {
    const clean = math.replace(/\s+/g, "");
    if (/^\\frac\{dC\}\{dt\}$|^dC\/dt$|^dCdt$/i.test(clean)) {
        return "change in coherence";
    }
    if (/^\(1-C\)$/.test(clean)) {
        return "remaining gap";
    }
    if (clean === "=") {
        return "equals";
    }
    if (clean === "+" || clean === "\\+") {
        return "plus";
    }
    if (clean === "-") {
        return "minus";
    }
    if (clean === "\\cdot" || clean === "Â·" || clean === "*" || clean === "\\times") {
        return "times";
    }
    if (clean === "(" || clean === ")") {
        return clean;
    }
    if (/^\d/.test(clean)) {
        return clean;
    }

    const label = termLabel(source, clean);
    if (label) {
        return label;
    }

    if (clean === "\\chi" || clean === "\u03c7") {
        return "coherence output";
    }

    return clean.replace(/^\\/, "");
}

function structuralTokens(source: string): StructureToken[] {
    const normalized = source
        .replace(/\$\$?/g, "")
        .replace(/\\left|\\right/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const derivativeMatch = normalized.match(/\\frac\{dC\}\{dt\}\s*=\s*O\s*(?:\\cdot|Â·|\*)?\s*G\s*\(1-C\)\s*-\s*S\s*(?:\\cdot|Â·|\*)?\s*C/);
    if (derivativeMatch) {
        return [
            { math: "dC/dt", word: "change in coherence" },
            { math: "=", word: "equals" },
            { math: "O", word: "openness" },
            { math: "·", word: "times" },
            { math: "G", word: "outside-in restoration" },
            { math: "(1-C)", word: "remaining gap" },
            { math: "−", word: "minus" },
            { math: "S", word: "breakdown pressure" },
            { math: "·", word: "times" },
            { math: "C", word: "inner wholeness" }
        ];
    }

    const tokenPattern = /\\frac\{dC\}\{dt\}|\\chi|[A-Za-z](?:_\{[^{}]+\}|\^\*|\([^)]+\))?|\(1-C\)|\\cdot|\\times|Â·|[=+\-*/()]|\d+(?:\.\d+)?/g;
    const tokens = normalized.match(tokenPattern) ?? [];
    return tokens
        .slice(0, 28)
        .map((math) => ({ math: math === "\\cdot" || math === "\\times" ? "·" : math, word: structureLabel(source, math) }))
        .filter((token) => token.math && token.word);
}

function renderStructureMapMarkup(source: string): string {
    const tokens = structuralTokens(source);
    if (tokens.length < 3) {
        return "";
    }

    const wordRow = tokens
        .map((token) => `<span class="mtl-structure-token">${escapeHtml(token.word)}</span>`)
        .join("");
    const mathRow = tokens
        .map((token) => `<span class="mtl-structure-token">${escapeHtml(token.math)}</span>`)
        .join("");

    const eventId = browserEventId(source, tokens);
    const payload = {
        eventId,
        event: "structural-equation-map",
        source,
        tokens,
        reviewPriority: "high",
        reviewInstruction: "Check whether the common-language row preserves the same logical structure as the math row."
    };

    return [
        `<div class="mtl-structure-map" aria-label="Equation structure translated symbol by symbol" data-mtl-event-id="${eventId}" data-mtl-event="structural-equation-map" data-mtl-review-priority="high" data-mtl-review='${escapeHtml(JSON.stringify(payload))}'>`,
        `<div class="mtl-structure-label">Word structure</div><div class="mtl-structure-row mtl-structure-word">${wordRow}</div>`,
        `<div class="mtl-structure-label">Symbol structure</div><div class="mtl-structure-row mtl-structure-math">${mathRow}</div>`,
        "</div>"
    ].join("");
}

function orderedTerms(source: string): Array<[string, string]> {
    const order = ["\\chi", "\u03c7", "G", "M", "E", "S_eff", "S", "T", "K", "R", "Q", "F", "C", "O_eff"];
    const seen = new Set<string>();
    const terms: Array<[string, string]> = [];
    for (const symbol of order) {
        if (seen.has(symbol)) {
            continue;
        }
        if (source.includes(symbol) || sourceHas(source, symbol)) {
            const label = termLabel(source, symbol);
            if (label) {
                terms.push([symbol === "\\chi" || symbol === "\u03c7" ? "chi" : symbol, label]);
                seen.add(symbol);
            }
        }
    }
    return terms;
}

function buildSpokenStructure(source: string): string {
    const terms = orderedTerms(source);
    const hasIntegral = /\\i{0,3}int|\u222b|\u222d/.test(source);
    const hasDerivative = /\\frac\{d|dCdt|dC\/dt/.test(source);
    const prefix = hasDerivative
        ? "d C over d t equals the change in coherence over time."
        : hasIntegral
            ? "chi equals the total integrated result over the tested domain."
            : "Read the expression as this structured claim.";
    const key = terms.length > 0
        ? `${terms.map(([symbol, label]) => `${symbol} equals ${label}`).join("; ")}.`
        : "";
    const suffix = hasIntegral ? "Integrated over x, y, and t." : "";
    return [prefix, key, suffix].filter(Boolean).join(" ");
}

function buildVisualEquation(source: string): string {
    const hasIntegral = /\\i{0,3}int|\u222b|\u222d/.test(source);
    const hasDerivative = /\\frac\{d|dCdt|dC\/dt/.test(source);
    const terms = orderedTerms(source);

    if (/\\psi\\rangle/.test(source) && /\\alpha/.test(source) && /\\beta/.test(source)) {
        return "quantum state = alpha-weighted state zero + beta-weighted state one; squared amplitudes add to one";
    }

    if (/\\Psi_\{\\text\{Eden\}\}/.test(source) && /Obedience/.test(source) && /Transgression/.test(source)) {
        return "Eden state = obedience-weighted moral state + transgression-weighted moral state before measurement";
    }

    if (/V\(\\phi\)/.test(source) && /\\mu\^2/.test(source) && /\\lambda/.test(source)) {
        return "potential energy = negative mass term times the order parameter squared + self-interaction term times the order parameter to the fourth";
    }

    if (/\\hat\{L\}/.test(source) && /\\hat\{K\}/.test(source)) {
        return "Tree of Life operator sustains coherence; Tree of Knowledge operator collapses superposition into a measured state";
    }

    if (/\\sigma\s*=\s*6\.35/.test(source) && /10\^\{-4\}/.test(source)) {
        return "PEAR-LAB signal = 6.35 sigma statistical significance with an effect size around one part in ten thousand";
    }

    if (/\\chi\s*=\s*\\iiint\s*\(G\s*\\cdot\s*M\s*\\cdot\s*E\s*\\cdot\s*S\s*\\cdot\s*T\s*\\cdot\s*K\s*\\cdot\s*R\s*\\cdot\s*Q\s*\\cdot\s*F\s*\\cdot\s*C\)/.test(source)) {
        return "coherence output = triple integral of (outside-in restoration force * moral alignment * truth transmission * breakdown pressure * time * Logos * phase lock * faith potential * faith bond * Christ factor) over space and time";
    }

    if (/C\(t\)\s*=\s*337\s*\\cdot\s*e\^\{-t\/214\}\s*\+\s*93/.test(source)) {
        return "lifespan coherence over time = 337 * exponential decay over 214 years + 93-year floor";
    }

    if (/C_\{eq\}\s*=\s*\\frac\{O\s*\\cdot\s*G\}\{O\s*\\cdot\s*G\s*\+\s*S\}/.test(source)) {
        return "equilibrium wholeness = (willingness to receive * outside-in restoration force) / (willingness to receive * outside-in restoration force + breakdown pressure)";
    }

    if (/C_1\(t\)\s*=\s*\\bar\{L\}\s*=\s*912\s*\\text\{\s*years\s*\}/.test(source)) {
        return "pre-Flood lifespan pattern = average lifespan = 912 years";
    }

    if (/C_2\(t\)\s*=\s*A\s*\\cdot\s*e\^\{-t\/\\tau_d\}\s*\+\s*L_\{\\text\{floor\}\}/.test(source)) {
        return "post-Flood lifespan pattern = decay amplitude * exponential decay over the decoherence time constant + lifespan floor";
    }

    if (/\\frac\{dC\}\{dt\}\s*=\s*O\s*\\cdot\s*G\(1-C\)\s*-\s*S\s*\\cdot\s*C/.test(source)) {
        return "d(inner wholeness)/dt = willingness to receive * outside-in restoration force * (1 - inner wholeness) - breakdown pressure * inner wholeness";
    }

    if (/C\^\*\s*=\s*\\frac\{O\s*\\cdot\s*G\}\{O\s*\\cdot\s*G\s*\+\s*S\}/.test(source)) {
        return "settled wholeness = (willingness to receive * outside-in restoration force) / (willingness to receive * outside-in restoration force + breakdown pressure)";
    }

    if (/\\frac\{dC\}\{dt\}\s*=\s*\\frac\{\(1\+s\)\}\{2\}\s*\\cdot\s*G\(1-C\)\s*-\s*S\s*\\cdot\s*C/.test(source)) {
        return "d(inner wholeness)/dt = ((1 + direction of the will) / 2) * outside-in restoration force * (1 - inner wholeness) - breakdown pressure * inner wholeness";
    }

    if (/\\frac\{dC\}\{dt\}\s*=\s*0\s*\\cdot\s*G\(1-C\)\s*-\s*S\s*\\cdot\s*C\s*=\s*-S\s*\\cdot\s*C/.test(source)) {
        return "d(inner wholeness)/dt = 0 * outside-in restoration force * (1 - inner wholeness) - breakdown pressure * inner wholeness = -breakdown pressure * inner wholeness";
    }

    if (/\\frac\{dC\}\{dt\}\s*\\approx\s*\\frac\{1\}\{2\}\s*G\(1-C\)\s*-\s*S\s*\\cdot\s*C/.test(source)) {
        return "d(inner wholeness)/dt ~= (1/2) * outside-in restoration force * (1 - inner wholeness) - breakdown pressure * inner wholeness";
    }

    if (/C\^\*_\{perf\}\s*=\s*\\frac\{\\frac\{G\}\{2\}\}\{\\frac\{G\}\{2\}\s*\+\s*S\}\s*=\s*\\frac\{G\}\{G\s*\+\s*2S\}/.test(source)) {
        return "performance-settled wholeness = ((outside-in restoration force / 2) / (outside-in restoration force / 2 + breakdown pressure)) = outside-in restoration force / (outside-in restoration force + 2 * breakdown pressure)";
    }

    if (/\\frac\{dC\}\{dt\}\s*=\s*G\(1-C\)\s*-\s*S\s*\\cdot\s*C/.test(source)) {
        return "d(inner wholeness)/dt = outside-in restoration force * (1 - inner wholeness) - breakdown pressure * inner wholeness";
    }

    if (/C\^\*\s*=\s*\\frac\{G\}\{G\s*\+\s*S\}/.test(source)) {
        return "settled wholeness = outside-in restoration force / (outside-in restoration force + breakdown pressure)";
    }

    if ((/\\chi|\u03c7/.test(source) || terms.some(([symbol]) => symbol === "chi")) && terms.length >= 5) {
        const factorLabels = terms
            .filter(([symbol]) => symbol !== "chi")
            .map(([, label]) => label);
        const joined = factorLabels.join(" times ");
        return `coherence output = integrated product of (${joined}) across the tested domain`;
    }

    if (/\\int\s*\\chi\s*dV/.test(source)) {
        return "total coherence = coherence output gathered across volume";
    }

    if (hasDerivative) {
        return "rate of change = driving factor times current state";
    }

    if (hasIntegral) {
        const readableTerms = terms.map(([, label]) => label).join(" times ");
        return readableTerms
            ? `total result = gathered value of (${readableTerms}) across the domain`
            : "total result = gathered value across the domain";
    }

    if (/\\Delta x/.test(source) && /\\Delta p/.test(source)) {
        return "position uncertainty times momentum uncertainty is at least h bar divided by two";
    }

    if (/G_\{\\mu\\nu\}/.test(source) && /T_\{\\mu\\nu\}/.test(source)) {
        return "spacetime curvature = constant scaling factor times stress energy";
    }

    if (/C\(t\)/.test(source) && /C_\{\\max\}/.test(source)) {
        return "coherence over time = maximum coherence times growth curve times threshold switch";
    }

    return buildSpokenStructure(source);
}

function buildEverydayMeaning(source: string, summary?: string): string {
    if (summary && !/Structural translation applied/i.test(summary)) {
        return summary;
    }

    if (/\\chi\s*=/.test(source) && /\\iiint/.test(source)) {
        return "In everyday words: the Master Equation says reality's coherence is built from all ten factors acting together across the whole domain. In this article, the crucial point is that the time term changes when dt appears.";
    }

    if (/C\(t\)\s*=\s*337/.test(source)) {
        return "In everyday words: after the Flood, the lifespan curve falls fast at first, then approaches a floor instead of collapsing to zero.";
    }

    if (/C_\{eq\}|C\^\*/.test(source) && /\\frac/.test(source)) {
        return "In everyday words: the settled level depends on how strongly outside-in restoration outweighs breakdown pressure.";
    }

    if (/C_1\(t\)|C_2\(t\)/.test(source)) {
        return "In everyday words: the article compares a flat pre-Flood pattern with a post-Flood decay curve that approaches a lower floor.";
    }

    if (/\\frac\{dC\}\{dt\}|dCdt|dC\/dt/.test(source)) {
        return "In everyday words: inner wholeness grows when the will is open to outside-in restoration, and decays when breakdown pressure dominates. Grace is not self-generated help; it is the external restoration force that prevents collapse.";
    }

    if (/\\chi|χ/.test(source) && /G/.test(source) && /C/.test(source)) {
        return "In everyday words: the model says total coherence is what results when grace, alignment, truth, entropy accounting, time, Logos, phase lock, faith potential, faith bond, and the Christ factor are considered together across the domain being tested.";
    }

    return "In everyday words: this equation is being restated as a claim about what each symbol contributes to the structure.";
}

function attachTranslationCard(state: OverlayState, shell: HTMLElement): void {
    const document = shell.ownerDocument;
    const card = document.createElement("div");
    card.className = "mtl-card";
    card.dataset.ttsMode = "read-word-equation-and-explanation";
    card.dataset.ttsSpeech = `See the word equation below. ${state.visualEquation}. ${state.everydayMeaning}`;

    const ttsCue = document.createElement("p");
    ttsCue.className = "mtl-tts-cue";
    ttsCue.textContent = "See the word equation below.";
    card.appendChild(ttsCue);

    const wordCard = document.createElement("div");
    wordCard.className = "mtl-layer mtl-word-card";

    const label = document.createElement("div");
    label.className = "mtl-label";
    label.textContent = "Word equation";
    label.setAttribute("aria-hidden", "true");
    wordCard.appendChild(label);

    const structureMarkup = renderStructureMapMarkup(state.source);
    if (structureMarkup) {
        const structure = document.createElement("div");
        structure.innerHTML = structureMarkup;
        wordCard.appendChild(structure.firstElementChild as HTMLElement);
    }

    const wordEquation = document.createElement("p");
    wordEquation.className = "mtl-word-equation";
    wordEquation.dataset.ttsRole = "word-equation";
    wordEquation.innerHTML = renderWordEquationMarkup(state.visualEquation);
    wordCard.appendChild(wordEquation);
    card.appendChild(wordCard);

    const explanationCard = document.createElement("div");
    explanationCard.className = "mtl-layer mtl-explanation-card";

    const explanationLabel = document.createElement("div");
    explanationLabel.className = "mtl-label";
    explanationLabel.textContent = "Everyday translation";
    explanationLabel.setAttribute("aria-hidden", "true");
    explanationCard.appendChild(explanationLabel);

    const meaning = document.createElement("p");
    meaning.className = "mtl-meaning";
    meaning.dataset.ttsRole = "explanation";
    meaning.textContent = state.everydayMeaning;
    explanationCard.appendChild(meaning);

    if (state.summary && !state.everydayMeaning.includes(state.summary)) {
        const summary = document.createElement("div");
        summary.className = "mtl-summary";
        summary.textContent = state.summary;
        explanationCard.appendChild(summary);
    }

    card.appendChild(explanationCard);
    shell.appendChild(card);
    state.card = card;
}

export function enhanceMathElement(element: HTMLElement): OverlayState | undefined {
    if (STATE.has(element)) {
        return STATE.get(element);
    }

    const source = extractSource(element);
    if (!source) {
        return undefined;
    }

    const cleanedSource = stripDelimiters(source);
    const document = element.ownerDocument;
    const reviewed = findReviewedTranslation(cleanedSource, document);
    const spoken = translate({
        input: cleanedSource,
        format: "tex",
        dictionary: "theophysics",
        mode: "structural",
        renderer: "tts",
        displayMode: true
    });

    const state: OverlayState = {
        root: element,
        card: element,
        source: cleanedSource,
        spokenStructure: buildSpokenStructure(cleanedSource) || spoken.output,
        visualEquation: reviewedVisualIsReadable(reviewed?.visual) ? reviewed.visual : buildVisualEquation(cleanedSource),
        everydayMeaning: reviewed?.meaning || buildEverydayMeaning(cleanedSource, spoken.summary),
        summary: spoken.summary,
        mode: "translation"
    };

    ensureStyles(document);
    element.classList.add("mtl-original-equation");
    element.dataset.ttsSkip = "true";
    element.setAttribute("aria-hidden", "true");

    const shell = document.createElement("div");
    shell.className = "mtl-shell";
    const equationBlock = element.closest(".eq-block, .math-box");
    (equationBlock ?? element).insertAdjacentElement("afterend", shell);

    attachTranslationCard(state, shell);
    setMode(state, "translation");

    element.dataset.mtlSource = cleanedSource;
    STATE.set(element, state);
    return state;
}

export function enhanceDocument(document: Document = window.document): OverlayState[] {
    ensureStyles(document);

    const selected = Array.from(
        document.querySelectorAll<HTMLElement>(
            ".eq-block, .equation-block, .equation-block .math, .math-box, .math, .hero-eq, .bx-eq, script[type^='math/tex'], [data-tex], mjx-container"
        )
    ).filter((element, index, array) => array.indexOf(element) === index);

    const elements = selected.filter(
        (element) => !selected.some((candidate) => candidate !== element && candidate.contains(element))
    );

    const states = elements
        .map((element) => enhanceMathElement(element))
        .filter((state): state is OverlayState => Boolean(state));

    return states;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            enhanceDocument(document);
        });
    } else {
        enhanceDocument(document);
    }
}
