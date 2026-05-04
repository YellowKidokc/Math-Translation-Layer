import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli/index";

function createIo() {
    const stdout: string[] = [];
    const stderr: string[] = [];
    return {
        stdout,
        stderr,
        io: {
            stdout(message: string) {
                stdout.push(message);
            },
            stderr(message: string) {
                stderr.push(message);
            }
        }
    };
}

describe("cli", () => {
    it("translates inline input", async () => {
        const sink = createIo();
        const exitCode = await runCli([
            "translate",
            "--input",
            "\\chi = G \\cdot M \\cdot E \\cdot S \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C",
            "--renderer",
            "latex-structural"
        ], sink.io);

        expect(exitCode).toBe(0);
        expect(sink.stdout.join("\n")).toContain("Grace");
    });

    it("scans a folder and reports unmapped equations", async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "math-translation-engine-"));
        const filePath = path.join(tempDir, "sample.md");
        fs.writeFileSync(filePath, "$$X = Y$$\n$$\\chi = G \\cdot M \\cdot E \\cdot S \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C$$");

        const sink = createIo();
        const exitCode = await runCli(["scan", "--path", tempDir], sink.io);

        expect(exitCode).toBe(0);
        expect(sink.stdout.join("\n")).toContain("Unmapped: 1");
    });

    it("renders the three-layer full output format", async () => {
        const sink = createIo();
        const exitCode = await runCli([
            "translate",
            "--input",
            "\\chi = G \\cdot M \\cdot E \\cdot S_{eff} \\cdot T \\cdot K \\cdot R \\cdot Q \\cdot F \\cdot C",
            "--output-format",
            "full"
        ], sink.io);

        const output = sink.stdout.join("\n");
        expect(exitCode).toBe(0);
        expect(output).toContain("=== ORIGINAL ===");
        expect(output).toContain("=== WORD EQUATION ===");
        expect(output).toContain("=== EXPLANATION ===");
        expect(output).toContain("Confidence:");
    });
});
