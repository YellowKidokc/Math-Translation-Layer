# Export Layer

Generated exports belong here or in `workflow_output/`, but runtime output is intentionally ignored by Git.

Expected export contracts:

- Source copies: `workflow_output/source/<run-id>/`
- Markdown: `workflow_output/markdown/<run-id>/`
- TTS text: `workflow_output/prepared/<run-id>/`
- Audio: `workflow_output/audio/<run-id>/`
- Logs and review events: `workflow_output/logs/<run-id>/`
- Release bundles: `exports/<release-id>/`

Every export should carry UUID/provenance fields where possible: run UUID, document UUID, source SHA-256, translation-event UUID, and release/build UUID.
