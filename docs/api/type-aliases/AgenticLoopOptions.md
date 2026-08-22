[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopOptions

# Type Alias: AgenticLoopOptions

> **AgenticLoopOptions** = `object`

Defined in: [types/loopEngine.ts:562](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L562)

## Properties

### tools?

> `optional` **tools?**: `Record`\<`string`, \{ `execute?`: (`args`, `opts`) => `Promise`\<`unknown`\>; \}\>

Defined in: [types/loopEngine.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L563)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/loopEngine.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L572)

---

### span?

> `optional` **span?**: `Span`

Defined in: [types/loopEngine.ts:585](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L585)

Span the per-step provider retry annotates, via
`withProviderRetry(..., span, ...)` — it records
`gen_ai.provider.total_attempts` on every completed step, retried or not.

Caller-supplied rather than read from the ambient context inside the
engine. Reading it here would hand the attribute to every provider on the
engine, including ones whose hand-rolled loops never emitted it, and a
refactor that silently ADDS observable behaviour is the same defect as one
that silently drops it. Today only the direct Anthropic loops set this,
because only they threaded a span before moving onto the engine.
