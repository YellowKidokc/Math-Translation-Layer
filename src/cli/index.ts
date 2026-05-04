#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { extractMathBlocks, translate, translateEquation } from "../core";
import { loadDictionary, listDictionaries } from "../dictionaries";

interface CliIo {
    stdout(message: string): void;
    stderr(message: string): void;
}

interface ScanFileReport {
    file: string;
    found: number;
    translated: number;
    unmapped: string[];
}

function normalizeLatex(source: string): string {
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

function readOption(args: string[], name: string): string | undefined {
    const index = args.indexOf(name);
    if (index === -1 || index === args.length - 1) {
        return undefined;
    }
    return args[index + 1];
}

function hasFlag(args: string[], name: string): boolean {
    return args.includes(name);
}

function collectFiles(targetPath: string): string[] {
    const stat = fs.statSync(targetPath);
    if (stat.isFile()) {
        return [targetPath];
    }

    const files: string[] = [];
    for (const entry of fs.readdirSync(targetPath)) {
        const fullPath = path.join(targetPath, entry);
        const entryStat = fs.statSync(fullPath);
        if (entryStat.isDirectory()) {
            files.push(...collectFiles(fullPath));
            continue;
        }

        if (/\.(html|md|markdown|tex|txt)$/i.test(fullPath)) {
            files.push(fullPath);
        }
    }

    return files;
}

function renderReport(report: ScanFileReport[], format: "text" | "json"): string {
    if (format === "json") {
        return JSON.stringify(report, null, 2);
    }

    const lines: string[] = [];
    for (const item of report) {
        lines.push(`${item.file}`);
        lines.push(`  Found: ${item.found}`);
        lines.push(`  Translated: ${item.translated}`);
        lines.push(`  Unmapped: ${item.unmapped.length}`);
        if (item.unmapped.length > 0) {
            lines.push(`  Missing: ${item.unmapped.join(" | ")}`);
        }
    }
    return lines.join("\n");
}

async function handleTranslate(args: string[], io: CliIo): Promise<number> {
    const inline = readOption(args, "--input");
    const file = readOption(args, "--file");
    const format = (readOption(args, "--input-format") ?? "tex") as "tex" | "unicode" | "mathml";
    const dictionary = readOption(args, "--dictionary") ?? "theophysics";
    const mode = (readOption(args, "--mode") ?? "structural") as "structural" | "narrative";
    const outputFormat = readOption(args, "--output-format");
    const renderer = (readOption(args, "--renderer") ?? (mode === "narrative" ? "plaintext" : "latex-structural")) as
        | "latex-structural"
        | "plaintext"
        | "markdown"
        | "tts"
        | "json"
        | "html-mathjax"
        | "word-equation";
    const outputPath = readOption(args, "--output");

    const input = inline ?? (file ? fs.readFileSync(file, "utf8") : "");
    if (!input) {
        io.stderr("No input provided. Use --input or --file.");
        return 1;
    }

    const normalizedInput = normalizeLatex(input);

    if (outputFormat === "full") {
        const result = await translateEquation(normalizedInput, {
            format,
            dictionary,
            enableFallback: true,
            displayMode: hasFlag(args, "--display")
        });
        const rendered = [
            "=== ORIGINAL ===",
            result.original,
            "",
            "=== WORD EQUATION ===",
            result.wordEquation,
            "",
            "=== EXPLANATION ===",
            result.spokenExplanation,
            "",
            "=== METADATA ===",
            `Confidence: ${result.confidence.toFixed(2)}`,
            `Used Fallback: ${result.usedFallback}`,
            result.diagnostics.length > 0 ? `Diagnostics: ${result.diagnostics.join(" | ")}` : "Diagnostics: none"
        ].join("\n");

        if (outputPath) {
            fs.writeFileSync(outputPath, rendered, "utf8");
        } else {
            io.stdout(rendered);
        }

        return 0;
    }

    const result = translate({
        input: normalizedInput,
        format,
        dictionary,
        mode,
        renderer,
        displayMode: hasFlag(args, "--display")
    });

    if (outputPath) {
        fs.writeFileSync(outputPath, result.output, "utf8");
    } else {
        io.stdout(result.output);
    }

    return 0;
}

async function handleDictionary(args: string[], io: CliIo): Promise<number> {
    const subcommand = args[1] ?? "list";

    if (subcommand === "list") {
        io.stdout(JSON.stringify(listDictionaries(), null, 2));
        return 0;
    }

    if (subcommand === "inspect") {
        const dictionary = readOption(args, "--dictionary") ?? "theophysics";
        io.stdout(JSON.stringify(loadDictionary(dictionary).data, null, 2));
        return 0;
    }

    io.stderr(`Unknown dictionary subcommand: ${subcommand}`);
    return 1;
}

async function handleScan(args: string[], io: CliIo): Promise<number> {
    const targetPath = readOption(args, "--path");
    if (!targetPath) {
        io.stderr("Missing --path for scan command.");
        return 1;
    }

    const dictionary = readOption(args, "--dictionary") ?? "theophysics";
    const mode = (readOption(args, "--mode") ?? "structural") as "structural" | "narrative";
    const renderer = (readOption(args, "--renderer") ?? "latex-structural") as
        | "latex-structural"
        | "plaintext"
        | "markdown"
        | "tts"
        | "json"
        | "html-mathjax";
    const reportFormat = (readOption(args, "--report") ?? "text") as "text" | "json";
    const outputPath = readOption(args, "--output");

    const report: ScanFileReport[] = [];

    for (const file of collectFiles(targetPath)) {
        const content = fs.readFileSync(file, "utf8");
        const blocks = extractMathBlocks(content);
        const fileReport: ScanFileReport = {
            file,
            found: blocks.length,
            translated: 0,
            unmapped: []
        };

        for (const block of blocks) {
            const result = translate({
                input: normalizeLatex(block.latex),
                format: "tex",
                dictionary,
                mode,
                renderer,
                displayMode: block.isBlock
            });

            const isUnmapped = result.diagnostics.some((diagnostic) => diagnostic.type === "unmapped");
            if (!isUnmapped) {
                fileReport.translated += 1;
            } else {
                fileReport.unmapped.push(block.latex);
            }
        }

        report.push(fileReport);
    }

    const rendered = renderReport(report, reportFormat);
    if (outputPath) {
        fs.writeFileSync(outputPath, rendered, "utf8");
    } else {
        io.stdout(rendered);
    }

    return 0;
}

export async function runCli(argv: string[], io?: CliIo): Promise<number> {
    const sink: CliIo = io ?? {
        stdout(message: string) {
            process.stdout.write(`${message}\n`);
        },
        stderr(message: string) {
            process.stderr.write(`${message}\n`);
        }
    };
    const [command = "translate"] = argv;

    if (command === "translate") {
        return handleTranslate(argv.slice(1), sink);
    }

    if (command === "scan") {
        return handleScan(argv.slice(1), sink);
    }

    if (command === "dictionary") {
        return handleDictionary(argv.slice(1), sink);
    }

    sink.stderr(`Unknown command: ${command}`);
    return 1;
}

if (require.main === module) {
    runCli(process.argv.slice(2)).then((code) => {
        process.exitCode = code;
    });
}
