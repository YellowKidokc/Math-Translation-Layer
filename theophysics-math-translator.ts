/**
 * Theophysics Math Translator
 * Converts standard LaTeX physics notation into Theophysics narrative language.
 */

export class MathTranslator {

    // ==========================================
    // LAYER 1: FULL EQUATION OVERRIDES (Context Is King)
    // ==========================================
    private static readonly EQUATION_MAP: Record<string, string> = {
        // Master Equation
        "\\\\chi\\s*=\\s*\\\\int\\s*\\(G\\s*\\\\cdot\\s*K\\)\\s*d\\\\Omega":
            "The Logos Field equals the integral of Grace times Knowledge over all creation",

        // Modified Einstein (Paper 1)
        "G_\\{\\\\mu\\\\nu\\}\\s*\\+\\s*\\\\Lambda\\s*g_\\{\\\\mu\\\\nu\\}":
            "Spacetime curvature plus the cosmological constant",

        // Trinity Actualization (Paper 2)
        "FQ\\s*\\\\ge\\s*\\\\Theta_c":
            "Faith intensity times Quantum Potential must exceed the Actualization Threshold",

        // Soul Field Klein-Gordon (Paper 5)
        "\\(\\\\Box\\s*\\+\\s*m_S\\^2\\)\\\\Psi_S\\s*=\\s*0":
            "The wave operator plus the soul field mass squared, acting on the soul field, equals zero",

        // Black Hole Entropy (Paper 7)
        "S_\\{BH\\}\\s*=\\s*\\\\frac\\{k_B\\s*A\\}\\{4\\\\ell_P\\^2\\}":
            "The Black Hole entropy equals Boltzmann's constant times the Horizon Area, divided by four times the Planck length squared",

        // Hubble's Law (Paper 8)
        "v\\s*=\\s*H_0\\s*d":
            "Recessional velocity equals the Hubble expansion rate times distance"
    };

    // ==========================================
    // LAYER 2: MATH STRUCTURES (Grammar)
    // ==========================================
    private static readonly STRUCTURE_MAP: Record<string, string> = {
        // Fractions
        "\\\\frac\\{(.+?)\\}\\{(.+?)\\}": "the ratio of $1 to $2",

        // Roots
        "\\\\sqrt\\{-g\\}": "the spacetime volume factor",
        "\\\\sqrt\\{(.+?)\\}": "the square root of $1",

        // Powers
        "\\^2": " squared",
        "\\^3": " cubed",
        "\\^4": " to the fourth",
        "\\^\\{?(.+?)\\}?": " to the power of $1",

        // Subscripts
        "_\\{?(.+?)\\}?": " sub $1",

        // Integrals & Sums
        "\\\\int\\s*d\\^4x": "integrating over all spacetime",
        "\\\\int": "the integral of",
        "\\\\sum": "the sum of",

        // Derivatives
        "\\\\partial_\\\\mu": "the gradient in direction mu",
        "\\\\partial": "the change in",
        "\\\\nabla\\^2": "the curvature of",
        "\\\\nabla": "the gradient of",
        "\\\\Box": "the wave operator",

        // Relations
        "\\\\cdot": " times ",
        "\\\\approx": " is approximately ",
        "\\\\ge": " is greater than or equal to ",
        "\\\\le": " is less than or equal to ",
        "\\\\equiv": " is defined as ",
        "\\\\rightarrow": " leads to ",

        // Constants
        "\\\\infty": "infinity",
        "\\(2\\\\pi\\)\\^3": "the normalization factor"
    };

    // ==========================================
    // LAYER 3: SYMBOL MAPPING (Vocabulary)
    // ==========================================
    private static readonly SYMBOL_MAP: Record<string, string> = {
        // --- Theophysics Core ---
        "\\\\chi": "the Logos Field",
        "\\\\Psi_S": "the Soul Field",
        "\\\\Psi": "the Field",
        "\\\\psi": "the wavefunction",
        "\\\\Phi": "integrated information",

        // --- Theophysics Variables (Context Sensitive) ---
        "\\bG\\b": "Grace",
        "\\bS\\b": "Entropy",
        "\\bC\\b": "Coherence",
        "\\bF\\b": "Faith",
        "\\bQ\\b": "Quantum Potential",
        "\\bW\\b": "Will Current",
        "\\bK\\b": "Knowledge",
        "\\bR\\b": "Resurrection",

        // --- Constants ---
        "\\\\Theta_c": "the Actualization Threshold",
        "\\\\Lambda": "the Cosmological Constant",
        "\\\\ell_P": "the Planck Length",
        "k_B": "Boltzmann's Constant",
        "G_N": "Newton's Constant",
        "\\bc\\b": "the speed of light",
        "\\\\hbar": "h-bar",

        // --- QFT & Notation ---
        "\\\\dagger": " dagger",
        "\\\\langle": "the expectation of ",
        "\\\\rangle": "",
        "\\\\mathcal\\{L\\}": "the Lagrangian",
        "\\\\mathcal\\{H\\}": "the Hamiltonian"
    };

    /**
     * Translate raw LaTeX string into Theophysics Narrative
     */
    static translate(latex: string): string {
        let clean = latex.trim();

        // 0. Basic Cleanup (strip $$ and $)
        clean = clean.replace(/\$\$/g, '').replace(/\$/g, '');

        // 1. Apply Full Equation Overrides (Longest Match First)
        for (const [pattern, replacement] of Object.entries(this.EQUATION_MAP)) {
            const regex = new RegExp(pattern, 'g');
            clean = clean.replace(regex, replacement);
        }

        // 2. Apply Structure Maps (Recursive patterns)
        for (const [pattern, replacement] of Object.entries(this.STRUCTURE_MAP)) {
            const regex = new RegExp(pattern, 'g');
            clean = clean.replace(regex, replacement);
        }

        // 3. Apply Symbol Maps
        for (const [pattern, replacement] of Object.entries(this.SYMBOL_MAP)) {
            const regex = new RegExp(pattern, 'g');
            clean = clean.replace(regex, replacement);
        }

        // 4. Final cleanup of any remaining LaTeX artifacts
        clean = clean.replace(/\\text\{(.+?)\}/g, '$1'); // Keep text inside \text{}
        clean = clean.replace(/\s+/g, ' ').trim(); // Collapse spaces

        return clean;
    }

    /**
     * Extract all math blocks from markdown content
     * Returns array of {latex, start, end} objects
     */
    static extractMathBlocks(content: string): Array<{latex: string, start: number, end: number, isBlock: boolean}> {
        const blocks: Array<{latex: string, start: number, end: number, isBlock: boolean}> = [];

        // Match block math ($$...$$)
        const blockRegex = /\$\$([^\$]+)\$\$/g;
        let match;

        while ((match = blockRegex.exec(content)) !== null) {
            blocks.push({
                latex: match[1].trim(),
                start: match.index,
                end: match.index + match[0].length,
                isBlock: true
            });
        }

        // Match inline math ($...$) but avoid $$
        const inlineRegex = /(?<!\$)\$([^\$\n]+?)\$(?!\$)/g;

        while ((match = inlineRegex.exec(content)) !== null) {
            blocks.push({
                latex: match[1].trim(),
                start: match.index,
                end: match.index + match[0].length,
                isBlock: false
            });
        }

        // Sort by position
        return blocks.sort((a, b) => a.start - b.start);
    }

    /**
     * Translate all math in a document and return mapping
     */
    static translateDocument(content: string): Array<{original: string, translation: string, position: number}> {
        const blocks = this.extractMathBlocks(content);
        return blocks.map(block => ({
            original: block.latex,
            translation: this.translate(block.latex),
            position: block.start
        }));
    }
}
