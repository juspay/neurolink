[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopReclaimResult

# Type Alias: AgenticLoopReclaimResult\<TConversation\>

> **AgenticLoopReclaimResult**\<`TConversation`\> = `object`

Defined in: [types/loopEngine.ts:86](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L86)

## Type Parameters

### TConversation

`TConversation`

## Properties

### conversation?

> `optional` **conversation?**: `TConversation`

Defined in: [types/loopEngine.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L87)

---

### stop?

> `optional` **stop?**: `boolean`

Defined in: [types/loopEngine.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L103)

End the turn now, BEFORE this step's request is issued.

A context guard does two things, and only one of them is "reclaim". When
dropping old exchanges buys enough room the turn continues; when it does
not, the guard has to stop rather than step into a provider rejection
that would lose every completed step. Nothing else can express that: the
hook returns a conversation, and an adapter cannot break the engine's
loop.

Aborting the caller's own signal from inside this hook does NOT work as a
substitute — the engine checks for an abort at the TOP of the step, above
this call, so the request would still be issued and the stop would not
take effect until the following step.
