[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / selectIrrelevantMessages

# Function: selectIrrelevantMessages()

> **selectIrrelevantMessages**(`messages`, `currentRequest`, `decide`, `options?`): `Promise`\<[`ContextRelevanceResult`](../type-aliases/ContextRelevanceResult.md) \| `null`\>

Defined in: [context/contextDecision.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/context/contextDecision.ts#L104)

Ask which earlier messages the current request still needs, and return the
ones to drop.

Returns `null` when nothing should change — no decision provider, a failed
call, nothing eligible, or no confident drop. A null return is the signal
to carry on with positional compaction exactly as before.

## Parameters

### messages

[`ChatMessage`](../type-aliases/ChatMessage.md)[]

### currentRequest

`string`

### decide

[`DecisionCallerFn`](../type-aliases/DecisionCallerFn.md)

### options?

[`ContextRelevanceOptions`](../type-aliases/ContextRelevanceOptions.md)

## Returns

`Promise`\<[`ContextRelevanceResult`](../type-aliases/ContextRelevanceResult.md) \| `null`\>
