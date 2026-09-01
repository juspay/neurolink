# Turn Time Budget

Turn-lifecycle limits for agentic (multi-step tool-calling) turns, enforced
inside NeuroLink's native Vertex loops (Gemini and Claude-on-Vertex, both
`generate()` and `stream()`). NeuroLink sees every model call, every tool
start/finish, and every stream chunk — so it is the layer that can tell a
productive long turn from a wedged one, and end each with an honest message
and a machine-readable reason.

## Options

All four options ride `generate()` / `stream()` alongside `maxSteps` and the
per-model-call `timeout`:

| Option             | Meaning                                                                                                     | Default                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `turnTimeoutMs`    | Hard wall-clock cap for the WHOLE agentic turn (all model calls + tool executions)                          | see "Defensive defaults" below        |
| `stallTimeoutMs`   | Max time with **no progress** (no stream chunk, no tool start/finish, no step start) before the turn ends   | disabled                              |
| `wrapupTimeLeadMs` | With less than this much turn time remaining, a wrap-up nudge rides the next tool-result turn               | `120_000` when `turnTimeoutMs` is set |
| `toolTimeoutMs`    | Per-tool-execution timeout; a timed-out tool fails **that step** (error tool_result) and the turn continues | `300_000`                             |

```typescript
const result = await neurolink.generate({
  input: { text: "Investigate the amount mismatch across services" },
  provider: "vertex",
  maxSteps: 50,
  turnTimeoutMs: 1_800_000, // 30 min whole-turn budget
  stallTimeoutMs: 300_000, // no progress for 5 min => end the turn
  toolTimeoutMs: 300_000, // a wedged tool costs one step, not the turn
});
```

### `turnTimeoutMs` vs `timeout` on the AI-SDK loop path

On the AI-SDK loop path (direct Anthropic, litellm, OpenAI-compatible), an
explicit `turnTimeoutMs` owns the whole-turn hard abort, and `timeout` keeps
its per-model-call meaning. Historically `timeout` alone bounded the ENTIRE
multi-step loop there, so `{ timeout: 300_000, turnTimeoutMs: 2_400_000 }`
killed a 40-minute turn at 5 minutes flat — surfacing as the provider SDK's
generic cancel (`Request was aborted.`) mid-loop. When the hard cap does
fire, the error now carries the timer's own identity (`… timed out after …`)
instead of that generic cancel shape.

### Defensive defaults

When `turnTimeoutMs` is **unset**, each loop keeps its pre-existing behavior:

- **Vertex Gemini (generate + stream)** and **Vertex Claude stream**: the
  defensive whole-turn bound of `timeout ?? 300_000` ms still applies (a turn
  must never hang forever) — but its firing is now labeled honestly as a
  time-limit exit instead of masquerading as a step-cap exit.
- **Vertex Claude generate**: historically had no whole-turn bound (only the
  per-call `timeout`), and still has none — long multi-step turns keep
  running. Set `turnTimeoutMs` explicitly to bound them.

## `stopReason` — the turn-exit discriminator

`finishReason` is provider-shaped and historically overloaded ("tool-calls"
covered both step-cap exits and Gemini `MALFORMED_FUNCTION_CALL` failures).
Branch on `result.stopReason` instead:

| `stopReason`     | Meaning                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `completed`      | The model finished on its own (text answer or `final_result`)      |
| `step-cap`       | The `maxSteps` budget ran out while the model still wanted tools   |
| `time-limit`     | The `turnTimeoutMs` (or defensive) wall-clock deadline passed      |
| `stalled`        | No progress for `stallTimeoutMs`                                   |
| `aborted`        | The caller's `abortSignal` ended the turn                          |
| `provider-error` | Provider/model failure (e.g. persistent `MALFORMED_FUNCTION_CALL`) |

Also on the result: `rawFinishReason` (the verbatim provider value, e.g.
`MALFORMED_FUNCTION_CALL`, `max_tokens`) and `stepsUsed`. On `stream()`
results, read `metadata.stopReason` / `metadata.rawFinishReason` /
`metadata.stepsUsed` **after draining the stream** — background loops resolve
them at close, and metadata is the mutable reference that survives wrapper
spreads.

Providers without a native loop leave `stopReason` undefined — keep any
legacy `finishReason` heuristics as a fallback.

## Honest terminal messages

Each exit cause has its own user-facing message; the step-cap text
("...reached the N-step limit...") is emitted **only** when `step >= maxSteps`
genuinely terminated the loop:

- time-limit: _"I had to stop after Xm Ys — this turn hit its processing time
  limit. I completed N tool calls before stopping; ask me to continue and
  I'll pick up from there."_
- stalled: _"I had to stop because this turn made no progress for Xs — a tool
  or model call appears to be stuck. ..."_
- aborted: _"This turn was stopped before I could finish. ..."_

## MALFORMED_FUNCTION_CALL handling

Gemini's `MALFORMED_FUNCTION_CALL` / `UNEXPECTED_TOOL_CALL` finish reasons
map to unified `finishReason: "error"` (never `"tool-calls"`). A
`MALFORMED_FUNCTION_CALL` step is retried **once** with a corrective note;
if it persists, the turn ends with `stopReason: "provider-error"` — usually
worth a caller-side retry.

## Telemetry

- `result.analytics` (when `enableAnalytics` is on) carries `stepsUsed`,
  `toolCallCount`, `stopReason`, `elapsedMs`, `rawFinishReason`.
- The SDK emitter fires `turn:lifecycle` events (alongside
  `tool:start`/`tool:end`) for non-completed exits, tool timeouts, and
  malformed-call retries:

```typescript
neurolink.getEventEmitter().on("turn:lifecycle", (event) => {
  // { provider, timestamp, phase: "time-limit" | "stalled" | "aborted" |
  //   "step-cap" | "provider-error" | "tool-timeout" | "malformed-retry",
  //   step?, maxSteps?, toolName?, toolCallCount?, elapsedMs? }
});
```
