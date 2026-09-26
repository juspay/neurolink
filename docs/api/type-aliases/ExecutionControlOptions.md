[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExecutionControlOptions

# Type Alias: ExecutionControlOptions

> **ExecutionControlOptions** = `object`

Defined in: [types/stream.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L306)

Opt-in execution policy for one streamed turn. Supported only on the native
Anthropic stream path today; any other provider REJECTS it rather than
ignoring it, because silently dropping a policy the caller set is how a turn
ends at a limit its owner believed it had removed.

Absent, none of the turn-level policy here applies: the turn is bounded by
`timeout` / `turnTimeoutMs` / `maxSteps` as it always was.

One thing is NOT conditional on this option, and it is worth stating because
it changed: the agentic engine bounds every tool call, at
`toolTimeoutMs` or the 300s default, whether or not `executionControl` is
present. Loops that previously ran tools with no per-tool timer at all — the
Bedrock and Google AI Studio paths — therefore acquired one. A caller that
relied on unbounded tool execution says so with `toolTimeoutMs: null`, which
restores exactly the old behaviour.

## Properties

### requestTimeoutMs

> **requestTimeoutMs**: `number`

Defined in: [types/stream.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L315)

Hard deadline for a single HTTP request (ms). Required, finite, positive.

This is the floor that makes the rest of the contract safe: whatever the
turn-level policy is — including no lifetime ceiling at all — a stalled
upstream is always caught here, with the timer's own identity on the
error. A step boundary cannot reset a deadline already running.

---

### lifetimeTimeoutMs?

> `optional` **lifetimeTimeoutMs?**: `number` \| `null`

Defined in: [types/stream.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L335)

The turn's wall-clock ceiling (ms).

- `null` — no lifetime timer is armed at all. This is the case that cannot
  be expressed any other way: a very large number is still a ceiling, and
  it fires eventually, in the middle of work, dressed as a cancel. With no
  lifetime timer the per-tool deadline is the turn's last bound, so
  `toolTimeoutMs: null` is refused alongside it.
- a finite positive number — an explicit cap, reported as `time-limit`.
- `0`, negative, or non-finite — rejected.
- absent — the legacy handling (`turnTimeoutMs`, else the provider
  timeout) is inherited untouched.

Set to anything other than absent, this OWNS the turn's lifetime timer, so
a `turnTimeoutMs` on the same request would be read by nothing. That
combination is rejected rather than silently resolved — set one or the
other. Note that "absent" means the property is not there AND that it is
present holding `undefined`: both say "no opinion", and both inherit.

---

### beforeStep?

> `optional` **beforeStep?**: (`context`) => [`ExecutionControlDecision`](ExecutionControlDecision.md) \| `undefined` \| `Promise`\<[`ExecutionControlDecision`](ExecutionControlDecision.md) \| `undefined`\>

Defined in: [types/stream.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L342)

Runs at each step boundary. May renew the step cap and append a planning
nudge. It is itself bounded by `beforeStepTimeoutMs` and cancelled with
the turn; a callback that throws, or outlives its budget, is treated as
declining to renew.

#### Parameters

##### context

[`ExecutionControlStepContext`](ExecutionControlStepContext.md)

#### Returns

[`ExecutionControlDecision`](ExecutionControlDecision.md) \| `undefined` \| `Promise`\<[`ExecutionControlDecision`](ExecutionControlDecision.md) \| `undefined`\>

---

### beforeStepTimeoutMs?

> `optional` **beforeStepTimeoutMs?**: `number`

Defined in: [types/stream.ts:353](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L353)

Bound on `beforeStep` itself (ms, finite and positive; default 30_000).
A boundary callback sits between two model calls, so an unbounded one
stalls the turn in a place no other timer is watching.
