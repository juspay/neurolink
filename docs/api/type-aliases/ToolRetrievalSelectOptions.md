[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalSelectOptions

# Type Alias: ToolRetrievalSelectOptions

> **ToolRetrievalSelectOptions** = `object`

Options passed to `selectRelevantToolNames()` — the high-level convenience
wrapper around `ToolEmbeddingIndex`.

## Properties

### topK

> **topK**: `number`

Maximum number of tool names to return.

---

### weights?

> `optional` **weights?**: [`ToolRetrievalWeights`](ToolRetrievalWeights.md)

Optional weight override (defaults to `{ cosine: 0.8, bm25: 0.2 }`).

---

### embedFn

> **embedFn**: (`texts`) => `Promise`\<`number`[][]\>

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

Optional shared vector cache (keyed by text string). When supplied the
underlying `ToolEmbeddingIndex` reads from and writes to this Map so that
tool vectors computed on a prior call are reused on subsequent calls for
the same item text. Callers that want warm-cache behavior across turns
should pass the same Map instance each time.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Timeout for each embedding provider call in milliseconds. Default: 10000.
