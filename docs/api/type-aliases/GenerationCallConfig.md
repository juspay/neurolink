[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerationCallConfig

# Type Alias: GenerationCallConfig

> **GenerationCallConfig** = `object`

Defined in: [types/generate.ts:1763](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1763)

Per-call configuration for GenerationHandler's AI-SDK loop invocation,
shared by the initial call and every fallback retry so they cannot drift.

## Properties

### shouldUseTools

> **shouldUseTools**: `boolean`

Defined in: [types/generate.ts:1764](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1764)

---

### includeStructuredOutput

> **includeStructuredOutput**: `boolean`

Defined in: [types/generate.ts:1765](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1765)

---

### turnStartMs

> **turnStartMs**: `number`

Defined in: [types/generate.ts:1769](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1769)

Anchor for the turn deadline — the ORIGINAL executeGeneration start,
shared across fallback/provider retries so they can't refresh the
wall-clock budget.

---

### promptJsonInstruction?

> `optional` **promptJsonInstruction?**: `boolean`

Defined in: [types/generate.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1772)

Structured-output fallback retry: also spell the JSON Schema out in the
system prompt, for vendors that ignore `response_format`.

---

### isToolReask?

> `optional` **isToolReask?**: `boolean`

Defined in: [types/generate.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1774)

Set on the single toolChoice:"none" re-ask so it can never recurse.
