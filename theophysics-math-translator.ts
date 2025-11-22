/**
 * Theophysics Math Translation Layer
 * Translates LaTeX mathematical equations to Theophysics Narrative descriptions
 */

export interface TranslationResult {
    original: string;
    translated: string;
    location?: {
        line: number;
        column: number;
    };
}

export class MathTranslator {
    /**
     * Core symbol mappings from mathematical notation to Theophysics concepts
     */
    private static symbolMap: Record<string, string> = {
        // Greek letters - Core Theophysics symbols
        '\\chi': 'the Logos Field',
        '\\Chi': 'the Logos Field',
        '\\psi': 'the Soul Function',
        '\\Psi': 'the Soul Function',
        '\\phi': 'the Divine Proportion',
        '\\Phi': 'the Divine Proportion',
        '\\theta': 'the Angle of Faith',
        '\\Theta': 'the Angle of Faith',
        '\\alpha': 'the Beginning Constant',
        '\\omega': 'the End Constant',
        '\\Omega': 'the Ultimate Completion',
        '\\lambda': 'the Wavelength of Grace',
        '\\sigma': 'the Standard Deviation of Faith',
        '\\tau': 'the Time Constant of Transformation',
        '\\delta': 'the Change in Being',
        '\\Delta': 'the Total Change',
        '\\epsilon': 'the Small Measure of Grace',
        '\\gamma': 'the Constant of Glory',
        '\\mu': 'the Mean of Mercy',
        '\\nu': 'the Frequency of Prayer',
        '\\rho': 'the Density of Righteousness',
        '\\xi': 'the Unknown Variable of Mystery',

        // Operators
        '\\int': 'the integral',
        '\\sum': 'the sum',
        '\\prod': 'the product',
        '\\nabla': 'the gradient',
        '\\partial': 'the partial derivative',
        '\\infty': 'infinity',
        '\\lim': 'the limit',

        // Functions
        '\\sin': 'the sine',
        '\\cos': 'the cosine',
        '\\tan': 'the tangent',
        '\\log': 'the logarithm',
        '\\ln': 'the natural logarithm',
        '\\exp': 'the exponential',

        // Relations
        '\\equiv': 'is equivalent to',
        '\\approx': 'is approximately',
        '\\neq': 'is not equal to',
        '\\leq': 'is less than or equal to',
        '\\geq': 'is greater than or equal to',
        '\\propto': 'is proportional to',

        // Special symbols
        '\\hbar': 'the Planck constant of divine action',
        '\\ell': 'the characteristic length',
        '\\prime': 'prime',
        '\\cdot': 'times',
        '\\times': 'cross product with',
        '\\div': 'divided by',
        '\\pm': 'plus or minus',
        '\\mp': 'minus or plus',

        // Sets and logic
        '\\in': 'is in',
        '\\notin': 'is not in',
        '\\subset': 'is a subset of',
        '\\subseteq': 'is a subset or equal to',
        '\\cup': 'union with',
        '\\cap': 'intersection with',
        '\\emptyset': 'the empty set',
        '\\exists': 'there exists',
        '\\forall': 'for all',

        // Arrows
        '\\rightarrow': 'leads to',
        '\\Rightarrow': 'implies',
        '\\leftarrow': 'comes from',
        '\\Leftarrow': 'is implied by',
        '\\leftrightarrow': 'is equivalent to',
        '\\Leftrightarrow': 'if and only if',
    };

    /**
     * Variable mappings for Theophysics-specific variables
     */
    private static variableMap: Record<string, string> = {
        'G': 'Grace',
        'K': 'Knowledge',
        'F': 'Faith',
        'L': 'Love',
        'H': 'Hope',
        'W': 'Wisdom',
        'S': 'Spirit',
        'T': 'Truth',
        'P': 'Power',
        'E': 'Energy',
        'M': 'Mass',
        'c': 'the speed of light',
        't': 'time',
        'x': 'position',
        'v': 'velocity',
        'a': 'acceleration',
        'r': 'radius',
        'n': 'number',
        'i': 'index',
        'j': 'index',
        'k': 'index',
    };

    /**
     * Extract all math expressions from a document
     */
    public static extractMathExpressions(content: string): Array<{math: string, type: 'inline' | 'display', position: number}> {
        const results: Array<{math: string, type: 'inline' | 'display', position: number}> = [];

        // Find display math ($$...$$)
        const displayRegex = /\$\$([\s\S]*?)\$\$/g;
        let match;
        while ((match = displayRegex.exec(content)) !== null) {
            results.push({
                math: match[1].trim(),
                type: 'display',
                position: match.index
            });
        }

        // Find inline math ($...$) - but not display math
        const inlineRegex = /(?<!\$)\$(?!\$)(.*?)\$(?!\$)/g;
        while ((match = inlineRegex.exec(content)) !== null) {
            results.push({
                math: match[1].trim(),
                type: 'inline',
                position: match.index
            });
        }

        return results.sort((a, b) => a.position - b.position);
    }

    /**
     * Main translation function
     */
    public static translate(mathExpression: string): string {
        // Remove surrounding $ signs if present
        let expr = mathExpression.trim();
        expr = expr.replace(/^\$+/, '').replace(/\$+$/, '').trim();

        if (!expr) {
            return "No mathematical expression found";
        }

        // Handle special patterns first
        const specialTranslation = this.translateSpecialPatterns(expr);
        if (specialTranslation) {
            return specialTranslation;
        }

        // General translation
        return this.translateGeneral(expr);
    }

    /**
     * Translate special mathematical patterns
     */
    private static translateSpecialPatterns(expr: string): string | null {
        // Pattern: \chi = \int G \cdot K
        if (/\\chi\s*=\s*\\int.*G.*K/.test(expr)) {
            return "The Logos Field equals the integral of Grace times Knowledge";
        }

        // Pattern: E = mc^2
        if (/E\s*=\s*m\s*c\^2/.test(expr) || /E\s*=\s*m\s*c\^{2}/.test(expr)) {
            return "Energy equals mass times the speed of light squared";
        }

        // Pattern: F = ma
        if (/F\s*=\s*m\s*a/.test(expr)) {
            return "Faith equals mass times acceleration";
        }

        // Pattern: Integral expressions
        const integralMatch = expr.match(/\\int(?:_\{?([^}]*?)\}?)?(?:\^\{?([^}]*?)\}?)?\s*(.+?)\s*d([a-z])/);
        if (integralMatch) {
            const [, lower, upper, integrand, variable] = integralMatch;
            const translatedIntegrand = this.translateSimple(integrand);
            const translatedVar = this.variableMap[variable] || variable;

            let result = "the integral of " + translatedIntegrand;
            if (lower && upper) {
                result += ` from ${lower} to ${upper}`;
            }
            result += ` with respect to ${translatedVar}`;
            return result;
        }

        // Pattern: Sum expressions
        const sumMatch = expr.match(/\\sum(?:_\{?([^}]*?)\}?)?(?:\^\{?([^}]*?)\}?)?\s*(.+)/);
        if (sumMatch) {
            const [, lower, upper, summand] = sumMatch;
            const translatedSummand = this.translateSimple(summand);

            let result = "the sum of " + translatedSummand;
            if (lower && upper) {
                result += ` from ${lower} to ${upper}`;
            }
            return result;
        }

        // Pattern: Fractions
        const fracMatch = expr.match(/\\frac\{([^}]+)\}\{([^}]+)\}/);
        if (fracMatch) {
            const [, numerator, denominator] = fracMatch;
            const transNum = this.translateSimple(numerator);
            const transDen = this.translateSimple(denominator);
            return `${transNum} divided by ${transDen}`;
        }

        // Pattern: Square roots
        const sqrtMatch = expr.match(/\\sqrt(?:\[([^\]]+)\])?\{([^}]+)\}/);
        if (sqrtMatch) {
            const [, root, content] = sqrtMatch;
            const transContent = this.translateSimple(content);
            if (root) {
                return `the ${root}th root of ${transContent}`;
            }
            return `the square root of ${transContent}`;
        }

        return null;
    }

    /**
     * General translation for simple expressions
     */
    private static translateGeneral(expr: string): string {
        let result = expr;

        // Replace symbols
        for (const [latex, meaning] of Object.entries(this.symbolMap)) {
            const regex = new RegExp(latex.replace(/\\/g, '\\\\'), 'g');
            result = result.replace(regex, meaning);
        }

        // Replace variables
        for (const [variable, meaning] of Object.entries(this.variableMap)) {
            const regex = new RegExp(`\\b${variable}\\b`, 'g');
            result = result.replace(regex, meaning);
        }

        // Clean up operators
        result = result.replace(/\*/g, ' times ');
        result = result.replace(/\+/g, ' plus ');
        result = result.replace(/(?<!\w)-(?!\w)/g, ' minus ');
        result = result.replace(/=/g, ' equals ');
        result = result.replace(/\^{?(\w+)}?/g, ' to the power of $1');
        result = result.replace(/_\{?([^}]+)\}?/g, ' subscript $1');
        result = result.replace(/\\cdot/g, ' times ');
        result = result.replace(/\\/g, '');
        result = result.replace(/[{}]/g, '');

        // Clean up spacing
        result = result.replace(/\s+/g, ' ').trim();

        return result;
    }

    /**
     * Translate a simple sub-expression
     */
    private static translateSimple(expr: string): string {
        expr = expr.trim();

        // Check if it's a known symbol
        if (this.symbolMap[expr]) {
            return this.symbolMap[expr];
        }

        // Check if it's a known variable
        if (this.variableMap[expr]) {
            return this.variableMap[expr];
        }

        // Otherwise, do general translation
        return this.translateGeneral(expr);
    }

    /**
     * Translate all math in a document
     */
    public static translateDocument(content: string): TranslationResult[] {
        const mathExpressions = this.extractMathExpressions(content);
        const results: TranslationResult[] = [];

        for (const expr of mathExpressions) {
            const translated = this.translate(expr.math);
            results.push({
                original: `${expr.type === 'display' ? '$$' : '$'}${expr.math}${expr.type === 'display' ? '$$' : '$'}`,
                translated: translated
            });
        }

        return results;
    }

    /**
     * Generate a translation dictionary from multiple documents
     */
    public static generateDictionary(results: TranslationResult[]): string {
        let output = "# Theophysics Math Translation Dictionary\n\n";
        output += `Generated: ${new Date().toLocaleString()}\n\n`;
        output += `Total equations found: ${results.length}\n\n`;
        output += "---\n\n";

        const uniqueTranslations = new Map<string, string>();

        for (const result of results) {
            if (!uniqueTranslations.has(result.original)) {
                uniqueTranslations.set(result.original, result.translated);
            }
        }

        output += "## Translations\n\n";
        let index = 1;
        for (const [original, translated] of uniqueTranslations) {
            output += `### ${index}. ${original}\n\n`;
            output += `**Translation:** ${translated}\n\n`;
            output += "---\n\n";
            index++;
        }

        return output;
    }
}
