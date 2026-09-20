[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalSelectOptions

# Type Alias: ToolRetrievalSelectOptions

> **ToolRetrievalSelectOptions** = `object`

Defined in: [types/toolRouting.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L422)

Options passed to `selectRelevantToolNames()` — the high-level convenience
wrapper around `ToolEmbeddingIndex`.

## Properties

### topK

> **topK**: `number`

Defined in: [types/toolRouting.ts:424](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L424)

Maximum number of tool names to return.

---

### weights?

> `optional` **weights?**: [`ToolRetrievalWeights`](ToolRetrievalWeights.md)

Defined in: [types/toolRouting.ts:426](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L426)

Optional weight override (defaults to `{ cosine: 0.8, bm25: 0.2 }`).

---

### embedFn

> **embedFn**: (`texts`) => `Promise`\<`number`[][]\>

Defined in: [types/toolRouting.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L432)

Async function that converts an array of text strings into embedding
vectors. Must return one vector per input text in the same order.
Errors thrown here propagate to the caller (so it can fail open).

#### Parameters

##### texts

`string`[]

#### Returns

`Promise`\<`number`[][]\>

---

### vectorCache?

> `optional` **vectorCache?**: `Map`\<`string`, `number`[]\>

Defined in: [types/toolRouting.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L440)

Optional shared vector cache (keyed by text string). When supplied the
underlying `ToolEmbeddingIndex` reads from and writes to this Map so that
tool vectors computed on a prior call are reused on subsequent calls for
the same item text. Callers that want warm-cache behavior across turns
should pass the same Map instance each time.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/toolRouting.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L444)

Timeout for each embedding provider call in milliseconds. Default: 10000.
