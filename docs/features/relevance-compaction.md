# Relevance-driven compaction

Every stage of context compaction has always been positional: pruning
protects the most recent tokens, truncation drops the oldest half,
summarization keeps a trailing ratio. None of that has any notion of what the
current request is actually about, so a fifty-turn conversation that ends
with "now rename that variable" keeps forty turns about database migrations
and drops nothing that matters less. Stage 0 asks a
[decision model](/docs/features/decide-inference-type) directly: "is this
message needed to answer the current request?" — once per eligible message,
in a single batched round trip.

**The degradation contract.** Stage 0 runs only when a `decide` function is
wired in **and** the caller supplied `currentRequest` **and** the
conversation is already over its token budget. Any one of those missing, and
compaction proceeds exactly as it did before Stage 0 existed — Stages 1
through 4 (pruning, dedup, summarization, truncation) are unchanged.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const nl = new NeuroLink();

await nl.generate({
  input: { text: "Now rename that variable to `userId` everywhere." },
  context: {
    currentRequest: "Now rename that variable to `userId` everywhere.",
  },
});
```

`currentRequest` is wired automatically from the active prompt on every
internal call site that constructs `ContextCompactorDeps` — this example
shows the field that has to be present, not something most callers pass by
hand.

## What is eligible to drop

A message is eligible only if losing it cannot corrupt the request, which
rules out far more than it keeps:

- role must be `user` or `assistant` — tool calls, tool results and system
  messages are never eligible, because dropping half of a tool-call pair
  produces a malformed request rather than a smaller one
- content must be non-empty text
- a message already marked `metadata.isSummary` is skipped — it already
  represents messages that were dropped, so dropping it discards all of them
  at once
- a pinned skill message (`metadata.isSkill`) is skipped — it's replayed
  verbatim by design and already protected from truncation elsewhere
- a message carrying `tool`, `toolCallId`, or `events` is skipped, for the
  same tool-call-pairing reason as above
- a truncation marker or condensed-parent placeholder is skipped

On top of that, the most recent messages are **never** eligible regardless of
what the model says — `protectRecent` defaults to the last **6** messages.

## Dropped only on a confident no

For each eligible message, the question is a plain boolean:

> This earlier message contains information the assistant still needs in
> order to answer the current request correctly. Treat it as needed if it
> states a requirement, a decision, a constraint, a correction, a name, a
> number, or a preference that the current request builds on. Treat it as
> not needed if the current request is about something else entirely, or if
> the message is small talk, an acknowledgement, or superseded by a later
> message.

A message is dropped only when the answer is a confident `false` —
`minDropConfidence` defaults to **0.6**, the same bar
[tool routing](/docs/features/tool-routing-decision-model) uses and for the
same reason: keeping a useless message costs a few tokens, losing a needed
one costs the answer. An unanswered question, a malformed answer, or a
near-coin-flip verdict all keep the message.

## The drop cap, and which messages it protects

At most `maxDropRatio` (default **0.5**) of the _eligible_ messages may be
removed in one pass. When more than that are confidently flagged, the
implementation keeps the ones nearest the current turn and drops the older
confident flags first — the newest confident "not needed" verdicts are the
ones spared when the cap binds, consistent with every other stage's
assumption that recency correlates with relevance. Past this ratio, the
model is more likely to have misread the request than to be right about most
of the conversation, and positional truncation (Stage 4) is the safer tool
for a wholesale reduction.

Two more bounds keep the request itself small: at most **300** messages are
ever asked about in one batch (`MAX_QUESTIONS`), and each message's text is
truncated to **1200** characters before being sent as state.

## The summary-quality gate

A second, independent gate sits on Stage 3 (LLM summarization). Before a
generated summary replaces the messages it covers, it is checked against two
questions over the original messages: does the summary preserve every
decision, requirement, constraint, correction and open question, and is the
summary actually a summary — not a refusal, an apology, an error message, or
a request for clarification.

**This gate fails open**, and deliberately in the opposite direction from
Stage 0's drop gate: an unanswered question, a failed call, or no decision
provider all **accept** the summary, because rejecting it means falling
through to plain truncation — which loses strictly more than a slightly
imperfect summary would. The summary is rejected only on a confident (0.6+)
`is_refusal: true`, or a confident `preserves: false`.

## What this is bad at

- **It only ever removes whole messages.** There's no notion of "keep the
  decision in this message but drop the small talk around it" — the
  eligibility and drop questions operate at message granularity, so a long
  message that is 90% irrelevant and 10% load-bearing is kept whole or
  dropped whole.
- **A confident model can still be confidently wrong.** Calibration bounds
  the fraction of high-confidence answers that are wrong across many
  requests — it says nothing about any one verdict. The 0.6 bar and the
  6-message recency floor exist because of this, not instead of it.
- **It cannot see relevance created later in the same conversation.** The
  question is asked against the current request only; a message dropped now
  because it looked irrelevant to this turn cannot be un-dropped if a later
  turn needed it after all.
- **It shares the base model's general limits** — literal reading, no
  arithmetic, and degraded accuracy under a very long or noisy state — all
  described in
  [what `decide` is bad at](/docs/features/decide-inference-type#what-it-is-bad-at).
- **It only runs when already over budget.** Stage 0 is not a standing
  filter on every request; a conversation under its token budget is left
  completely untouched, however irrelevant its history might be.

## See also

- [The `decide` inference type](/docs/features/decide-inference-type)
- [Per-request context budget](/docs/features/context-budget)
- [Tool / MCP routing by decision model](/docs/features/tool-routing-decision-model)
