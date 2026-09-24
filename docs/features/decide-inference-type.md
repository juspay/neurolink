# The `decide` inference type

> **Deep-dive:** [generate, stream, decide: a third inference type for NeuroLink](https://blog.neurolink.ink/posts/generate-stream-decide-a-third-inference-type-for-neurolink/) —
> why this shipped as a provider rather than a subsystem, the five call sites, and the four
> transport bugs found by adding the Vercel AI Gateway (two of which produced plausible output).

NeuroLink recognises three inference types. Two of them produce text:

| Type         | Call                     | Produces                                   |
| ------------ | ------------------------ | ------------------------------------------ |
| `generate`   | `neurolink.generate()`   | text                                       |
| `stream`     | `neurolink.stream()`     | text, incrementally                        |
| **`decide`** | **`neurolink.decide()`** | **typed, calibrated judgements — no text** |

A **decision model** takes one `state` plus a map of named, typed questions and
returns one typed answer per question, all evaluated in a single parallel pass.
There is no text anywhere in the response, so nothing has to be parsed back out
of prose. TypeSafe's **Jev** was the first such model; Convai Innovations' open-weights
**Laya** is the second.

> This is not [`neurolink.evaluate()`](./auto-evaluation.md), which scores an
> already-generated response with RAGAS scorers. Different feature, different
> word.

---

## The three primitives

| Type      | Question                       | Answer fields                                    |
| --------- | ------------------------------ | ------------------------------------------------ |
| `boolean` | Is this statement true?        | `probability` (0–1) — **no confidence**          |
| `choice`  | Which option from this set?    | `choice`, `probabilities`, `confidence`          |
| `score`   | Rate against an ordered rubric | `score`, `legend`, `probabilities`, `confidence` |

All three mix freely in one call.

**Vocabulary note.** TypeSafe calls the yes/no primitive a `noul` and answers
it in a field of the same name. The Vercel AI SDK and Pydantic AI both renamed
that to `boolean`/`probability` when exposing it, and NeuroLink follows them —
the vendor's spelling is translated inside `TypeSafeProvider`, so a second
decision provider slots in without changing any call site.

### Confidence is not probability

`probabilities` says _what_ the model thinks. `confidence` says _whether you
should act on it_. It is calibrated — derived from the distribution, not
self-reported — which is what makes it usable as a gate.

**Calibration is a property of _groups_ of answers, not a promise about any
one.** Across many answers, those scored 0.8 are right about 80% of the time.
It does not mean a specific 0.8 answer is right.

A `boolean` carries no confidence of its own. Use `decisionBooleanConfidence(p)`
— distance from a coin flip, so 0.5 → 0 and 0/1 → 1. Note also that a `boolean`
and an equivalent two-option `choice` are **not** guaranteed to agree, and
complementary booleans do not reliably sum to 1, so a threshold tuned on one
question shape does not transfer to another.

---

## Enabling it

```bash
export TYPESAFE_API_KEY=apikey_...     # the only switch
export TYPESAFE_MODEL=jev-latest       # optional
export TYPESAFE_BASE_URL=https://api.typesafe.ai  # optional
```

Get a key at [console.typesafe.ai/keys](https://console.typesafe.ai/keys).

### Laya, at a Laya server or a LiteLLM proxy route

```bash
export LAYA_BASE_URL=https://your-proxy.example.com/laya  # required: any server exposing <base>/predict
export LAYA_API_KEY=sk-...                                # the key that endpoint accepts
export LAYA_MODEL=typed-decisions                         # optional: english | multilingual | typed-decisions | auto
```

Laya has no built-in endpoint. The base URL and key can equally come from the
config passed to the SDK, `new NeuroLink({ credentials: { laya: { baseURL, apiKey } } })`,
or per call; config set there counts when NeuroLink picks the default decision
provider, exactly as the environment does.

When a TypeSafe key (`TYPESAFE_API_KEY` or `AI_GATEWAY_API_KEY`) is configured
alongside Laya, TypeSafe is the default; Laya runs where a caller names it
(`provider: "laya"`) or when neither TypeSafe key is set. Laya counts as
configured only with both its key and its base URL. See the
[Laya provider guide](../getting-started/providers/laya.md).

**The degradation contract.** `resolveDefaultDecisionProvider()` returns
`undefined` when no decision provider has its key set, and `tryDecide()` returns
`null` on any failure. There is no configuration in which a missing, invalid,
slow or unreachable decision model changes NeuroLink's observable behaviour —
it only ever falls back to what it did before.

A credential the service does not accept disables that provider instance rather
than paying a round trip on every later call to be told so again.

---

## Two transports

The same model is reachable two ways. Which one runs is decided once, in the
constructor:

|                     | Direct             | Vercel AI Gateway                             |
| ------------------- | ------------------ | --------------------------------------------- |
| Key                 | `TYPESAFE_API_KEY` | `AI_GATEWAY_API_KEY`                          |
| Endpoint            | `api.typesafe.ai`  | `ai-gateway.vercel.sh/v4/ai/evaluation-model` |
| Model named in      | request body       | `ai-model-id` header                          |
| Question vocabulary | `noul`             | `boolean`                                     |
| `confidence`        | on each answer     | on `providerMetadata`, not on the answer      |
| Billed by           | TypeSafe           | Vercel                                        |

**Holding both keys keeps the direct transport**, so the confidence figures a
host already sees do not shift underneath it when a second key appears. Both
transports report the vendor's calibrated confidence — the gateway simply puts
it somewhere else, under `providerMetadata.typesafe.confidence.<questionId>`,
leaving the answer objects without one. Set `TYPESAFE_TRANSPORT=gateway` (or
`credentials.typesafe.transport`) to override.

⚠️ **Read that field, not the distribution peak.** It is tempting to take
`max(probabilities)` when an answer carries no `confidence`, and on a
near-certain answer the two agree. On an uncertain one they do not, and not by a
little: a measured four-way choice returned probabilities
`{alpha 0.16, beta 0.28, gamma 0.33, delta 0.23}` — a peak of **0.33** against a
reported confidence of **0.10**. That gap straddles the default
`minUpgradeConfidence` of 0.3, so the derived number clears a bar the real one
fails and a near-random pick gets acted on as a confident one. The peak stays as
the fallback when neither source reports a confidence, and it is genuinely a
different quantity: an even distribution over N options lands near 1/N, not 0.

**Usage is spelled differently too** — `input_tokens` / `output_tokens` on the
direct API, `inputTokens` / `outputTokens` on the gateway. Both are read. A
decision is priced on input alone, so a parser that knows only one spelling does
not error: it reports zero tokens and costs every call at exactly $0.

```bash
export AI_GATEWAY_API_KEY=vck_...      # gateway only — no TypeSafe key needed
export TYPESAFE_TRANSPORT=gateway      # optional; forces the gateway when both keys exist
```

Gateway keys are created at **Vercel → your team → AI Gateway → API Keys**.

⚠️ **The gateway refuses to serve any request until the Vercel team has a
credit card on file**, including the free credits it advertises. The refusal is
a `403` with type `customer_verification_required`, and it arrives _before_ the
model id is validated — so an otherwise-perfect request fails with a billing
error and no hint that the rest of it was fine. A key that has never billed
anything still authenticates: the three states are distinguishable, and worth
knowing apart when diagnosing a 4xx.

| Sent                                | Response                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| No `Authorization`                  | `401` "Missing Authorization header"                                                                    |
| Wrong key                           | `401` "Authentication failed. Check that your Vercel credential is valid and has access to AI Gateway." |
| Valid key, no card on file          | `403` `customer_verification_required`                                                                  |
| Wrong `ai-gateway-protocol-version` | `400` "Unsupported gateway protocol version"                                                            |

All four were measured against the live service. The protocol-version header is
worth singling out: omitting it or sending anything other than `0.0.1` fails the
whole request rather than defaulting to a version.

---

## Using it

```ts
import {
  NeuroLink,
  readDecisionChoice,
  readDecisionBoolean,
} from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.tryDecide({
  // null when unconfigured or failing
  state: ticketText, // string OR structured JSON
  questions: {
    team: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: {
        billing: "Payments, invoicing, refunds",
        technical: "Bugs, outages, integrations",
        sales: "Pricing, upgrades, new accounts",
      },
    },
    urgent: { type: "boolean", instructions: "Does this express urgency?" },
    frustration: {
      type: "score",
      instructions: "How frustrated is the sender?",
      criteria: ["Calm", "Mildly annoyed", "Clearly frustrated", "Furious"],
    },
  },
});

const team = result && readDecisionChoice(result.answers, "team");
if (team && team.confidence >= 0.7) {
  assignTo(team.choice);
} else {
  assignToHumanTriage(); // low confidence is a signal, not an error
}
```

`readDecisionBoolean` / `readDecisionChoice` / `readDecisionScore` validate at
runtime and return `undefined` for a missing id **or** a mismatched type, so no
call site needs a type assertion.

Use `decide()` instead of `tryDecide()` when you want the failure to surface;
it throws a `ProviderError` whose `cause` carries a typed `kind`
(`authentication`, `rate_limit`, `max_tokens_exceeded`, …).

### From the CLI

The same primitive is available as `neurolink decide [state]`, which calls
`decide()` (not `tryDecide()`) and prints one line per answer:

```bash
npx @juspay/neurolink decide "Refund request for a damaged item" \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}'
```

See the [CLI command reference](../cli/commands.md#decide) for the full flag
list, including `--state-file`, `--questions-file` and `--format json`.

### A choice answer is also a ranking

`readDecisionChoice` returns `ranked` — every option sorted by probability,
highest first. One `choice` question over N options therefore ranks all N in a
single request. This is the basis for picking from a large catalogue.

---

## The one rule: batch, never fan out

This inverts the instinct you have from LLMs.

**Question count barely affects latency** (measured against the live API):

| questions | round trip | input tokens |
| --------- | ---------- | ------------ |
| 1         | 393 ms     | 310          |
| 10        | 390 ms     | 481          |
| 100       | 423 ms     | 2 281        |
| 400       | 465 ms     | 8 581        |

400 questions cost ~70 ms more than one. **Concurrent requests, by contrast,
queue**: ten parallel calls take ~1.4 s wall with nine landing together at the
end, while the server's own upstream time stays flat at 64–169 ms.

So 400 things in one request takes ~465 ms; the same 400 as separate requests
takes roughly a minute. Add every question you _might_ need to the call you are
already making — speculative questions are nearly free, a second round trip is
not.

---

## What NeuroLink uses it for

### Model routing

The [classifier router](/docs/features/classifier-router) gains a `jev`
strategy, and its default becomes `auto` — resolving to `jev` when a decision
provider is configured and `heuristic` when not.

One request asks for the difficulty tier, whether the task needs
vision/tools/reasoning, whether carrying it out is risky, **and** which pool
member to use — all at once, in ~400 ms.

|                        | `heuristic`   | `llm`                           | `jev`      |
| ---------------------- | ------------- | ------------------------------- | ---------- |
| Added latency          | 0 ms          | ~1–8 s                          | ~400 ms    |
| Cost per decision      | none          | a full LLM call                 | ~$0.00002  |
| Confidence             | keyword score | self-reported (defaults to 0.7) | calibrated |
| Picks a model directly | no            | yes                             | yes        |

Thresholds are **asymmetric**, because the two mistakes do not cost the same:
`minUpgradeConfidence` defaults to 0.3 (spending more on a wrong guess costs
money) and `minDowngradeConfidence` to 0.6 (spending less on a wrong guess
produces a wrong answer).

> **The key upgrades routing; it does not switch routing on.** The classifier
> router is still opt-in (`classifierRouter.enabled`) and still needs a `pool`,
> because NeuroLink cannot invent the set of models you are willing to route
> between. What the key changes is _which classifier runs_ inside a router you
> already enabled.

### The model catalogue

Enabling `classifierRouter.catalog` widens the routable pool beyond what you
declared by hand: candidates are built from the 64-model registry (7
providers — see [the model catalogue](/docs/features/classifier-router-catalog)
for which), intersected with the credentials this host actually holds, and
ranked by a deterministic formula whenever no decision provider is available
to choose among them.

|                | Without `catalog`        | With `catalog.enabled`                |
| -------------- | ------------------------ | ------------------------------------- |
| Candidate pool | only the declared `pool` | declared `pool` plus registry matches |
| Fallback pick  | first pool member        | `tierScore()`-ranked, tier-aware      |
| Cap            | none needed              | `maxModels`, default 120              |

See [the model catalogue](/docs/features/classifier-router-catalog) for how
candidates are filtered, rendered, and ranked.

### Per-request context budget

A per-request `compactionThreshold` option lowers the point at which history
gets compacted, below the 0.8-of-window default. The `jev` strategy can fill
it in automatically from a four-level scope rubric (`current-message` through
`everything`) — and the mapping is a one-directional invariant: it can only
ever lower the 0.8 default, never raise it, because over-filling a window is
an unrecoverable provider error.

See [per-request context budget](/docs/features/context-budget) for the
rubric, the invariant, and how the threshold scales the compaction target.

### Relevance-driven compaction

Before the existing positional compaction stages run, an optional Stage 0
asks, per eligible message, whether the current request still needs it — at
~400 ms for the whole batch regardless of message count. Only plain
user/assistant text is eligible, the most recent messages are never
touched, and a message is dropped only on a confident "no."

|                   | Positional stages (1–4)            | Stage 0 (relevance)                                          |
| ----------------- | ---------------------------------- | ------------------------------------------------------------ |
| Basis for keeping | position (recency)                 | relevance to the current request                             |
| Drop granularity  | whole messages / summarized ranges | whole messages                                               |
| Runs when         | always, once over budget           | decision provider configured, request known, and over budget |

See [relevance-driven compaction](/docs/features/relevance-compaction) for
the eligibility rules, the drop cap, and the separate summary-quality gate on
Stage 3.

### Tool / MCP routing

The shipped tool router asks a generative model for `{servers: string[]}` on
a 15-second budget — a shape that cannot express uncertainty. A decision
model instead asks one calibrated yes/no question per server, and a server is
excluded only on a confident "no" (`minDropConfidence` default 0.6), because
dropping a needed server breaks the turn while keeping an unneeded one only
costs a few tokens.

A measured wording change moved unrelated servers from a mean probability of
0.31 (dropping 12 of 39 unneeded servers) to a mean of 0.03 (dropping 37 of
39, with zero wrong drops) — seen in
[tool / MCP routing by decision model](/docs/features/tool-routing-decision-model),
which also covers the exact question shape and its size guards.

### RAG retrieval planning

`RAGPipelineConfig.decide` lets each RAG query get its own `topK`/`hybrid`/
`graph`/`rerank` plan instead of one fixed configuration for every query. An
explicit per-call `QueryOptions` field always wins over the plan, and a
capability the pipeline wasn't configured with can never be switched on by
it.

See [per-query RAG retrieval planning](/docs/features/rag-retrieval-planning)
for the breadth rubric and why its confidence bar is deliberately lower than
tool routing's or compaction's.

---

## Limits and gotchas

**Laya reads far less than Jev.** About 768 tokens of state on
`typed-decisions` and `multilingual`, and 320 on `english`, `auto` or an
unrecognised model name, against Jev's ~33,000. Laya's server does not refuse a
longer state; it answers from the first 1,024 tokens (512 on `english`). So the
provider estimates the state's size — counting non-Latin characters at a rate
measured per checkpoint — and refuses anything over the limit locally with
`max_tokens_exceeded`, before any network call. The estimate errs toward
refusing.

**Two separate size ceilings**, both enforced:

- `state` + the **single longest** question ≤ **~33 000 tokens** (measured
  exactly: 33 002 accepted, 33 003 rejected). Usually the binding one.
- `state` + **all** questions combined ≤ **~64 000 tokens**.

Questions do _not_ compete with state for the 33 K budget — a near-ceiling
state plus 400 extra questions is accepted.

**Three different error envelopes.** TypeSafe returns `detail` as an object for
application errors and as an **array** for schema validation; the gateway uses
neither and returns `{"error":{"message","type"}}`. The provider normalises all
three into one `DecisionError`. The validation shape echoes your `input` back,
so it is never logged or surfaced.

On the gateway, `error.type` decides the kind, not the HTTP status — a `403`
carrying `invalid_request_error` is a bad request, not a bad credential, and
must not disable the provider instance. Reading the status alone would trip the
auth circuit breaker on a working key.

**403 vs 401 are inverted** on the direct API, from the usual convention and
from TypeSafe's own docs: a _missing_ `Authorization` header returns **403**, an
_invalid_ key returns **401**. The gateway does not share this quirk — it
returns **401** for both, and reserves **403** for account state.

**`max_tokens_exceeded` arrives with no `message` field** — the one error a
long-context caller is most likely to hit. The provider supplies the sentence.

**Latency**: p50 ~400 ms warm, but the first call after idle measured
2.0–2.7 s. The default timeout is 5 s for that reason, and every internal call
site is fail-open regardless.

**Privacy**: when enabled, the `state` you send leaves the machine. For model
routing that is the prompt text. With no key set, nothing is transmitted.

**Cost**: $0.042 per million input tokens, output free.

---

## What it is bad at

"Cannot hallucinate" is a claim about output **shape**, not answer
**correctness**: a decision model cannot return malformed JSON or an option you
did not offer, but it can still be wrong. TypeSafe reports ~68% accuracy on its
own 711-case benchmark, against ~73% for a frontier model. It wins cost and
latency on every row and loses accuracy on every row — so it is right for
decisions that are **gated and reversible**, and wrong for final answers.

- **It reads literally.** It answers the question you wrote, not the one you
  meant. Split an ambiguous question into two and combine them in code.
- **Ask about the act, not the subject.** "This task touches money" scores high
  on ordinary code that merely _concerns_ money. The risk question in
  `classifyJev` is worded to exclude writing and testing such code, precisely
  because the naive phrasing escalated everything.
- **It is not a calculator.** Counting, arithmetic and date comparison are
  unreliable — dates are read as text, not ordered quantities. A `score` is for
  thresholding and ranking, not for reading an exact magnitude off.
- **Irrelevant state costs accuracy.** Filter before sending.
- **It never explains itself.** No rationale field exists, which rules it out
  where a decision must be auditable.
- **Option order can matter.** Test with reordered `criteria` if a call is close.
- **Don't invert criteria.** A `boolean` whose `true` description means "no"
  performs measurably worse.

Tune thresholds on your own labelled data if the decision matters, and once you
have, pin `TYPESAFE_MODEL` to a version id such as `jev-1.13.0` — `jev-latest`
is an alias and can move under you, invalidating a tuned threshold silently.

---

## Adding another decision provider

The `decide` inference type is provider-neutral by construction. A second
decision model needs:

1. An `AIProviderName` member and a `<Name>Models` enum
   (`src/lib/constants/enums.ts`, **outside** the generated regions).
2. A provider class extending `BaseProvider` that overrides `decide()` and
   implements `getAISDKModel()` / `executeStream()` as throws — the same shape
   the embedding-only providers (`voyage.ts`, `jina.ts`) already use.
3. A descriptor with **`inferenceKinds: ["decide"]`**, no auto-select ranks, and
   `healthCheck: "env-only"`. That one field is what keeps a text-less model out
   of every generation fallback chain; nothing else needs to know the provider
   by name.
4. A registration block, a credentials slice, a manifest, and the usual Tier-3
   onboarding artifacts — `pnpm run verify:provider-onboarding` enumerates them.

The Tier-2 catalog JSON path cannot be used: its schema pins `tier: 2`, accepts
only an 8-flag text-generation capability vocabulary, and requires
`defaultMaxOutputTokens` and `pricingPerMTok.output` — none of which a model
that emits no text can honestly supply.

---

## Testing

```bash
pnpm run test:decide            # live + degradation
pnpm run test:providers-mocked  # the mocked wire contract
```

The suite drives `dist/index.js` only. Live tests skip without
`TYPESAFE_API_KEY`; the degradation and discriminator tests run unconditionally,
because "behaves correctly with no key" and "a text-less provider is unreachable
from generation" are the contracts that matter most.
