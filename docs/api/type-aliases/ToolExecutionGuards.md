[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionGuards

# Type Alias: ToolExecutionGuards

> **ToolExecutionGuards** = `object`

## Properties

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Upper bound on a single execute(). Omit, or pass `null`, for no bound.

`null` is accepted as well as `undefined` because it is what a caller's
own `toolTimeoutMs: null` resolves to, and the two must not diverge: a
value that means "unbounded" at the public surface cannot arrive here
meaning "0ms".

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Turn-level abort, raced against the call so a deadline or caller cancel is
observed immediately instead of after the tool settles.

---

### onProgress?

> `optional` **onProgress?**: () => `void`

Stall-watchdog ping, called either side of the await. The watchdog is a
whole-turn interval measuring wall-clock since the last mark, so a
legitimately slow tool reads as a stalled turn without this.

#### Returns

`void`

---

### withToolSpan?

> `optional` **withToolSpan?**: \<`T`\>(`name`, `run`, `call?`) => `Promise`\<`T`\>

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

`call` carries the arguments the model passed and the model's id for the
call, so the observation can show what was asked and be paired with the
request that asked it.

#### Type Parameters

##### T

`T`

#### Parameters

##### name

`string`

##### run

() => `Promise`\<`T`\>

##### call?

[`ToolSpanCall`](ToolSpanCall.md)

#### Returns

`Promise`\<`T`\>
