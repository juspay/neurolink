[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiToolExecutionGuards

# Type Alias: GeminiToolExecutionGuards

> **GeminiToolExecutionGuards** = `object`

Defined in: [types/loopEngine.ts:365](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L365)

The three things a native Gemini loop wraps around every tool call that the
shared engine does not do itself.

All optional, and the whole object is optional, because the two Gemini
providers differ here: Vertex bounds tool execution and runs a stall
watchdog, AI Studio does neither. Passing nothing leaves an executor exactly
as the caller supplied it, so this cannot quietly give AI Studio behaviour
its hand-rolled loops never had.

## Properties

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number`

Defined in: [types/loopEngine.ts:367](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L367)

Upper bound on a single execute(); omit for no bound.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/loopEngine.ts:372](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L372)

Turn-level abort, raced against the call so a deadline or caller cancel is
observed immediately instead of after the tool settles.

---

### onProgress?

> `optional` **onProgress?**: () => `void`

Defined in: [types/loopEngine.ts:378](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L378)

Stall-watchdog ping, called either side of the await. The watchdog is a
whole-turn interval measuring wall-clock since the last mark, so a
legitimately slow tool reads as a stalled turn without this.

#### Returns

`void`

---

### withToolSpan?

> `optional` **withToolSpan?**: \<`T`\>(`name`, `run`) => `Promise`\<`T`\>

Defined in: [types/loopEngine.ts:393](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L393)

Wrap one tool call in the provider's own observability.

A function rather than a pair of start/end callbacks, because the caller
needs the execution to happen INSIDE its span's context — spans opened by
the tool itself must nest under the tool call, not dangle as siblings of
the turn. Handing over the whole invocation is the only shape that lets a
caller do `context.with(span, run)`.

The caller awaits `run()` itself, so it sees the settled result and can
mark a FAILURE THAT WAS RETURNED rather than thrown: MCP tools report
errors in their payload, and an observation that only watches for
exceptions records those calls as successful.

#### Type Parameters

##### T

`T`

#### Parameters

##### name

`string`

##### run

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>
