[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopOptions

# Type Alias: AgenticLoopOptions

> **AgenticLoopOptions** = `object`

## Properties

### tools?

> `optional` **tools?**: `Record`\<`string`, \{ `execute?`: (`args`, `opts`) => `Promise`\<`unknown`\>; \}\>

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

---

### span?

> `optional` **span?**: `Span`

Span the per-step provider retry annotates, via
`withProviderRetry(..., span, ...)` — it records
`gen_ai.provider.total_attempts` on every completed step, retried or not.

Caller-supplied rather than read from the ambient context inside the
engine. Reading it here would hand the attribute to every provider on the
engine, including ones whose hand-rolled loops never emitted it, and a
refactor that silently ADDS observable behaviour is the same defect as one
that silently drops it. Today only the direct Anthropic loops set this,
because only they threaded a span before moving onto the engine.

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Upper bound on a single `tool.execute()` (ms), or `null` for no bound.
Defaults to `DEFAULT_TOOL_EXECUTION_TIMEOUT_MS` (300_000) when omitted.

The turn-level timers do not cover this: a per-request deadline bounds one
model call and is disposed when the step settles, and the step cap only
advances when a step completes. Between two steps, a tool that never
returns has nothing watching it, and a turn that opted out of a lifetime
ceiling then hangs forever. A tool that exceeds the bound is told to stop
— the signal it was handed is aborted — and fails with an error tool
result costing one step, exactly as it does on the native generate path.

`null` restores the behaviour of a loop with no per-tool timer at all:
`execute` is awaited unguarded, with the turn's own signal. Callers that
relied on unbounded tool execution say so with it. The one combination
refused is `null` together with `executionControl.lifetimeTimeoutMs: null`
— that would leave the turn with no bound anywhere.

Callers that already guard their executors (Vertex and the Gemini
adapters, via `guardToolExecutor`) should pass the SAME value they gave
those guards, so this backstop can never be tighter than what the caller
asked for.

---

### beforeStep?

> `optional` **beforeStep?**: (`context`) => `Promise`\<[`ExecutionControlDecision`](ExecutionControlDecision.md) \| `undefined`\>

Step-boundary callback. Runs after a step's tool results have settled and
been written into the conversation, and BEFORE the loop re-checks the step
cap — the one point in a turn where raising the cap changes what happens
next without replaying anything that already happened.

Already bounded and cancellable by the time it reaches the engine: the
caller owns the callback's own budget, because the caller is what the
public option was validated against. The engine only calls it, applies a
strictly-larger finite cap if one comes back, and asks the adapter to
write the nudge. It never restarts a step, retries a request, or replays a
tool.

#### Parameters

##### context

[`ExecutionControlStepContext`](ExecutionControlStepContext.md)

#### Returns

`Promise`\<[`ExecutionControlDecision`](ExecutionControlDecision.md) \| `undefined`\>
