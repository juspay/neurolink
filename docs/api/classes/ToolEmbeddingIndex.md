[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolEmbeddingIndex

# Class: ToolEmbeddingIndex

Defined in: [core/toolRoutingEmbedding.ts:236](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/core/toolRoutingEmbedding.ts#L236)

An in-process index that ranks tool catalog items by hybrid semantic +
lexical relevance to a query.

Embedding vectors for tool descriptions are computed lazily on the first
`rank()` call and cached by description text, so subsequent turns that
share the same catalog pay only the cost of embedding the query itself.

### Fail-safe

Any error thrown by `embedFn` propagates out of `rank()`. The CALLER must
catch it and degrade to the LLM-router path; `ToolEmbeddingIndex` itself
never silently swallows embedFn errors.

### Thread-safety

The internal cache is a plain `Map`. Node.js is single-threaded so there
are no data races, but if the same index instance is used concurrently
(e.g. two turns in parallel) both calls will race to populate the cache;
the last writer wins (same content either way because `embedFn` is
deterministic for a given text).

## Constructors

### Constructor

> **new ToolEmbeddingIndex**(`items`, `embedFn`, `sharedVectorCache?`): `ToolEmbeddingIndex`

Defined in: [core/toolRoutingEmbedding.ts:251](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/core/toolRoutingEmbedding.ts#L251)

#### Parameters

##### items

[`ToolRetrievalItem`](../type-aliases/ToolRetrievalItem.md)[]

##### embedFn

(`texts`) => `Promise`\<`number`[][]\>

##### sharedVectorCache?

`Map`\<`string`, `number`[]\>

Optional shared vector cache. When supplied, cached vectors from
previous turns are reused and any newly-computed vectors are stored
into this same Map, making it warm for the next call.

#### Returns

`ToolEmbeddingIndex`

## Methods

### rank()

> **rank**(`query`, `opts`): `Promise`\<[`ToolRetrievalRankedResult`](../type-aliases/ToolRetrievalRankedResult.md)[]\>

Defined in: [core/toolRoutingEmbedding.ts:272](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/core/toolRoutingEmbedding.ts#L272)

Returns the top-K catalog items ranked by hybrid score descending.

#### Parameters

##### query

`string`

##### opts

###### topK

`number`

###### weights?

[`ToolRetrievalWeights`](../type-aliases/ToolRetrievalWeights.md)

###### timeoutMs?

`number`

#### Returns

`Promise`\<[`ToolRetrievalRankedResult`](../type-aliases/ToolRetrievalRankedResult.md)[]\>

#### Throws

If `embedFn` throws — propagated verbatim so the caller can fail
open. No wrapping, no swallowing.
