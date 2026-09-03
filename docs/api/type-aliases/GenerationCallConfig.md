[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerationCallConfig

# Type Alias: GenerationCallConfig

> **GenerationCallConfig** = `object`

Defined in: [types/generate.ts:1740](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1740)

Per-call configuration for GenerationHandler's AI-SDK loop invocation,
shared by the initial call and every fallback retry so they cannot drift.

## Properties

### shouldUseTools

> **shouldUseTools**: `boolean`

Defined in: [types/generate.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1741)

---

### includeStructuredOutput

> **includeStructuredOutput**: `boolean`

Defined in: [types/generate.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1742)

---

### turnStartMs

> **turnStartMs**: `number`

Defined in: [types/generate.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1746)

Anchor for the turn deadline — the ORIGINAL executeGeneration start,
shared across fallback/provider retries so they can't refresh the
wall-clock budget.

---

### promptJsonInstruction?

> `optional` **promptJsonInstruction?**: `boolean`

Defined in: [types/generate.ts:1749](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1749)

Structured-output fallback retry: also spell the JSON Schema out in the
system prompt, for vendors that ignore `response_format`.

---

### isToolReask?

> `optional` **isToolReask?**: `boolean`

Defined in: [types/generate.ts:1751](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1751)

Set on the single toolChoice:"none" re-ask so it can never recurse.
