# The model catalogue

The [classifier router](/docs/features/classifier-router) has always routed
across a `pool` you declare — the set of models you are willing to be billed
for is not something NeuroLink can invent. The catalogue is an opt-in way to
widen that pool: it builds candidates from the model registry, intersected
with the credentials this host actually holds, and hands them to the
[`jev` strategy](/docs/features/classifier-router-jev-strategy) as one `choice`
question.

**The registry is 64 models across 7 providers** (openai 21, anthropic 19,
azure 7, ollama 6, bedrock 5, mistral 4, google-ai 2), with 132 aliases on top
of those 64 ids — not the whole set of 40 providers NeuroLink can call. The
catalogue is strictly an _addition_ to a declared pool, never a replacement
for one: a host routing over LiteLLM, OpenRouter, an OpenAI-compatible
endpoint, or anything self-hosted still declares those members by hand, and
`enrichCandidate` ranks declared and catalogue members together on one scale
rather than sorting them into separate buckets. Enabling `catalog` widens the
pool for the 7 providers it knows; it does not make the other 33 appear.

**The degradation contract.** `catalog.enabled` defaults to unset, and
`buildModelCatalog()` returns `[]` when it is. Nothing about routing changes
until you turn it on: the declared `pool` remains the only source of
candidates.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const nl = new NeuroLink({
  classifierRouter: {
    enabled: true,
    classifier: "auto",
    pool: [], // no hand-declared members — the catalogue is the whole pool
    catalog: {
      enabled: true,
      maxModels: 120, // default
      minContextWindow: 0, // default: keep all
      providers: ["openai", "anthropic", "azure"], // omit for every reachable provider the registry covers
    },
  },
});
```

A declared `pool` and an enabled `catalog` combine: declared members win on a
duplicate `id` (or `provider/model` when no `id` is set), so a hand-declared
override always beats the catalogue's own entry for the same model.

## Building the routable pool

`buildModelCatalog()` starts from every model the registry knows and removes:

- deprecated models, unless `includeDeprecated: true`
- providers this host has no reachable credentials for (see below)
- providers not in `catalog.providers`, when that list is set
- models whose context window is below `catalog.minContextWindow`

**Reachability is deliberately permissive**, in two directions. A provider
whose credentials resolve through an external chain — Bedrock's AWS default
chain, Vertex's several auth paths — is kept even though no single env var
proves it is configured; a local runtime with no credential at all (Ollama, LM
Studio) is likewise kept. What this actually filters out is the common case: a
cloud provider with one named API-key env var that is simply unset. The worst
case of being too permissive is a candidate that fails at call time and falls
back, which the router already handles.

What is left is capped to `maxModels` (default **120**) by a tier-neutral merit
score — `tierScore(model, "moderate")` — so a truncated list, if there is one,
keeps the models most likely to be broadly useful rather than whichever the
registry happened to list first. **The default never truncates today**: the
whole registry is 64 models, well under the cap. `maxModels` is a guard
against a future registry that outgrows what a single question can carry, not
a limit anyone is currently hitting.

## One line per model

Each surviving model becomes a `ClassifierCandidate` and `renderCandidate()`
turns it into one terse line for `jev`'s `criteria` map. The order and the
precedence are both deliberate:

1. **`description` always renders first**, when present.
2. **`tiers`**, when declared, renders next as `intended for
trivial/simple tasks` — the host's most direct statement of where a
   model belongs.
3. **Context window and capability flags always render.** These are facts
   about the model ("accepts images", "128K context"), not opinions about
   how good it is, so nothing suppresses them.
4. **Declared `cost`/`quality` replace the registry's own opinion, rather
   than sitting beside it.** When either is set, the line adds `capability N
(higher is more capable)` / `relative cost N (lower is cheaper)` and
   _suppresses_ the registry's price, speed bucket, quality bucket, and
   "strong at …" use-case scores entirely. When neither is set, the registry
   fills all of that in exactly as it always did.

Two real renders, from the same model, show the difference:

```
# No declared cost/quality — the registry fills in:
GPT-4 Omni Mini; 128K context; 0.01c per 1K in; fast speed; high quality; supports vision, tools, reasoning, code, multimodal; strong at coding, analysis, conversation, reasoning, translation, summarization

# Declared quality: 2, cost: 1 — the registry's opinion is suppressed:
Cheap and fast; rote edits and simple lookups; 128K context; capability 2 (higher is more capable); relative cost 1 (lower is cheaper); supports vision, tools, reasoning, code, multimodal
```

**This precedence exists because the registry's opinion used to win, and a
live measurement showed it silently overriding the host's own routing
intent.** A pool member declared exactly the second line above — an explicit
statement that this model is for rote work — but the registry rates the
same underlying model highly on general benchmarks, so the old rendering
appended its own "high quality" and "strong at coding, analysis, reasoning"
on top. Five registry clauses against one line of host prose, and the host
lost: a hard concurrency-bug task routed to the cheap model in 5 of 8 runs,
because the model-pick question asks for "the cheapest one that can still
complete this request correctly" and had just been told the cheap one was
high quality and strong at reasoning. The declared `quality: 2` never
reached the model at all — only `description` did. After the fix, the same
15-prompt suite (trivial/simple/conversational/hard/expert) routed 15/15 to
the intended pool member, and the hard prompt went 8/8 to the capable model
(previously 3/8).

**Every catalogue-built candidate takes the "declared" branch, not just
hand-written ones.** `buildModelCatalog()` fills in `cost` and `quality` for
every model it selects (mapped from the registry's own bucket — `high`
becomes `3`, for instance), and that happens _before_ the merged pool
reaches `renderCandidate()`. So the richer registry-style line above (real
price, speed bucket, quality bucket, "strong at …") is only ever reached by
a **hand-declared** member that leaves both `cost` and `quality` unset. A
model sourced from the catalogue always renders with the terse
`capability N` / `relative cost N` phrasing — never with the registry's own
use-case scores.

Rendering is terse on purpose regardless of which branch it takes: this text
is multiplied by the candidate count inside a single question, and that
question — the model-choice `criteria` map — is what competes with the
request for the
[~33K state-plus-longest-question ceiling](/docs/features/decide-inference-type#limits-and-gotchas).
At roughly 40 tokens per line there is ample headroom: the ceiling holds
hundreds of rendered models, not the 64 the registry currently has to offer.
Only use-cases scoring 8 or higher out of 10 are surfaced as "strong at" —
mediocre scores are omitted rather than diluting the line.

**`member.cost` is a relative scale, never a currency.** A host writing
`cost: 20` to mean "the expensive one in my pool" is not read as $20 per 1K
tokens — that would be three orders of magnitude off real pricing. Only
`inputCostPer1K`, the registry's own field, is ever multiplied by 100 and
rendered in cents. The one wrinkle: because `buildModelCatalog()` seeds a
catalogue candidate's "relative cost" from the registry's real price sum
rather than a small integer, its rendered value can look like `relative
cost 0.00074` — correct (never mistaken for a dollar figure), just a smaller
number than a hand-declared `cost: 1` would suggest at a glance. This
doesn't affect ranking: the deterministic fallback score (below) normalizes
price on its own scale, independently of what `renderCandidate()` prints.

## A `choice` over N models is a ranking of N

Because `readDecisionChoice` returns every option's probability, one `choice`
question over the whole catalogue doesn't just name a winner — it ranks all N
candidates by how likely each is to be the right pick. This is what makes
picking from up to `maxModels` (120 by default; the whole registry today is 64) a single request rather than N binary questions.

## Deterministic fallback ranking

Every other `decide` consumer in this codebase falls back to _what the code
already did_. There was no prior "pick from the whole registry" behaviour to
fall back to, so the catalogue needed its own: `rankCatalogue()` runs whenever
no decision provider is configured, the call fails, or the difficulty tier's own
top-of-pool choice is what's needed (`selectModels()` always computes it, even
when `jev`'s pick clears its bar, as the fallback list that ships alongside the
winner).

The ranking is `tierScore()` — a deterministic formula per difficulty:

```
merit = suitability * 0.5 + quality * 0.35 + speed * 0.15
score = merit - priceFactor * tierCostWeight
```

`suitability` reads the registry's own 1–10 score for the dimension that tier
cares about (`conversation` for trivial/simple, `coding` for moderate,
`reasoning` for hard/expert). `tierCostWeight` is what makes this a real
ranker rather than a sort by price: at `trivial` it is `1` (the cheapest
adequate model wins outright), at `expert` it is `0.05` (price is nearly
irrelevant). This never consults the network and is the ordering the decision
model's own pick is compared against when deciding whether it clears its bar.

## Context-window filtering

Nothing in routing read `maxContextTokens` before this. Two independent checks
now do:

- **`rankCatalogue()`** filters candidates whose `contextWindow` is below the
  request's estimated input tokens, applied only when it would leave something
  behind (an empty result falls back to the unfiltered pool rather than
  routing nowhere).
- **The classifier's own pick is separately vetoed.** Even when `jev` picks a
  model directly, `fitsRequest()` checks whether that specific model's window
  can hold the request. If it can't, the pick is dropped **regardless of
  confidence** — this is a hard provider error, not a degraded answer, because
  an oversized request against a real model puts that model into `ModelPool`'s
  permanent (10-year) cooldown. A wrong guess here is not "less accurate," it
  is unrecoverable for the life of the process.

## What this is bad at

- **Registry quality is coarse, and the catalogue path never shows its own
  work.** Auto-enriched `quality` is a 3-bucket scale (`high`/`medium`/`low`)
  before `buildModelCatalog()` turns it into `1`/`2`/`3`; two "high" models
  cannot be separated on capability alone. Worse for this page's topic: because
  the catalogue always populates `cost`/`quality`, its rendered line never
  shows the registry's own price, speed bucket, or "strong at …" scores — only
  the terse `capability N` / `relative cost N` form. Declare `tiers`/`quality`
  on a hand-declared pool member for finer control over the number itself; there
  is no way to get the richer rendering for a catalogue-sourced model.
- **A catalogue candidate's "relative cost" is real pricing wearing a relative
  label.** `buildModelCatalog()` seeds it from `inputCostPer1K + outputCostPer1K`
  — a small decimal like `0.00074` — not a small integer a host would typically
  pick for a hand-declared `cost`. The number is still correct and still never
  rendered as currency, but it does not compare cleanly against a hand-declared
  member's `cost: 1` in the same pool, since one is a real price and the other
  is an arbitrary scale.
- **Unknown-to-the-registry models rank on relative numbers, not real prices.**
  A model the registry doesn't know (self-hosted, brand-new) keeps whatever
  `cost`/`quality` the host declared, compared only against other declared
  values on the same relative scale — never rendered as a dollar figure it
  isn't.
- **A wide catalogue is still one `choice` question, and the cap is hard, not
  smart, when it does bind.** Every model adds tokens to that single question;
  `maxModels` is the safeguard, and a model past it would simply never be
  offered rather than offered with lower priority. Today this is theoretical —
  the registry is 64 models against a default cap of 120, so nothing is
  dropped — but the mechanism has no ranking behavior for the day a registry
  does exceed it.
- **Permissive reachability means occasional dead candidates.** A provider
  kept because its credentials resolve externally can still fail at call time
  if those credentials are actually absent; the router's existing fallback
  handles it, but the catalogue does not pre-verify reachability, only
  presence of a plausible credential path.
- **It cannot see quota, rate limits, or account-level restrictions.** Only
  the registry's static metadata and this host's env vars are consulted.

## See also

- [Classifier Router](/docs/features/classifier-router)
- [Model routing with a decision model](/docs/features/classifier-router-jev-strategy)
- [The `decide` inference type](/docs/features/decide-inference-type)
