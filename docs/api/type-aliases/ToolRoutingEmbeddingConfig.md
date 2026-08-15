[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingEmbeddingConfig

# Type Alias: ToolRoutingEmbeddingConfig

> **ToolRoutingEmbeddingConfig** = `object`

Defined in: [types/toolRouting.ts:70](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L70)

Configuration for the L2 embedding fast-path (ITEM B).

When enabled and the catalog's total tool count reaches `minToolsToActivate`,
a hybrid cosine + BM25 retriever ranks all tools by relevance to the query
and takes the top-`topK` candidates. This is far cheaper than an LLM call
(sub-10 ms warm) and fires BEFORE or INSTEAD of the LLM router.

Fail-open: any embedding error (missing provider, network failure, wrong
model) silently falls back to the existing LLM-router / server-granularity
path — the turn is never broken.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/toolRouting.ts:77](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L77)

Activate the embedding fast-path. Default: false (backward-compatible).
Setting this to true without supplying `provider`/`model` causes the SDK
to try the stream call's configured provider; if that provider does not
support embeddings the layer fails open.

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/toolRouting.ts:82](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L82)

Maximum number of top-ranked tool candidates passed to the post-embedding
decision stage. Default: 20.

---

### minToolsToActivate?

> `optional` **minToolsToActivate?**: `number`

Defined in: [types/toolRouting.ts:88](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L88)

Minimum total tool count in the catalog before the embedding path
activates. Below this threshold the catalog is small enough that the LLM
router alone is cheap and fast. Default: 20.

---

### weights?

> `optional` **weights?**: [`ToolRetrievalWeights`](ToolRetrievalWeights.md)

Defined in: [types/toolRouting.ts:94](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L94)

Weights for the hybrid scoring formula:
score = cosine _ cosineSim + bm25 _ bm25Score (both normalized to [0,1])
Default: `{ cosine: 0.8, bm25: 0.2 }`.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/toolRouting.ts:100](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L100)

Provider name to use for the embedding call (e.g. "openai", "vertex").
Defaults to the stream/generate call's configured provider. The provider
must support `embedMany()`.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/toolRouting.ts:105](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L105)

Embedding model name (provider-specific). When omitted the provider's
default embedding model is used (e.g. text-embedding-3-small for OpenAI).

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/toolRouting.ts:109](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L109)

Timeout for embedding calls in milliseconds. Default: 10000.
