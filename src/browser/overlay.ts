import { translate } from "../core";

interface OverlayState {
    root: HTMLElement;
    source: string;
    translatedMarkup: string;
    rawMarkup: string;
    summary?: string;
    mode: "translation" | "math";
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
            margin-top: 0.75rem;
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
            font-size: 0.85rem;
            padding: 0;
            margin-top: 0.65rem;
            text-decoration: underline;
        }
        .mtl-master-toggle {
            position: fixed;
            right: 1rem;
            top: 1rem;
            z-index: 9999;
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

function isLikelyMath(source: string): boolean {
    return /\\[A-Za-z]+|=|·|\^|_|\$/.test(source);
}

function extractSource(element: HTMLElement): string | undefined {
    const dataSource = element.dataset.mtlSource ?? element.dataset.tex;
    if (dataSource) {
        return dataSource;
    }

    const text = element.textContent?.trim();
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

function setMode(state: OverlayState, mode: "translation" | "math"): void {
    state.mode = mode;
    renderMathJax(state.root, mode === "translation" ? state.translatedMarkup : state.rawMarkup);
}

function attachToggle(state: OverlayState, shell: HTMLElement): void {
    const button = shell.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "mtl-toggle";
    button.textContent = "Show the math";
    button.addEventListener("click", () => {
        const nextMode = state.mode === "translation" ? "math" : "translation";
        setMode(state, nextMode);
        button.textContent = nextMode === "translation" ? "Show the math" : "Show translation";
    });
    shell.appendChild(button);
}

function attachSummary(state: OverlayState, shell: HTMLElement): void {
    if (!state.summary) {
        return;
    }

    const summary = shell.ownerDocument.createElement("div");
    summary.className = "mtl-summary";
    summary.textContent = state.summary;
    shell.appendChild(summary);
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
    const translated = translate({
        input: cleanedSource,
        format: "tex",
        dictionary: "theophysics",
        mode: "structural",
        renderer: "html-mathjax",
        displayMode: true
    });

    const rawMarkup = `\\[${cleanedSource}\\]`;
    const state: OverlayState = {
        root: element,
        source: cleanedSource,
        translatedMarkup: translated.output,
        rawMarkup,
        summary: translated.summary,
        mode: "translation"
    };

    const document = element.ownerDocument;
    ensureStyles(document);

    const shell = document.createElement("div");
    shell.className = "mtl-shell";
    element.insertAdjacentElement("afterend", shell);

    attachToggle(state, shell);
    attachSummary(state, shell);
    setMode(state, "translation");

    element.dataset.mtlSource = cleanedSource;
    STATE.set(element, state);
    return state;
}

export function enhanceDocument(document: Document = window.document): OverlayState[] {
    ensureStyles(document);

    const elements = Array.from(
        document.querySelectorAll<HTMLElement>(".equation-block .math, .math, script[type^='math/tex'], [data-tex], mjx-container")
    ).filter((element, index, array) => array.indexOf(element) === index);

    const states = elements
        .map((element) => enhanceMathElement(element))
        .filter((state): state is OverlayState => Boolean(state));

    if (states.length > 0 && !document.querySelector(".mtl-master-toggle")) {
        const master = document.createElement("button");
        master.type = "button";
        master.className = "mtl-master-toggle";
        master.textContent = "Math mode";
        master.addEventListener("click", () => {
            const switchToMath = states.some((state) => state.mode === "translation");
            states.forEach((state) => setMode(state, switchToMath ? "math" : "translation"));
            master.textContent = switchToMath ? "Translation mode" : "Math mode";
        });
        document.body.appendChild(master);
    }

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
