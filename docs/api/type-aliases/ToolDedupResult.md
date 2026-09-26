[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDedupResult

# Type Alias: ToolDedupResult\<T\>

> **ToolDedupResult**\<`T`\> = `object`

Return type of `dedupeTools()`.

## Type Parameters

### T

`T` _extends_ `Record`\<`string`, `unknown`\>

## Properties

### tools

> **tools**: `T`

Deduplicated tool set (or original set when dedup is disabled/errored).

---

### removed

> **removed**: [`ToolDedupRemoved`](ToolDedupRemoved.md)[]

Tools that were removed along with the reason. Empty when dedup is off.
