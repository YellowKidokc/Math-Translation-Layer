# Front Doors

Public entrypoints that a non-local user or online AI can start from:

- `README.md` for install, build, CLI, browser overlay, and TTS workflow orientation.
- `RUN_MATH_TTS_WORKFLOW.bat` for a Windows click-to-run intake wizard.
- `src/browser/overlay.ts` for the browser-side equation card and structural map.
- `scripts/prepare-tts-workflow.js` for folder/list ingestion, markdown extraction, TTS text, UUIDs, and review-event sidecars.

Do not put private NAS paths, local vault paths, API keys, raw handoffs, or unpublished canon workbooks in this layer.
