# NLP Review Events

The Math Translation Layer now marks high-value translation moments so an NLP reviewer can focus on the exact places where comprehension succeeds or fails.

## Browser Overlay Event

When the browser overlay renders a structural equation map, it emits a DOM event marker:

```html
<div
  class="mtl-structure-map"
  data-mtl-event="structural-equation-map"
  data-mtl-review-priority="high"
  data-mtl-review="{...json...}">
</div>
```

The JSON payload contains:

```json
{
  "eventId": "mtl-struct-...",
  "event": "structural-equation-map",
  "source": "original equation source",
  "tokens": [
    { "math": "dC/dt", "word": "change in coherence" }
  ],
  "reviewPriority": "high",
  "reviewInstruction": "Check whether the common-language row preserves the same logical structure as the math row."
}
```

## TTS Workflow Event

When `scripts/prepare-tts-workflow.js` translates a math block, it now writes a sidecar file:

```text
workflow_output/logs/<run-id>/<paper>.translation-events.json
```

Each event contains:

```json
{
  "uuid": "translation event UUID",
  "event": "math-translation",
  "runUuid": "workflow run UUID",
  "documentUuid": "source document UUID",
  "reviewPriority": "high",
  "equation": "raw equation",
  "output": "spoken/plain-language translation",
  "renderer": "tts",
  "mode": "narrative",
  "diagnostics": [],
  "reviewInstruction": "Check whether the translation preserves the equation's logical structure and improves reader comprehension."
}
```

## NLP Reviewer Prompt

Use this prompt over the event JSON, not the whole paper:

```text
You are reviewing a math-to-language translation event.

Goal:
Confirm whether the common-language translation preserves the same logical structure as the original equation while making it easier for a non-specialist reader/listener to follow.

Check:
1. Does every major symbol/operator have a faithful meaning?
2. Does the word row preserve equation order and grouping?
3. Is anything theologically or scientifically over-translated?
4. Is there a clearer wording that preserves structure?
5. Should this event be accepted, repaired, or rejected?

Return JSON:
{
  "decision": "accept | repair | reject",
  "confidence": 0.0,
  "structure_preserved": true,
  "improved_wording": "",
  "risk_notes": [],
  "reason": ""
}
```

## Boundary

The NLP reviewer is not the authority over the math. It is a comprehension and wording reviewer. Formal correctness still belongs to the deterministic parser/renderer and, when applicable, the Lean/formal proof layer.
