#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const crypto = require("crypto");

const { JSDOM } = require("jsdom");

let cachedCore;
function getCore() {
    if (!cachedCore) {
        cachedCore = require("../dist/src/core");
    }
    return cachedCore;
}

const SUPPORTED_INPUTS = /\.(html?|md|markdown|txt)$/i;
const TYPE_EXTENSIONS = {
    html: [".html", ".htm"],
    md: [".md", ".markdown"],
    markdown: [".md", ".markdown"],
    txt: [".txt"],
    text: [".txt"],
    all: [".html", ".htm", ".md", ".markdown", ".txt"]
};

function timestamp() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        "-",
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds())
    ].join("");
}

function parseArgs(argv) {
    const args = {
        outDir: path.resolve(process.cwd(), "workflow_output"),
        dictionary: "theophysics",
        mode: "narrative",
        renderer: "tts",
        ttsRoot: process.env.MTL_TTS_ROOT || path.resolve(process.cwd(), "tts-pipeline"),
        engine: "edge",
        voice: "",
        python: "",
        opener: "Theophysics. David Lowe. POF 2828.",
        types: "all",
        runId: "",
        releaseId: "",
        copySource: false,
        writeMarkdown: false,
        skipMath: false,
        runTts: false,
        recursive: true,
        cleanHtml: true
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];
        if (arg === "--input") {
            args.input = next;
            i += 1;
        } else if (arg === "--list") {
            args.list = next;
            i += 1;
        } else if (arg === "--out") {
            args.outDir = path.resolve(next);
            i += 1;
        } else if (arg === "--dictionary") {
            args.dictionary = next;
            i += 1;
        } else if (arg === "--mode") {
            args.mode = next;
            i += 1;
        } else if (arg === "--renderer") {
            args.renderer = next;
            i += 1;
        } else if (arg === "--tts-root") {
            args.ttsRoot = next;
            i += 1;
        } else if (arg === "--engine") {
            args.engine = next;
            i += 1;
        } else if (arg === "--voice") {
            args.voice = next;
            i += 1;
        } else if (arg === "--python") {
            args.python = next;
            i += 1;
        } else if (arg === "--opener") {
            args.opener = next;
            i += 1;
        } else if (arg === "--types") {
            args.types = next;
            i += 1;
        } else if (arg === "--run-id") {
            args.runId = next;
            i += 1;
        } else if (arg === "--release-id") {
            args.releaseId = next;
            i += 1;
        } else if (arg === "--copy-source") {
            args.copySource = true;
        } else if (arg === "--markdown") {
            args.writeMarkdown = true;
        } else if (arg === "--skip-math") {
            args.skipMath = true;
        } else if (arg === "--run-tts") {
            args.runTts = true;
        } else if (arg === "--no-recursive") {
            args.recursive = false;
        } else if (arg === "--raw-html") {
            args.cleanHtml = false;
        }
    }

    return args;
}

function usage() {
    return [
        "Usage:",
        "  node scripts/prepare-tts-workflow.js --input <file-or-folder> [--run-tts]",
        "  node scripts/prepare-tts-workflow.js --list paper-list.txt [--run-tts]",
        "",
        "Outputs:",
        "  workflow_output/prepared/*.tts.txt",
        "  workflow_output/markdown/*.md when --markdown is used",
        "  workflow_output/source/* when --copy-source is used",
        "  workflow_output/audio/*.mp3 when --run-tts is used",
        "  workflow_output/logs/*.log"
    ].join("\n");
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function sanitizeName(filePath) {
    return path.basename(filePath, path.extname(filePath)).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim() || "prepared";
}

function safeRunId(value) {
    return (value || timestamp()).replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function uuidFor(namespace, parts) {
    const hash = crypto
        .createHash("sha256")
        .update([namespace, ...parts.map((part) => String(part))].join("\u001f"))
        .digest("hex");
    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        `5${hash.slice(13, 16)}`,
        `${(parseInt(hash.slice(16, 18), 16) & 0x3f | 0x80).toString(16).padStart(2, "0")}${hash.slice(18, 20)}`,
        hash.slice(20, 32)
    ].join("-");
}

function fileSha256(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function uniquePath(dir, baseName, ext) {
    let candidate = path.join(dir, `${baseName}${ext}`);
    let index = 2;
    while (fs.existsSync(candidate)) {
        candidate = path.join(dir, `${baseName}-${index}${ext}`);
        index += 1;
    }
    return candidate;
}

function normalizeLatex(source) {
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

function nonOverlappingBlocks(content) {
    const { extractMathBlocks } = getCore();
    const blocks = extractMathBlocks(content);
    const kept = [];
    let lastEnd = -1;
    for (const block of blocks) {
        if (block.start < lastEnd) {
            continue;
        }
        kept.push(block);
        lastEnd = block.end;
    }
    return kept;
}

function translateMathBlock(block, options, stats, forceEquationCue = false) {
    try {
        const { translate } = getCore();
        const result = translate({
            input: normalizeLatex(block.latex),
            format: "tex",
            dictionary: options.dictionary,
            mode: options.mode,
            renderer: options.renderer,
            displayMode: block.isBlock
        });
        stats.mathBlocks += 1;
        if (result.diagnostics && result.diagnostics.length > 0) {
            stats.diagnostics.push({
                equation: block.latex,
                diagnostics: result.diagnostics.map((item) => item.message)
            });
        }
        const eventUuid = uuidFor("mtl.translation-event", [
            stats.documentUuid,
            block.start,
            block.end,
            block.latex,
            options.renderer,
            options.mode
        ]);
        stats.translationEvents.push({
            uuid: eventUuid,
            event: "math-translation",
            runUuid: stats.runUuid,
            documentUuid: stats.documentUuid,
            reviewPriority: forceEquationCue || block.isBlock ? "high" : "normal",
            equation: block.latex,
            output: result.output,
            renderer: options.renderer,
            mode: options.mode,
            diagnostics: result.diagnostics?.map((item) => item.message) ?? [],
            reviewInstruction: "Check whether the translation preserves the equation's logical structure and improves reader comprehension."
        });
        const output = result.output;
        if (block.isBlock || forceEquationCue) {
            return `See the equation below. In plain English: ${output}`;
        }
        return output;
    } catch (error) {
        stats.mathBlocks += 1;
        stats.failedMathBlocks += 1;
        stats.diagnostics.push({
            equation: block.latex,
            diagnostics: [error instanceof Error ? error.message : String(error)]
        });
        return forceEquationCue || block.isBlock
            ? "See the equation below. In plain English: an equation is shown here for reference"
            : "an equation is shown here for reference";
    }
}

function replaceMath(content, options, stats, replaceOptions = {}) {
    if (options.skipMath) {
        return content;
    }

    const blocks = nonOverlappingBlocks(content);
    let cursor = 0;
    const parts = [];

    for (const block of blocks) {
        parts.push(content.slice(cursor, block.start));
        parts.push(` ${translateMathBlock(block, options, stats, replaceOptions.forceEquationCue)} `);
        cursor = block.end;
    }

    parts.push(content.slice(cursor));
    return parts.join("");
}

function stripChrome(document) {
    const stripSelectors = [
        "script",
        "style",
        "noscript",
        "svg",
        "canvas",
        "iframe",
        "nav",
        "header",
        "footer",
        "form",
        "button",
        "input",
        "select",
        "textarea",
        "audio",
        "video",
        "source",
        "img",
        "[hidden]",
        "[aria-hidden='true']",
        ".nav",
        ".navbar",
        ".sidebar",
        ".sidebar-toggle",
        ".sidebar-overlay",
        ".tab-shell",
        ".tab-nav",
        ".tab-btn",
        ".menu",
        ".toolbar",
        ".cookie",
        ".banner",
        ".breadcrumb",
        ".pagination",
        ".social",
        ".share",
        ".comments",
        ".related-post",
        ".advertisement",
        ".scoring-card",
        ".dock-pills",
        ".dock-pill",
        ".media-card"
    ];

    for (const element of document.querySelectorAll(stripSelectors.join(","))) {
        element.remove();
    }
}

function firstText(root, selectors) {
    for (const selector of selectors) {
        const text = root.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim();
        if (text) {
            return text;
        }
    }
    return "";
}

function textFromElement(element, options, stats, elementOptions = {}) {
    if (element.classList.contains("math-box")) {
        const label = element.querySelector(".mlabel")?.textContent?.replace(/\s+/g, " ").trim() || "";
        const equationClone = element.cloneNode(true);
        for (const child of equationClone.querySelectorAll(".mlabel,.mnote")) {
            child.remove();
        }
        const equationText = (equationClone.textContent || "").replace(/\s+/g, " ").trim();
        const notes = Array.from(element.querySelectorAll(".mnote"))
            .map((note) => replaceMath(note.textContent || "", options, stats).replace(/\s+/g, " ").trim())
            .filter(Boolean);
        const parts = [];
        if (label) {
            parts.push(label);
        }
        if (equationText) {
            parts.push(replaceMath(equationText, options, stats, { forceEquationCue: true }).replace(/\s+/g, " ").trim());
        }
        parts.push(...notes);
        return parts.join(" ").trim();
    }

    if (element.classList.contains("hero-side")) {
        return [".label", "h3", "p"]
            .map((selector) => element.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .join(". ");
    }

    if (element.classList.contains("kill-card")) {
        return [".kill-label", "p", ".kill-detail"]
            .map((selector) => {
                const child = element.querySelector(selector);
                return child ? replaceMath(child.textContent || "", options, stats).replace(/\s+/g, " ").trim() : "";
            })
            .filter(Boolean)
            .join(". ");
    }

    const rawText = (element.textContent || "").replace(/\s+/g, " ").trim();
    if (!rawText) {
        return "";
    }
    return replaceMath(rawText, options, stats, {
        forceEquationCue: elementOptions.forceEquationCue
            || element.classList.contains("math-box")
            || element.classList.contains("eq-block")
            || element.classList.contains("equation-block")
            || element.classList.contains("math")
            || element.classList.contains("hero-eq")
            || element.classList.contains("bx-eq")
    }).replace(/\s+/g, " ").trim();
}

function appendElementText(lines, element, options, stats) {
    const tag = element.tagName.toLowerCase();
    const text = textFromElement(element, options, stats);
    if (!text) {
        return false;
    }

    if (tag === "h1") {
        lines.push(`# ${text}`, "");
    } else if (tag === "h2") {
        lines.push(`## ${text}`, "");
    } else if (tag === "h3") {
        lines.push(`### ${text}`, "");
    } else if (tag === "li") {
        lines.push(`- ${text}`);
    } else if (tag === "blockquote") {
        lines.push(`> ${text}`, "");
    } else {
        lines.push(text, "");
    }
    return true;
}

function appendSection(lines, root, options, stats) {
    if (!root) {
        return 0;
    }

    let appended = 0;
    const blockSelector = [
        ".hero-side",
        ".eq-block",
        ".equation-block",
        ".math-box",
        ".math",
        ".hero-eq",
        ".bx-eq",
        "[data-tex]",
        "mjx-container",
        ".insight",
        ".pull-quote",
        ".exec-summary",
        ".kill-card",
        ".audit-band",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "blockquote",
        "li",
        "figcaption",
        "td",
        "th",
        "dt",
        "dd"
    ].join(",");

    if (root.matches && root.matches(blockSelector)) {
        return appendElementText(lines, root, options, stats) ? 1 : 0;
    }

    for (const element of Array.from(root.querySelectorAll(blockSelector))) {
        const parentBlock = element.parentElement?.closest(blockSelector);
        if (parentBlock && parentBlock !== element) {
            continue;
        }
        if (appendElementText(lines, element, options, stats)) {
            appended += 1;
        }
    }
    return appended;
}

function cloneWithout(root, selectors) {
    if (!root) {
        return null;
    }
    const clone = root.cloneNode(true);
    for (const element of clone.querySelectorAll(selectors.join(","))) {
        element.remove();
    }
    return clone;
}

function visibleHtmlToText(html, options, stats) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    stripChrome(document);

    const title = firstText(document, [
        ".hero-main h1",
        ".gtq-canon-title",
        "main h1",
        "h1",
        "title"
    ]);
    const subtitle = firstText(document, [
        ".hero-main .overlay p",
        ".gtq-canon-sub",
        "meta[name='description']"
    ]) || document.querySelector("meta[name='description']")?.getAttribute("content")?.trim() || "";
    const lines = [];

    if (options.opener) {
        lines.push(options.opener, "");
    }
    if (title) {
        lines.push(`# ${title}`, "");
    }
    if (subtitle) {
        lines.push(subtitle, "");
    }

    const paperArticle = document.querySelector("section#paper article.story") || document.querySelector("main article.story");
    const paperBody = cloneWithout(paperArticle, [".gtq-bottom-audit"]);
    let bodyBlocks = appendSection(lines, paperBody, options, stats);
    stats.extractionStrategy = bodyBlocks > 0 ? "gtq-paper-article" : "none";

    if (bodyBlocks === 0) {
        const fallbackRoots = [
            document.querySelector("main article"),
            document.querySelector("article"),
            document.querySelector("main"),
            document.querySelector("[role='main']"),
            document.body
        ].filter(Boolean);
        const seen = new Set();
        for (const root of fallbackRoots) {
            if (seen.has(root)) {
                continue;
            }
            seen.add(root);
            bodyBlocks = appendSection(lines, root, options, stats);
            if (bodyBlocks > 0) {
                const selectorName = root === document.body
                    ? "body"
                    : root.getAttribute("role") === "main"
                        ? "role-main"
                        : root.tagName.toLowerCase();
                stats.extractionStrategy = `fallback-${selectorName}`;
                break;
            }
        }
    }

    const appendixRoots = [
        ...Array.from(document.querySelectorAll(".hero-side")),
        document.querySelector("section#summary article"),
        document.querySelector("section#rigor article"),
        document.querySelector("section#blackboard article"),
        paperArticle?.querySelector(".gtq-bottom-audit"),
        document.querySelector("aside.kill-sidebar")
    ].filter(Boolean);

    if (appendixRoots.length > 0) {
        lines.push("## Appendix", "");
        for (const root of appendixRoots) {
            appendSection(lines, root, options, stats);
        }
    }

    const fallback = (document.body?.textContent || "").replace(/\s+/g, " ").trim();
    return (lines.length > 0 ? lines.join("\n") : fallback).replace(/\n{3,}/g, "\n\n").trim();
}

function cleanText(text) {
    return polishForSpeech(text)
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim() + "\n";
}

function cleanMarkdown(text) {
    return cleanText(text)
        .replace(/^Theophysics\. David Lowe\. POF 2828\.\n\n/, "")
        .trim() + "\n";
}

function polishForSpeech(text) {
    const replacements = [
        [/\\geq/g, " is greater than or equal to "],
        [/\\leq/g, " is less than or equal to "],
        [/\\iff/g, " if and only if "],
        [/\\to/g, " leads to "],
        [/\\rightarrow/g, " leads to "],
        [/\\Delta/g, " delta "],
        [/\\delta/g, " delta "],
        [/\\Psi/g, " capital psi "],
        [/\\psi/g, " psi "],
        [/\\chi/g, " chi "],
        [/\\ll/g, " much less than "],
        [/\\cdot/g, " times "],
        [/→/g, " leads to "],
        [/≥/g, " is greater than or equal to "],
        [/≤/g, " is less than or equal to "],
        [/·/g, " times "],
        [/&/g, " and "]
    ];

    let polished = text;
    for (const [pattern, replacement] of replacements) {
        polished = polished.replace(pattern, replacement);
    }

    polished = polished
        .replace(/\\text\s*\{([^{}]+)\}/g, " $1 ")
        .replace(/\bsub\s*\{([^{}]+)\}/g, "sub $1")
        .replace(/\bof\s*\{([^{}]+)\}/g, "of $1")
        .replace(/\(([^()]+)\)/g, " $1 ")
        .replace(/[{}]/g, " ")
        .replace(/_/g, " ")
        .replace(/\s+([.,;:])/g, "$1")
        .replace(/[ \t]{2,}/g, " ");

    return polished;
}

function allowedExtensions(types) {
    const values = String(types || "all")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    const extensions = new Set();
    for (const value of values.length > 0 ? values : ["all"]) {
        for (const ext of TYPE_EXTENSIONS[value] || []) {
            extensions.add(ext);
        }
    }
    return extensions.size > 0 ? extensions : new Set(TYPE_EXTENSIONS.all);
}

function isSupportedByType(filePath, types) {
    if (!SUPPORTED_INPUTS.test(filePath)) {
        return false;
    }
    return allowedExtensions(types).has(path.extname(filePath).toLowerCase());
}

function discoverFiles(target, recursive, types = "all") {
    const resolved = path.resolve(target);
    if (!fs.existsSync(resolved)) {
        throw new Error(`Input not found: ${target}`);
    }

    const stat = fs.statSync(resolved);
    if (stat.isFile()) {
        return isSupportedByType(resolved, types) ? [resolved] : [];
    }

    const files = [];
    for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        const full = path.join(resolved, entry.name);
        if (entry.isDirectory() && recursive) {
            files.push(...discoverFiles(full, recursive, types));
        } else if (entry.isFile() && isSupportedByType(full, types)) {
            files.push(full);
        }
    }
    return files;
}

function readList(listPath, recursive, types = "all") {
    const base = path.dirname(path.resolve(listPath));
    const lines = fs.readFileSync(listPath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

    const files = [];
    for (const line of lines) {
        const resolved = path.isAbsolute(line) ? line : path.resolve(base, line);
        files.push(...discoverFiles(resolved, recursive, types));
    }
    return files;
}

function copySource(filePath, args, dirs, baseName) {
    if (!args.copySource) {
        return "";
    }
    const ext = path.extname(filePath);
    const target = uniquePath(dirs.source, baseName, ext || ".source");
    fs.copyFileSync(filePath, target);
    return target;
}

function findPython(args) {
    if (args.python) {
        return args.python;
    }
    const venvPython = path.join(args.ttsRoot, "venv", "Scripts", "python.exe");
    return fs.existsSync(venvPython) ? venvPython : "python";
}

function runTts(preparedPath, audioPath, args, logLines) {
    const scriptPath = path.join(args.ttsRoot, "scripts", "tts_pipeline.py");
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`TTS script not found: ${scriptPath}`);
    }

    const python = findPython(args);
    const ttsArgs = [
        scriptPath,
        preparedPath,
        audioPath,
        "--engine",
        args.engine,
        "--save-normalized"
    ];
    if (args.voice) {
        ttsArgs.push("--voice", args.voice);
    }

    logLines.push(`TTS command: ${python} ${ttsArgs.map((part) => `"${part}"`).join(" ")}`);
    const result = spawnSync(python, ttsArgs, {
        cwd: args.ttsRoot,
        encoding: "utf8"
    });

    if (result.stdout) {
        logLines.push("TTS stdout:", result.stdout.trim());
    }
    if (result.stderr) {
        logLines.push("TTS stderr:", result.stderr.trim());
    }
    if (result.status !== 0) {
        throw new Error(`TTS failed with exit code ${result.status}`);
    }
}

function processFile(filePath, args, dirs) {
    const sourceSha256 = fileSha256(filePath);
    const documentUuid = uuidFor("mtl.document", [path.resolve(filePath).toLowerCase(), sourceSha256]);
    const stats = {
        runUuid: args.runUuid,
        documentUuid,
        sourceSha256,
        file: filePath,
        mathBlocks: 0,
        failedMathBlocks: 0,
        extractionStrategy: "plain-text",
        diagnostics: [],
        translationEvents: []
    };
    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, "utf8");
    const prepared = ext === ".html" || ext === ".htm"
        ? visibleHtmlToText(raw, args, stats)
        : replaceMath(raw, args, stats);
    const finalText = cleanText(prepared);

    const baseName = sanitizeName(filePath);
    const preparedPath = uniquePath(dirs.prepared, baseName, ".tts.txt");
    const markdownPath = args.writeMarkdown ? uniquePath(dirs.markdown, baseName, ".md") : "";
    const sourcePath = copySource(filePath, args, dirs, baseName);
    const logPath = uniquePath(dirs.logs, baseName, ".log");
    fs.writeFileSync(preparedPath, finalText, "utf8");
    if (markdownPath) {
        fs.writeFileSync(markdownPath, cleanMarkdown(prepared), "utf8");
    }

    const releaseBuildUuid = uuidFor("mtl.release-build", [args.releaseId || "local", args.runUuid]);

    const logLines = [
        `Run UUID: ${args.runUuid}`,
        `Release/Build UUID: ${releaseBuildUuid}`,
        `Document UUID: ${documentUuid}`,
        `Source SHA-256: ${sourceSha256}`,
        `Source: ${filePath}`,
        `Prepared: ${preparedPath}`,
        sourcePath ? `Copied source: ${sourcePath}` : "",
        markdownPath ? `Markdown: ${markdownPath}` : "",
        `Math blocks: ${stats.mathBlocks}`,
        `Failed math blocks: ${stats.failedMathBlocks}`,
        `Extraction strategy: ${stats.extractionStrategy}`
    ].filter(Boolean);

    const eventPath = uniquePath(dirs.logs, baseName, ".translation-events.json");
    fs.writeFileSync(eventPath, JSON.stringify(stats.translationEvents, null, 2), "utf8");
    logLines.push(`Translation events: ${eventPath}`);

    let audioPath = "";
    if (args.runTts) {
        audioPath = uniquePath(dirs.audio, baseName, ".mp3");
        runTts(preparedPath, audioPath, args, logLines);
        logLines.push(`Audio: ${audioPath}`);
    }

    if (stats.diagnostics.length > 0) {
        logLines.push("", "Math diagnostics:");
        for (const item of stats.diagnostics) {
            logLines.push(`- ${item.equation}`);
            for (const message of item.diagnostics) {
                logLines.push(`  ${message}`);
            }
        }
    }

    fs.writeFileSync(logPath, logLines.join("\n") + "\n", "utf8");
    return { ...stats, releaseBuildUuid, preparedPath, markdownPath, sourcePath, audioPath, logPath, eventPath };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.input && !args.list) {
        console.error(usage());
        process.exitCode = 1;
        return;
    }

    const distCore = path.resolve(__dirname, "..", "dist", "src", "core", "index.js");
    if (!fs.existsSync(distCore)) {
        console.error("Build output is missing. Run npm install, then npm run build.");
        process.exitCode = 1;
        return;
    }

    const runId = safeRunId(args.runId);
    args.runUuid = uuidFor("mtl.run", [runId, args.input || "", args.list || "", new Date().toISOString()]);
    const dirs = {
        root: args.outDir,
        prepared: path.join(args.outDir, "prepared", runId),
        markdown: path.join(args.outDir, "markdown", runId),
        source: path.join(args.outDir, "source", runId),
        audio: path.join(args.outDir, "audio", runId),
        logs: path.join(args.outDir, "logs", runId)
    };
    ensureDir(dirs.prepared);
    ensureDir(dirs.logs);
    if (args.writeMarkdown) {
        ensureDir(dirs.markdown);
    }
    if (args.copySource) {
        ensureDir(dirs.source);
    }
    if (args.runTts) {
        ensureDir(dirs.audio);
    }

    const files = args.list ? readList(args.list, args.recursive, args.types) : discoverFiles(args.input, args.recursive, args.types);
    const uniqueFiles = Array.from(new Set(files)).sort();
    if (uniqueFiles.length === 0) {
        console.log("No supported .html, .htm, .md, .markdown, or .txt files found.");
        return;
    }

    console.log(`Preparing ${uniqueFiles.length} file(s)...`);
    console.log(`Output: ${dirs.root}`);

    const summary = [];
    for (const file of uniqueFiles) {
        try {
            const result = processFile(file, args, dirs);
            summary.push({
                runUuid: result.runUuid,
                releaseBuildUuid: result.releaseBuildUuid,
                documentUuid: result.documentUuid,
                sourceSha256: result.sourceSha256,
                file,
                ok: true,
                prepared: result.preparedPath,
                audio: result.audioPath,
                log: result.logPath,
                translationEvents: result.eventPath,
                markdown: result.markdownPath,
                copiedSource: result.sourcePath,
                mathBlocks: result.mathBlocks,
                failedMathBlocks: result.failedMathBlocks
            });
            console.log(`[OK] ${file}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            summary.push({ file, ok: false, error: message });
            console.log(`[FAIL] ${file}`);
            console.log(`       ${message}`);
        }
    }

    const summaryPath = path.join(dirs.logs, "summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
    const failed = summary.filter((item) => !item.ok).length;
    console.log("");
    console.log(`Done. Success: ${summary.length - failed}. Failed: ${failed}.`);
    console.log(`Prepared text: ${dirs.prepared}`);
    if (args.writeMarkdown) {
        console.log(`Markdown: ${dirs.markdown}`);
    }
    if (args.copySource) {
        console.log(`Copied source: ${dirs.source}`);
    }
    if (args.runTts) {
        console.log(`Audio: ${dirs.audio}`);
    }
    console.log(`Logs: ${dirs.logs}`);
}

if (require.main === module) {
    main();
}

module.exports = {
    visibleHtmlToText,
    cleanText,
    polishForSpeech,
    replaceMath,
    uuidFor
};
