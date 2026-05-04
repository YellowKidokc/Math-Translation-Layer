import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/browser/overlay.ts"],
  bundle: true,
  format: "iife",
  globalName: "MathTranslationOverlay",
  platform: "browser",
  target: ["es2020"],
  outfile: "dist/browser/math-translation-overlay.js",
  logLevel: "info"
});
