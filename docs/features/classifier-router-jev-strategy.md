# Model routing with a decision model

The [classifier router](/docs/features/classifier-router) has a `jev` strategy: one
[decision-model](/docs/features/decide-inference-type) round trip answers difficulty,
required capabilities, risk **and** the model pick simultaneously, with a
calibrated confidence on each. This page is the strategy's own mechanics —
`classifier-router.md` covers the router as a whole.

**The degradation contract.** With no decision provider configured,
`resolveStrategy()` resolves `auto` to `heuristic`, exactly as it always did.
`classifyJev()` itself never throws: any failure, timeout, or malformed answer
falls back to `classifyHeuristic()`. Setting `TYPESAFE_API_KEY` (or
`AI_GATEWAY_API_KEY`) upgrades routing; it cannot make routing worse than before
the key existed.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const nl = new NeuroLink({
  classifierRouter: {
    enabled: true,
    classifier: "auto", // jev once a decision provider is configured
    pool: [
      { provider: "vertex", model: "gemini-2.5-flash" },
      { provider: "vertex", model: "gemini-2.5-pro" },
    ],
  },
});
```

## What goes into the state

`classifyJev()` sends the request truncated to 8000 characters, plus four
signals the caller already has on hand:

```json
{
  "request": "...",
  "estimated_input_tokens": 412,
  "has_tools_available": true,
  "request_includes_images": false,
  "caller_requested_thinking": "none"
}
```

Alongside it, one batch asks: `difficulty` (a `choice` over the five tiers),
`needs_vision` / `needs_tools` / `needs_reasoning` (`boolean`), `risky`
(`boolean`), `context` (a `score` — see
[per-request context budget](/docs/features/context-budget)), and, only when the
pool has more than one member, `model` (a `choice` over the pool, rendered by
[the catalogue](/docs/features/classifier-router-catalog)). All of this rides in
one ~400ms request, because latency is flat in question count — see
[the batching rule](/docs/features/decide-inference-type#the-one-rule-batch-never-fan-out).

## The difficulty rubric

Five tiers, ordered easiest to hardest, worded about the shape of the work —
the model is never told a provider or model name:

| Tier       | Criterion                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trivial`  | Mechanical and local: rename a symbol, fix a typo, add an import, run one named command, or answer something already stated.                          |
| `simple`   | A small localised change or a direct factual answer. One file, one obvious approach.                                                                  |
| `moderate` | Ordinary engineering: implement a well-specified change across a few files, write tests, fix a clearly described bug, review a small diff.            |
| `hard`     | Deep reasoning: architecture and design, debugging a failure whose cause is unknown, security analysis, concurrency, cross-system refactors.          |
| `expert`   | Frontier-level work: ambiguous requirements, novel design with no established pattern, or analysis where a wrong answer is costly and hard to detect. |

## Asymmetric confidence bars, and why they differ

A verdict harder than the neutral tier (`moderate`) spends **more** if wrong; a
verdict easier than neutral spends **less** if wrong. Those are not the same
mistake:

- Routing a simple task to an expensive model wastes money. Cheap to be wrong
  about, so the bar to route **up** is low: `minUpgradeConfidence` defaults to
  **0.3**.
- Routing a hard task to a weak model produces a wrong answer. Expensive to be
  wrong about, so the bar to route **down** is high: `minDowngradeConfidence`
  defaults to **0.6**.

Below the applicable bar, the difficulty verdict is discarded and the heuristic
classifier's tier stands instead — not a downgraded `jev` answer, the ordinary
zero-cost fallback.

One case skips both bars: a `risky` reading above 0.7 forces the tier to at
least `hard`, unconditionally. Risk can only ever raise the tier, never lower
one, and it is not itself gated by confidence.

### Ask about the act, not the subject

The risk question is not "does this touch production, money, or credentials":

> Carrying out this request would itself change production, move real money,
> expose credentials, or alter data that cannot be restored. Writing or testing
> code that deals with such things, without running it against the real system,
> does not count.

The naive phrasing was tried first and scored high on ordinary code that merely
_concerns_ those things — "add a refund endpoint that calls Stripe" — which
would have escalated every such request to the most expensive tier. The second
sentence is what separates writing the code from running it against something
real.

## The model pick faces a bar too — but a different one

When the pool has more than one member, `jev` is also asked to choose directly:
_"Which of these models is the cheapest one that can still complete this
request correctly?"_ — over
[the rendered candidate lines](/docs/features/classifier-router-catalog#one-line-per-model).
That pick is reported with its own confidence, separate from the difficulty
confidence, and the router decides which bar applies:

```ts
const pickedCost = this.metaFor(picked).cost ?? NEUTRAL;
const topCost = this.metaFor(tierTop).cost ?? NEUTRAL;
const bar =
  pickedCost < topCost
    ? (this.config.minDowngradeConfidence ?? 0.6) // cheaper than the tier's own choice
    : (this.config.minUpgradeConfidence ?? 0.3); // costlier than the tier's own choice
```

Picking something **costlier** than what the difficulty tier would have picked
on its own risks only spending more than necessary, so it clears the low
upgrade bar. Picking something **cheaper** risks handing the task to a model
that cannot do it, so it must clear the high downgrade bar. Agreeing with the
tier needs no bar at all. If the pick fails its bar, it is dropped — logged as
"classifier pick dropped — below its bar" — and the tier's own ranked list is
used instead.

This is a genuinely different question from the difficulty asymmetry above:
that one asks whether the _tier_ is trustworthy; this one asks whether the
_specific model choice_, once a tier is settled, is trustworthy — and the two
can point in opposite directions (a confident-enough "hard" verdict whose model
pick still misses its own, stricter bar).

A pick that cannot physically hold the request is not gated at all — it is
dropped outright, regardless of confidence, because that is a hard provider
error rather than a degraded answer: see
[the catalogue's context-window filtering](/docs/features/classifier-router-catalog#context-window-filtering).

The `llm` strategy's picks are exempt from both bars: it reports no confidence
for its pick, so a bar would either always pass or always fail. Its picks are
honoured exactly as they were before `jev` existed — imposing a bar here would
silently change an unrelated, already-shipped strategy.

## What this is bad at

- **It cannot tell you why.** The `reason` field is a debug string built from
  the numbers, not an explanation the model gave. If you need an auditable
  rationale for a routing decision, this is the wrong tool.
- **A close call still routes somewhere.** A 0.29 upgrade verdict and a 0.61
  downgrade verdict are both one hundredth of a point from the bar, and both
  fall all the way back to the heuristic tier rather than to "the second most
  likely tier." There is no partial credit.
- **The risk question is a single boolean.** It cannot express "risky, but
  only mildly" — anything past 0.7 jumps straight to `hard`, whatever the
  actual severity.
- **It shares the base model's general limits.** Literal reading, no
  arithmetic, and state relevance affecting accuracy all apply here exactly as
  described in [what `decide` is bad at](/docs/features/decide-inference-type#what-it-is-bad-at).
- **The pool still has to exist.** `jev` chooses among what you declared (or
  what [the catalogue](/docs/features/classifier-router-catalog) built); it
  cannot invent a model you have no credentials for.

## See also

- [The `decide` inference type](/docs/features/decide-inference-type)
- [Classifier Router](/docs/features/classifier-router)
- [The model catalogue](/docs/features/classifier-router-catalog)
- [Per-request context budget](/docs/features/context-budget)
