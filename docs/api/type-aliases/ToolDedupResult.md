[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDedupResult

# Type Alias: ToolDedupResult\<T\>

> **ToolDedupResult**\<`T`\> = `object`

Defined in: [types/toolDedup.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolDedup.ts#L44)

Return type of `dedupeTools()`.

## Type Parameters

### T

`T` _extends_ `Record`\<`string`, `unknown`\>

## Properties

### tools

> **tools**: `T`

Defined in: [types/toolDedup.ts:46](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolDedup.ts#L46)

Deduplicated tool set (or original set when dedup is disabled/errored).

---

### removed

> **removed**: [`ToolDedupRemoved`](ToolDedupRemoved.md)[]

Defined in: [types/toolDedup.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolDedup.ts#L48)

Tools that were removed along with the reason. Empty when dedup is off.
