[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalSelectOptions

# Type Alias: ToolRetrievalSelectOptions

> **ToolRetrievalSelectOptions** = `object`

Defined in: [types/toolRouting.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L385)

Options passed to `selectRelevantToolNames()` — the high-level convenience
wrapper around `ToolEmbeddingIndex`.

## Properties

### topK

> **topK**: `number`

Defined in: [types/toolRouting.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L387)

Maximum number of tool names to return.

---

### weights?

> `optional` **weights?**: [`ToolRetrievalWeights`](ToolRetrievalWeights.md)

Defined in: [types/toolRouting.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L389)

Optional weight override (defaults to `{ cosine: 0.8, bm25: 0.2 }`).

---

### embedFn

> **embedFn**: (`texts`) => `Promise`\<`number`[][]\>

Defined in: [types/toolRouting.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L395)

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

Defined in: [types/toolRouting.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L403)

Optional shared vector cache (keyed by text string). When supplied the
underlying `ToolEmbeddingIndex` reads from and writes to this Map so that
tool vectors computed on a prior call are reused on subsequent calls for
the same item text. Callers that want warm-cache behavior across turns
should pass the same Map instance each time.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/toolRouting.ts:407](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L407)

Timeout for each embedding provider call in milliseconds. Default: 10000.
