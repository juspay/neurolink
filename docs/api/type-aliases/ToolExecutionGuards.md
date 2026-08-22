[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionGuards

# Type Alias: ToolExecutionGuards

> **ToolExecutionGuards** = `object`

Defined in: [types/loopEngine.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L371)

The things a native loop wraps around every tool call that the shared engine
does not do itself.

NOT Gemini-specific, despite where this started. Both Vertex+Claude loops
apply these guards directly via `guardToolExecutor`, and the Gemini adapter
applies them to hydrated tools, so the former `GeminiToolExecutionGuards`
name described the first caller rather than the contract — and pointed the
next reader at the wrong provider family.

All optional, and the whole object is optional, because callers differ:
Vertex bounds tool execution and runs a stall watchdog, AI Studio does
neither. Passing nothing leaves an executor exactly as the caller supplied
it, so this cannot quietly give a provider behaviour its hand-rolled loops
never had.

## Properties

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number`

Defined in: [types/loopEngine.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L373)

Upper bound on a single execute(); omit for no bound.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/loopEngine.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L378)

Turn-level abort, raced against the call so a deadline or caller cancel is
observed immediately instead of after the tool settles.

---

### onProgress?

> `optional` **onProgress?**: () => `void`

Defined in: [types/loopEngine.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L384)

Stall-watchdog ping, called either side of the await. The watchdog is a
whole-turn interval measuring wall-clock since the last mark, so a
legitimately slow tool reads as a stalled turn without this.

#### Returns

`void`

---

### withToolSpan?

> `optional` **withToolSpan?**: \<`T`\>(`name`, `run`) => `Promise`\<`T`\>

Defined in: [types/loopEngine.ts:399](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L399)

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
