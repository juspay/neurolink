[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopReclaimResult

# Type Alias: AgenticLoopReclaimResult\<TConversation\>

> **AgenticLoopReclaimResult**\<`TConversation`\> = `object`

## Type Parameters

### TConversation

`TConversation`

## Properties

### conversation?

> `optional` **conversation?**: `TConversation`

---

### stop?

> `optional` **stop?**: `boolean`

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
