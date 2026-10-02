[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryShouldWriteHook

# Type Alias: MemoryShouldWriteHook

> **MemoryShouldWriteHook** = (`turn`) => `boolean` \| `Promise`\<`boolean`\>

Gate that decides whether a turn is written to memory at all. Runs inside
the deferred background write, never on the response path. Returning
`false` skips every `add()` for the turn (primary owner and
`additionalUsers`). A thrown error is logged and treated as `false`.

## Parameters

### turn

[`MemoryTurn`](MemoryTurn.md)

## Returns

`boolean` \| `Promise`\<`boolean`\>
