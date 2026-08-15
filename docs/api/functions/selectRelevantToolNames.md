[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / selectRelevantToolNames

# Function: selectRelevantToolNames()

> **selectRelevantToolNames**(`query`, `items`, `opts`): `Promise`\<`string`[]\>

Defined in: [core/toolRoutingEmbedding.ts:382](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/core/toolRoutingEmbedding.ts#L382)

Selects the most relevant tool names from a catalog given a query.

Creates a temporary `ToolEmbeddingIndex`, runs `rank()`, and returns just
the tool names. Use `ToolEmbeddingIndex` directly when you want to reuse
cached tool vectors across multiple queries (e.g. multiple turns with the
same catalog).

## Parameters

### query

`string`

### items

[`ToolRetrievalItem`](../type-aliases/ToolRetrievalItem.md)[]

### opts

[`ToolRetrievalSelectOptions`](../type-aliases/ToolRetrievalSelectOptions.md)

## Returns

`Promise`\<`string`[]\>

## Throws

If `opts.embedFn` throws — propagated so the caller can degrade to
the LLM-router path.

## Example

```ts
const tools = await selectRelevantToolNames(
  "show me yesterday's sales",
  catalog.flatMap((server) =>
    server.toolNames.map((name) => ({
      name,
      text: `${server.description} — ${name}`,
    })),
  ),
  { topK: 5, embedFn: myEmbedFn },
);
// => ["analytics_getSales", "analytics_getRevenue", ...]
```
