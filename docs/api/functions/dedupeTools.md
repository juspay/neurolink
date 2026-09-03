[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / dedupeTools

# Function: dedupeTools()

> **dedupeTools**\<`T`\>(`tools`, `options`): [`ToolDedupResult`](../type-aliases/ToolDedupResult.md)\<`Record`\<`string`, `T`\>\>

Defined in: [core/toolDedup.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolDedup.ts#L157)

Collapse near-duplicate tools in a name→Tool record.

When `options.enabled` is falsy (the default), returns the original record
and an empty `removed` array — byte-for-byte unchanged behaviour.

When enabled, tools whose token-set Jaccard similarity (over their canonical
signatures) meets or exceeds `options.threshold` (default 0.9) are collapsed
to a single representative (the first in stable iteration order).

Any exception thrown internally returns the ORIGINAL tool set (fail-open).

## Type Parameters

### T

`T` _extends_ [`Tool`](../type-aliases/Tool.md)

## Parameters

### tools

`Record`\<`string`, `T`\>

### options

[`ToolDedupConfig`](../type-aliases/ToolDedupConfig.md)

## Returns

[`ToolDedupResult`](../type-aliases/ToolDedupResult.md)\<`Record`\<`string`, `T`\>\>
