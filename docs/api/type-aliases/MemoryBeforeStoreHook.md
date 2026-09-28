[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryBeforeStoreHook

# Type Alias: MemoryBeforeStoreHook

> **MemoryBeforeStoreHook** = (`content`, `turn`) => `string` \| `null` \| `Promise`\<`string` \| `null`\>

Transform (or veto) the exact text handed to `Hippocampus.add()`. Receives
the default `"User: …\nAssistant: …"` rendering; return a replacement
string, or `null` to skip the write. A thrown error is logged and the
write is skipped — a missed memory is recoverable, a polluted condensed
summary is not.

## Parameters

### content

`string`

### turn

[`MemoryTurn`](MemoryTurn.md)

## Returns

`string` \| `null` \| `Promise`\<`string` \| `null`\>
