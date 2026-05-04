# CODEX TASK: Math Translation Layer — Three-Layer Output System
**Repo:** `D:\GitHub\Math-Translation-Layer`
**Priority:** HIGH — This is the core unlock for the entire Theophysics publication system

---

## THE GOAL

Every equation must produce THREE LAYERS of output:

```
Layer 1 — Original Equation (LaTeX)
\chi = G \cdot M \cdot E \cdot S_{eff} \cdot T \cdot K \cdot R \cdot Q \cdot F \cdot C

Layer 2 — Word Equation (same structure, plain English)
Coherence = Grace × Alignment × Truth × Entropy-Resistance × Time × Logos × Phase-Lock × Faith-Potential × Faith-Bond × Christ-Factor

Layer 3 — Spoken Explanation (TTS-ready prose, NOT bullets)
This equation is a chain where every link must hold. Grace, Truth, Logos — all ten factors multiply together, and if any one of them drops to zero, the entire output collapses. You cannot compensate for missing Truth with extra Grace. Each factor is necessary, but none is sufficient on its own.
```

---

## TASK 1: Fix Parser — `src/core/parser.ts`

**Problem:** Parser treats structural LaTeX commands as separate tokens and inserts false `\cdot` operators.

**Failing input:**
```latex
\mathcal{L} = \chi(t) \left( \frac{d}{dt} \sum_i v_i \right)^2 - S \cdot \chi(t)
```

**Current broken output:**
```
\mathcal \cdot {L} = \text{Coherence Output} \cdot \left((\frac{d}{dt} \cdot \sum_{i} \cdot v_{i} \cdot \right)^{2}) - \text{Entropy} \cdot \text{Coherence Output}
```

**Expected output:**
```
\mathcal{L} = \text{Coherence Output}(t) \left( \frac{d}{dt} \sum_i v_i \right)^2 - \text{Entropy} \cdot \text{Coherence Output}(t)
```

**Fix:** Add these to structural command handling (consume following braces as arguments, not separate tokens):

```typescript
const STRUCTURAL_COMMANDS = new Set([
  "\\mathcal",
  "\\mathrm", 
  "\\mathbf",
  "\\mathbb",
  "\\operatorname",
  "\\text",
  "\\left",
  "\\right",
  "\\frac",
  "\\sum",
  "\\prod",
  "\\int",
  "\\partial",
  "\\nabla",
  "\\vec",
  "\\dot",
  "\\ddot",
  "\\bar",
  "\\hat",
  "\\tilde"
]);
```

Handle `\left` and `\right` as delimiter pairs that preserve grouping.
Handle `\frac{num}{denom}` as a single fraction node with two children.
Handle `\mathcal{X}` as a single symbol node, not `\mathcal` + `{` + `X` + `}`.

---

## TASK 2: Add Word-Equation Renderer — `src/renderers/word-equation.ts` (NEW FILE)

**Purpose:** Preserve equation structure but replace symbols with dictionary labels.

**Input AST after translation:**
```
BinaryOp(=, Symbol(χ), Product([Symbol(G), Symbol(M), Symbol(E), ...]))
```

**Output:**
```
Coherence = Grace × Alignment × Truth × Entropy-Resistance × Time × Logos × Phase-Lock × Faith-Potential × Faith-Bond × Christ-Factor
```

**Rules:**
- Use `×` for multiplication (more readable than `·`)
- Use `=` for equals
- Use `−` for minus
- Preserve parentheses, fractions, superscripts as readable text
- Fraction: `(numerator) / (denominator)` or keep frac structure
- Superscript: `base^exponent` or `base squared`, `base cubed`
- Subscript: `base_subscript` or inline like `S-effective`

**Register in renderer index:**
```typescript
// src/renderers/index.ts
export type RendererId =
  | "latex-structural"
  | "plaintext"
  | "markdown"
  | "tts"
  | "json"
  | "html-mathjax"
  | "word-equation";  // ADD THIS
```

---

## TASK 3: Add Structural Insight Generator — `src/core/structural-insight.ts` (NEW FILE)

**Purpose:** Walk the AST, detect mathematical patterns, generate TTS-ready prose explanation.

**Pattern Detection Table:**

| AST Pattern | Math Form | Prose Template |
|-------------|-----------|----------------|
| Product node with N children | A × B × C × ... | "This equation is a chain where every link must hold. The {N} factors multiply together, which means if any one of them drops to zero, the entire output collapses." |
| Sum node with N children | A + B + C + ... | "These terms add together, so each one contributes to the total. A weakness in one area can be offset by strength in another." |
| Fraction node | A / B | "The numerator increases the output while the denominator constrains it. As {denominator-label} grows, the overall value shrinks." |
| Exponential with negative | e^(-S) | "This exponential term means that as {S-label} increases, it suppresses the output — not linearly, but with accelerating force." |
| Integral node | ∫ ... dt | "This integral accumulates the quantity over time. History matters — the output depends on everything that came before." |
| Derivative node | d/dt | "This derivative captures the rate of change, not the value itself. It's about motion, not position." |
| Squared term | x² | "Squaring amplifies differences. Small values shrink toward zero; large values explode upward." |
| Subtraction A - B | χ - S·χ | "The second term opposes the first. {B-label} works against {A-label}, pulling the output down." |

**Output format:**
- MUST be TTS-ready prose
- NO bullet points
- NO sentence fragments
- Use connective words: "which means", "so", "because", "and"
- Flow as one or two readable paragraphs

**Example for Master Equation:**
```typescript
generateInsight(ast) → 
"This equation is a chain where every link must hold. Grace, Alignment, Truth, Entropy-Resistance, Time, Logos, Phase-Lock, Faith-Potential, Faith-Bond, and Christ-Factor all multiply together. If any single factor drops to zero, the entire output collapses to zero with it. You cannot compensate for missing Grace with extra Truth. Each factor is necessary, but none is sufficient on its own."
```

**Example for Lagrangian:**
```typescript
generateInsight(ast) →
"This Lagrangian has two competing terms. The first term couples coherence to the squared rate of change of the system state — the faster things move, the more coherence amplifies that motion. The second term subtracts entropy times coherence, which means entropy actively works against the system's coherence. The balance between motion and decay determines the dynamics."
```

---

## TASK 4: Add Confidence Scoring — `src/core/quality-gate.ts` (NEW FILE)

**Purpose:** Determine if deterministic translation is good enough or needs LLM fallback.

**Scoring factors:**
```typescript
interface TranslationQuality {
  confidence: number;          // 0.0 to 1.0
  unmappedSymbols: string[];   // symbols not in dictionary
  opaqueNodes: number;         // AST nodes parser couldn't handle
  structuralIssues: string[];  // e.g., "unmatched \left", "garbled fraction"
  useFallback: boolean;        // confidence < 0.7 → true
}
```

**Rules:**
- Start at confidence = 1.0
- Subtract 0.1 for each unmapped symbol
- Subtract 0.15 for each opaque node
- Subtract 0.2 for structural issues (broken delimiters, garbled commands)
- If output contains raw LaTeX commands in word-equation, subtract 0.3
- If confidence < 0.7, set `useFallback = true`

---

## TASK 5: Add OpenAI Fallback — `src/core/llm-fallback.ts` (NEW FILE)

**Purpose:** When deterministic translation fails, call OpenAI to generate proper output.

**API Setup:**
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

**Add to package.json:**
```json
"dependencies": {
  "openai": "^4.0.0"
}
```

**Function signature:**
```typescript
export async function llmFallback(
  originalLatex: string,
  dictionary: Dictionary,
  deterministicAttempt: {
    wordEquation: string;
    insight: string;
  }
): Promise<{
  wordEquation: string;
  spokenExplanation: string;
}>
```

**Prompt template:**
```typescript
const systemPrompt = `You are a math translation assistant for the Theophysics framework.

You translate LaTeX equations into two outputs:
1. Word Equation: Same structure as original, but with plain English labels
2. Spoken Explanation: TTS-ready prose explaining what the mathematical structure means

SYMBOL DICTIONARY:
${JSON.stringify(dictionary.symbols, null, 2)}

RULES FOR WORD EQUATION:
- Preserve the exact structure of the original equation
- Replace symbols with their dictionary labels
- Use × for multiplication, = for equals, − for minus
- Keep fractions, parentheses, superscripts readable

RULES FOR SPOKEN EXPLANATION:
- Write flowing prose, NOT bullet points
- Explain what the mathematical STRUCTURE means (multiplication = all necessary, division = constraint, etc.)
- Use connective words: "which means", "so", "because"
- Make it sound natural when read aloud by TTS
- 2-4 sentences maximum for simple equations
- Can be longer for complex equations, but stay prose`;

const userPrompt = `Translate this equation:

ORIGINAL LATEX:
${originalLatex}

MY DETERMINISTIC ATTEMPT (may have errors):
Word Equation: ${deterministicAttempt.wordEquation}
Insight: ${deterministicAttempt.insight}

Please provide corrected versions in this exact JSON format:
{
  "wordEquation": "...",
  "spokenExplanation": "..."
}`;
```

**Model:** Use `gpt-4o-mini` for cost efficiency. Fall back to `gpt-3.5-turbo` if needed.

---

## TASK 6: Update Main Translate Function — `src/core/index.ts`

**New output interface:**
```typescript
export interface TranslationResult {
  original: string;              // Layer 1: Original LaTeX
  wordEquation: string;          // Layer 2: Plain English equation
  spokenExplanation: string;     // Layer 3: TTS-ready prose
  summary?: string;              // One-line summary (existing)
  equationId?: string;           // Optional ID for tracking
  confidence: number;            // 0.0 to 1.0
  usedFallback: boolean;         // Did we call OpenAI?
  diagnostics: string[];         // Any issues detected
}
```

**New translate function:**
```typescript
export async function translateEquation(
  input: string,
  options: {
    format?: InputFormat;
    dictionary?: string;
    enableFallback?: boolean;  // default true
  } = {}
): Promise<TranslationResult>
```

**Flow:**
```
1. parseMath(input) → AST
2. translateMath(AST, dictionary) → translated AST
3. renderOriginal(AST) → original string
4. renderWordEquation(translatedAST) → wordEquation
5. generateInsight(translatedAST) → spokenExplanation
6. assessQuality(translatedAST, wordEquation) → quality
7. IF quality.useFallback AND enableFallback:
     { wordEquation, spokenExplanation } = await llmFallback(...)
8. Return full TranslationResult
```

---

## TASK 7: Update CLI — `src/cli/index.ts`

**Add new output mode:**
```bash
node dist/src/cli/index.js translate --file input.txt --output-format full
```

**Output format `full`:**
```
=== ORIGINAL ===
\chi = G \cdot M \cdot E \cdot S_{eff} \cdot T \cdot K \cdot R \cdot Q \cdot F \cdot C

=== WORD EQUATION ===
Coherence = Grace × Alignment × Truth × Entropy-Resistance × Time × Logos × Phase-Lock × Faith-Potential × Faith-Bond × Christ-Factor

=== EXPLANATION ===
This equation is a chain where every link must hold. Grace, Truth, Logos — all ten factors multiply together, and if any one of them drops to zero, the entire output collapses. You cannot compensate for missing Truth with extra Grace. Each factor is necessary, but none is sufficient on its own.

=== METADATA ===
Confidence: 0.95
Used Fallback: false
```

---

## TEST CASES

**Test 1: Master Equation (should work deterministically)**
```latex
\chi = G \cdot M \cdot E \cdot S_{eff} \cdot T \cdot K \cdot R \cdot Q \cdot F \cdot C
```

**Test 2: Moral Entropy Equation (should work deterministically)**
```latex
\frac{dS_m}{dt} = \sigma - \frac{W_{grace}}{T}
```

**Test 3: Lagrangian (may need fallback)**
```latex
\mathcal{L} = \chi(t) \left( \frac{d}{dt} \sum_i v_i \right)^2 - S \cdot \chi(t)
```

**Test 4: Grace Function (should work deterministically)**
```latex
G(t) = G_0 \cdot e^{\int r(t') dt'} \cdot (1 - R(t))
```

---

## FILES TO CREATE/MODIFY

| File | Action |
|------|--------|
| `src/core/parser.ts` | MODIFY — fix structural command handling |
| `src/renderers/word-equation.ts` | CREATE — new renderer |
| `src/core/structural-insight.ts` | CREATE — TTS prose generator |
| `src/core/quality-gate.ts` | CREATE — confidence scoring |
| `src/core/llm-fallback.ts` | CREATE — OpenAI integration |
| `src/core/index.ts` | MODIFY — new translateEquation function |
| `src/cli/index.ts` | MODIFY — add full output mode |
| `src/renderers/index.ts` | MODIFY — register word-equation renderer |
| `package.json` | MODIFY — add openai dependency |
| `.env.example` | CREATE — document OPENAI_API_KEY |
| `tests/three-layer.test.ts` | CREATE — test the new output format |

---

## ENVIRONMENT

Add to `.env`:
```
OPENAI_API_KEY=sk-...
```

---

## SUCCESS CRITERIA

After this task, running:
```bash
node dist/src/cli/index.js translate --file master-equation.txt --output-format full
```

Should produce clean three-layer output where:
1. Layer 1 shows original LaTeX
2. Layer 2 shows same structure with English words
3. Layer 3 is readable TTS prose (no bullets, flows naturally)
4. Confidence > 0.9 for simple equations
5. Fallback only triggers for genuinely complex structures

---

## NOTES

- The dictionary is at `src/dictionaries/theophysics.json` — use it
- Do NOT replace the deterministic pipeline with pure LLM — LLM is fallback only
- The goal is 60-75% deterministic, 25-40% fallback
- Every equation, every paper, every article gets three layers — no exceptions
