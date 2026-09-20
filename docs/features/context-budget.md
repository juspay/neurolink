# Per-request context budget

Context compaction has always triggered at a fixed 80% of the model's window.
That number is now a default, not a constant: a per-request `compactionThreshold`
option lowers it for requests that need less room, and the
[classifier router's](/docs/features/classifier-router) `jev` strategy can fill
it in automatically by asking how much of the conversation the request actually
needs.

**The degradation contract.** Every input here is optional. With no
`compactionThreshold` passed and no classifier router configured, the effective
threshold is exactly `0.8`, exactly as before — `resolveHistoryBudget()`'s
scale factor is `compactionThreshold / 0.8`, so the default value reproduces
the previous budget calculation to the token.

## Setting it directly

```typescript
import { NeuroLink } from "@juspay/neurolink";

const nl = new NeuroLink();

await nl.generate({
  input: { text: "Summarize this one file." },
  compactionThreshold: 0.45, // this request needs very little history
});
```

CLI: `neurolink generate "..." --compaction-threshold 0.45` (existing flag,
`description: "Fraction of the context window (0-1) at which history is
compacted. Default 0.8."`).

## Letting the classifier fill it in

When `classifierRouter.contextBudget` is enabled (default: **true** whenever
the strategy resolves to a decision model; ignored by `heuristic`/`llm`), the
same `jev` request that classifies difficulty also asks a `score` question:

> How much of the earlier conversation does answering this request actually
> require?

against a four-level rubric:

| Scope               | Criterion                                                                                          | Threshold |
| ------------------- | -------------------------------------------------------------------------------------------------- | --------- |
| `current-message`   | Self-contained. Earlier conversation would not change the answer.                                  | 0.45      |
| `recent-turns`      | Needs the last few exchanges — a follow-up, a correction, a reference to something just discussed. | 0.60      |
| `full-conversation` | Needs the whole conversation, including decisions and constraints established much earlier.        | 0.75      |
| `everything`        | Needs the conversation and every document, file and tool result that has been gathered.            | 0.80      |

This is a rubric, not a token count, and deliberately so: a decision model
places a request on an ordered scale reliably and reads digit strings as text,
not quantities — asking "how many tokens does this need" would get an answer
shaped like a guess at a number, not a calibrated judgement.

The reading is used only above `MIN_CONTEXT_SCOPE_CONFIDENCE` (0.5); below
that, `contextScope` is left `undefined` and the request falls back to the
0.8 default exactly as if the question had not been asked. The scope judgement
is independent of the difficulty tier — a trivial request can still need the
whole conversation, and an expert one can be entirely self-contained — so
it is read and applied on its own, and survives every path on which the
difficulty verdict itself is discarded by its confidence bar.

`applyClassifierRouting()` then applies the derived threshold only when the
**caller left `compactionThreshold` unset**:

```ts
if (
  decision.compactionThreshold !== undefined &&
  options.compactionThreshold === undefined
) {
  options.compactionThreshold = decision.compactionThreshold;
}
```

An explicit per-call value always wins. The classifier is filling in a default
you didn't set, never overriding one you did.

## The one-directional invariant

The mapping from scope to threshold **can only ever lower the 0.8 default,
never raise it**, and this is enforced independently at two layers:

1. `contextScopeToThreshold()` clamps its result with `Math.min(0.8, ...)`
   before returning.
2. `ClassifierRouter.selectContextBudget()` re-checks the result and discards
   it unless `threshold < 0.8`.

The reason this is a hard invariant rather than a tuning choice: shrinking a
budget merely compacts a little earlier than strictly necessary — the model
still answers correctly with slightly less history than it could have used.
Growing one lets a request through that the provider then rejects with a
context-window error, and `ModelPool` treats that as a **permanent (10-year)
cooldown** — one optimistic guess retires the model for the life of the
process. Getting this wrong in one direction is recoverable; getting it wrong
in the other is not, so the code refuses to let a bug make that mistake even
once.

## How the threshold changes the actual budget

`resolveHistoryBudget()` is what the compactor targets — the model's available
input space minus system prompt, current prompt, tool definitions and file
attachments, all of which ride alongside history rather than being part of
it. The per-request threshold scales that budget directly:

```ts
const scale = Math.max(
  0,
  Math.min(1, compactionThreshold / DEFAULT_COMPACTION_THRESHOLD),
);
const factor = HISTORY_BUDGET_SAFETY_FACTOR * scale; // 0.95 * scale
```

With the default `0.8`, `scale` is exactly `1` and the budget is unchanged
from before this option existed. A `0.4` threshold halves the history budget.
The `0.95` safety factor is unrelated to this feature — it exists because
token estimation is character-based and approximate, so the compactor always
aims slightly under the true ceiling.

## What this is bad at

- **It is a suggestion, not a measurement.** The rubric asks "how much would
  a human say this needs," not "how many tokens will this actually consume."
  A request correctly judged `recent-turns` can still occasionally need one
  detail from much earlier — the invariant above is what keeps that failure
  mode cheap (a slightly early compaction) rather than catastrophic.
- **One judgement per request, not per turn of the conversation that follows.**
  If the classifier runs once per turn (which it does), the scope can change
  turn to turn, but there's no persistence of "this whole session is a
  `current-message` session" — a caller who wants that stability should pass
  `compactionThreshold` explicitly rather than rely on `auto`.
- **It shares the base model's limits.** Everything in
  [what `decide` is bad at](/docs/features/decide-inference-type#what-it-is-bad-at)
  applies — including that irrelevant state costs accuracy, so a very long
  prompt slice can degrade the scope reading itself.
- **No feedback loop.** If the classifier's `current-message` guess turns out
  wrong and the model asks a follow-up that needed history you already
  dropped, nothing here recovers that turn; the invariant only bounds the
  cost of the guess, it doesn't undo it.

## See also

- [Model routing with a decision model](/docs/features/classifier-router-jev-strategy)
- [Relevance-driven compaction](/docs/features/relevance-compaction)
- [The `decide` inference type](/docs/features/decide-inference-type)
