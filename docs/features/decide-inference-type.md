# The `decide` inference type

> **Deep-dive:** [generate, stream, decide: a third inference type for NeuroLink](https://blog.neurolink.ink/posts/generate-stream-decide-a-third-inference-type-for-neurolink/) —
> why this shipped as a provider rather than a subsystem, the five call sites, and the four
> transport bugs found by adding the Vercel AI Gateway (two of which produced plausible output).

NeuroLink recognises three inference types. Two of them produce text:

| Type         | Call                     | Produces                       |
| ------------ | ------------------------ | ------------------------------ |
| `generate`   | `neurolink.generate()`   | text                           |
| `stream`     | `neurolink.stream()`     | text, incrementally            |
| **`decide`** | **`neurolink.decide()`** | **typed judgements — no text** |

A **decision model** takes one `state` plus a map of named, typed questions and
returns one typed answer per question, all evaluated in a single parallel pass.
There is no text anywhere in the response, so nothing has to be parsed back out
of prose. The decide providers are TypeSafe's **Jev**, Convai Innovations'
open-weights **Laya**, Juspay's open-weights **XOR**, which also reads images and
video, and Perplexity's hosted **Decisions** API, which also reads images.

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
the vendor's spelling is translated inside `TypeSafeProvider`, so another
decision provider slots in without changing any call site.

### Confidence is not probability

`probabilities` says _what_ the model thinks. `confidence` says _whether you
should act on it_. On TypeSafe's Jev it is calibrated — derived from the
distribution, not self-reported — which is what makes it usable as a gate. Each
provider reports its own: Perplexity's is, in Perplexity's words, the model's own
certainty estimate and not the top probability, Perplexity does not call it
calibrated, and NeuroLink has not measured whether it is, so tune a threshold on
your own data (see the
[Perplexity guide](../getting-started/providers/perplexity-decider.md)).

**Calibration is a property of _groups_ of answers, not a promise about any
one.** Where a confidence is calibrated, answers scored 0.8 are right about 80%
of the time across many answers. It does not mean a specific 0.8 answer is right.

A `boolean` carries no confidence of its own. Use `decisionBooleanConfidence(p)`
— distance from a coin flip, so 0.5 → 0 and 0/1 → 1. Note also that a `boolean`
and an equivalent two-option `choice` are **not** guaranteed to agree, and
complementary booleans do not reliably sum to 1, so a threshold tuned on one
question shape does not transfer to another.

---

## Enabling it

```bash
export TYPESAFE_API_KEY=apikey_...     # enables TypeSafe
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

### XOR, at a deployment or a LiteLLM proxy route

```bash
export XOR_BASE_URL=https://your-proxy.example.com  # required: a deployment, or a proxy route to one
export XOR_API_KEY=sk-...                           # the key that endpoint accepts
export XOR_MODEL=xor-1.1                            # optional
```

XOR, Juspay's open-weights decision model, has no built-in endpoint either.
NeuroLink calls `<base URL>/v1/systemone`, and a trailing `/v1` on the base URL
is accepted. The base URL and key can equally come from the config passed to the
SDK, `new NeuroLink({ credentials: { xor: { baseURL, apiKey } } })`, or per
call; config set there counts when NeuroLink picks the default decision
provider, exactly as the environment does. On a LiteLLM proxy the key's team
must allow `xor-1.1`, otherwise the proxy answers 403 `team_model_access_denied`.

Built-in features use the first configured decision provider in the order
TypeSafe, Laya, XOR, Perplexity. XOR counts as configured only with both its key
and its base URL, and runs where a caller names it (`provider: "xor"`) or when
neither TypeSafe nor Laya is configured. It reads images and video; see
[Images and video](#images-and-video) and the
[XOR provider guide](../getting-started/providers/xor.md).

### Perplexity, at its hosted endpoint

```bash
export PERPLEXITY_API_KEY=pplx-...                      # required; also the Sonar text provider's key
export PERPLEXITY_DECIDER_MODEL=pplx-decider-v1-27b     # optional
export PERPLEXITY_DECIDER_BASE_URL=https://api.perplexity.ai   # optional: an origin
```

Perplexity's `pplx-decider-v1-27b` is a hosted API at a public endpoint, so a key
alone configures it and there is no base URL to set. NeuroLink calls
`<base URL>/v1/decisions`; a trailing `/v1` on an override is accepted. The key
can equally come from the config passed to the SDK,
`new NeuroLink({ credentials: { perplexityDecider: { apiKey } } })`, or per call;
config set there counts when a `decide()` call picks the default decision
provider, exactly as the environment does. The classifier router's `auto` gate is
read differently: it looks at the constructor's credentials and the environment
only, so a `credentials.perplexityDecider` passed on one call does not influence
it. The provider id is `perplexity-decider`: the `perplexity` provider is the
Sonar text provider, which serves `generate()` and `stream()` and not `decide()`.

**`PERPLEXITY_API_KEY` is shared with that text provider.** A host that set it
only to use Sonar has therefore also configured `decide`, and built-in features
will use Perplexity whenever none of TypeSafe, Laya or XOR is configured.
Perplexity comes after XOR in descriptor order, so it never displaces one that
is. Context compaction's relevance stage and summary gate need no opt-in of their
own, so earlier conversation text starts going to Perplexity the first time a
conversation outgrows its budget; model routing, tool routing and RAG planning do
nothing unless enabled. To keep the shared key from activating decisions, pass
the text provider's key as `credentials.perplexity` instead of through the
environment, and keep it out of `.env` too, because the SDK and the CLI load that
file into the environment, or configure one of TypeSafe, Laya and XOR, which then
receives those texts instead. The Perplexity provider guide lists
[what each consumer sends](../getting-started/providers/perplexity-decider.md#what-is-sent-to-perplexity)
and the
[exact switches](../getting-started/providers/perplexity-decider.md#one-key-two-providers).
It reads images but no video; see [Images and video](#images-and-video).

**The degradation contract.** `resolveDefaultDecisionProvider()` returns
`undefined` when no decision provider is configured (a key, plus a base URL for
Laya and XOR), and `tryDecide()` returns `null` on any failure. There is no
configuration in which a missing, invalid, slow or unreachable decision model
changes NeuroLink's observable behaviour — it only ever falls back to what it did
before.

A credential the service does not accept disables that provider instance rather
than paying a round trip on every later call to be told so again. An XOR 403 or
402 is not that case: on a LiteLLM proxy it means the key's team lacks the model
or the budget, which an admin can fix, so the instance is not disabled. For
Perplexity only a 401 is that case: a 413 or a 400 over the model's context length
is `max_tokens_exceeded`, a 429 is `rate_limit` (retried once), and any other 4xx
is a non-retried `invalid_request`.

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

**More questions than a provider takes.** A provider that caps the questions in
one request (Laya takes 64) refuses a longer map from `decide()` with
`max_tokens_exceeded`. `tryDecide()`, which every built-in consumer calls,
splits the map at the cap instead, keeps the questions in the order given, runs
up to four batches at a time and joins the answers into one result: usage is
summed, the latency is the slowest batch's, and `requestId` lists the batches'
ids. A batch that fails costs only its own questions, which then have no answer
(the `read*` helpers return `undefined` for them, and every built-in consumer
carries on without that decision); `tryDecide()` returns `null` only when every
batch failed. The state and any media are sent with each batch, so a split
request costs the state's tokens once for each batch. A provider with no cap
(TypeSafe, XOR) always gets one request.

### From the CLI

The same primitive is available as `neurolink decide [state]`, which calls
`decide()` (not `tryDecide()`) and prints one line per answer:

```bash
npx @juspay/neurolink decide "Refund request for a damaged item" \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}'
```

To ask about an image or a video, add `--image <path>` (repeatable) or
`--video <path>`. XOR reads both, Perplexity reads images only, and TypeSafe and
Laya read neither:

```bash
npx @juspay/neurolink decide "A product photo from a listing." --provider xor \
  --image ./front.png --image ./back.jpg \
  --questions '{"color":{"type":"choice","instructions":"What color is the product?","criteria":{"red":"Mostly red","blue":"Mostly blue"}}}'
```

See the [CLI command reference](../cli/commands.md#decide) for the full flag
list, including `--state-file`, `--questions-file`, `--image`, `--video` and
`--format json`.

### A choice answer is also a ranking

`readDecisionChoice` returns `ranked` — every option sorted by probability,
highest first. One `choice` question over N options therefore ranks all N in a
single request. This is the basis for picking from a large catalogue.

---

## Images and video

A decision provider whose descriptor declares media limits reads images, and
possibly one video, alongside `state`. XOR does, and so does Perplexity, which
declares images only and no video; TypeSafe and Laya do not. Two optional fields
on the request carry them, for `decide()` and `tryDecide()` alike:

- `images` — up to 8 images, the limit XOR and Perplexity each declare.
- `video` — one video, for a provider that declares video (XOR).

Each image and the video takes the same three input forms:

- a `Buffer`;
- a local file path;
- a `data:image/…;base64,` or `data:video/…;base64,` URL.

```ts
const result = await neurolink.decide({
  provider: "xor",
  state: "A product photo from a listing.",
  images: ["./front.png", "./back.jpg"],
  questions: {
    color: {
      type: "choice",
      instructions: "What color is the product?",
      criteria: { red: "Mostly red", blue: "Mostly blue" },
    },
  },
});
console.log(result.mediaBytes); // encoded size of the images sent
```

NeuroLink identifies a Buffer or a file from its bytes, not its extension — PNG,
JPEG, WebP and GIF images, and MP4, MOV and WebM video —
and sends it as a `data:` URL. A `data:` URL you pass yourself must hold base64
image or video content, and is sent as given. Perplexity reads PNG, JPEG and
WebP only, and refuses a GIF before any request.

**What is refused.** Everything NeuroLink can check is refused before any
request, as a non-retryable `invalid_request`:

- an `http(s)` URL — media is not fetched for you, so pass a Buffer, a file path
  or a `data:` URL;
- a string that is not a file path or a `data:` URL, such as bare base64 or a
  URL with another scheme;
- a missing file, a directory, or an empty Buffer or file;
- something that is not an image or a video;
- more than 8 images;
- a request body over the provider's limit: 8 MB for XOR, 32 MiB for Perplexity.
  The limit applies to the encoded body, so the base64 form counts. A file over
  it is refused from its size, before it is read;
- a video sent to a provider that declares no video (Perplexity);
- an image Perplexity cannot read: one of another type, or over 2,048 tiles of
  32 × 32 pixels, which the API would otherwise hold for about a minute before
  answering 504;
- any media sent to a provider that declares no media capability (TypeSafe,
  Laya). The message names the providers that accept media.

**Images and a video can be sent together** to XOR (up to 8 images and one
video), but the model does not reliably tell the two apart.

The result carries `mediaBytes`, the encoded size of the media sent. The
`decide` spans carry `decision.images.count` and `decision.media.bytes`, and
never any base64. A deployment started without `OPENJEV_IMAGES=1` answers 200
and silently ignores images, which NeuroLink cannot detect; see the
[XOR provider guide](../getting-started/providers/xor.md#troubleshooting).

---

## The one rule: batch, never fan out

This inverts the instinct you have from LLMs.

**On TypeSafe, question count barely affects latency** (measured against its live
API):

| questions | round trip | input tokens |
| --------- | ---------- | ------------ |
| 1         | 393 ms     | 310          |
| 10        | 390 ms     | 481          |
| 100       | 423 ms     | 2 281        |
| 400       | 465 ms     | 8 581        |

> These are TypeSafe's figures. `perplexity-decider` differs: about 0.3 to 1.1 s
> for one question, about 65 ms for each further question (a request takes at
> most 128), and an input time that grows faster than linearly with size: 3.9 s
> at 65,000 tokens, 10 s at 146,000 and 22.9 s at 251,000. See
> [its latency section](../getting-started/providers/perplexity-decider.md#latency-and-the-timeout).

On TypeSafe, 400 questions cost ~70 ms more than one. **Concurrent requests, by
contrast, queue**: ten parallel calls take ~1.4 s wall with nine landing together
at the end, while the server's own upstream time stays flat at 64–169 ms.

So on TypeSafe, 400 things in one request take ~465 ms; the same 400 as separate
requests take roughly a minute. Add every question you _might_ need to the call
you are already making — speculative questions are nearly free on TypeSafe (on
Perplexity each costs about 65 ms, up to 128 in a request), and a second round
trip is not.

---

## What NeuroLink uses it for

### Model routing

The [classifier router](/docs/features/classifier-router) gains a `jev`
strategy, and its default becomes `auto` — resolving to `jev` when a decision
provider is configured and `heuristic` when not.

One request asks for the difficulty tier, whether the task needs
vision/tools/reasoning, whether carrying it out is risky, **and** which pool
member to use — all at once, in ~400 ms on TypeSafe's Jev.

|                        | `heuristic`   | `llm`                           | `jev`                                               |
| ---------------------- | ------------- | ------------------------------- | --------------------------------------------------- |
| Added latency          | 0 ms          | ~1–8 s                          | ~400 ms on TypeSafe                                 |
| Cost per decision      | none          | a full LLM call                 | ~$0.00002 on TypeSafe                               |
| Confidence             | keyword score | self-reported (defaults to 0.7) | as the provider reports it (calibrated on TypeSafe) |
| Picks a model directly | no            | yes                             | yes                                                 |

The `jev` column is TypeSafe's figures; the
[Perplexity guide](../getting-started/providers/perplexity-decider.md) gives its
latency and the confidence it reports.

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
~400 ms for the whole batch regardless of message count (on TypeSafe;
`perplexity-decider` differs, taking about 0.3 to 1.1 s for one question and about
65 ms for each further one, plus an input time that grows faster than linearly
with size).
Only plain user/assistant text is eligible, the most recent messages are never
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
model instead asks one yes/no question per server, answered with a probability,
and a server is excluded only on a confident "no" (`minDropConfidence` default
0.6), because dropping a needed server breaks the turn while keeping an unneeded
one only costs a few tokens.

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

**XOR shares one prefill between the state, the questions and any media.**
NeuroLink allows about 200,000 estimated tokens of state (about four characters
per token for ASCII, one token per character for other scripts) and refuses more
locally with `max_tokens_exceeded`. That figure is a conservative default under
the deployment's 250,000-token prefill, which the questions and any images or
video also draw on; it has not been measured against a live deployment. A
request that passes the local check can therefore still be refused by the
server as too long. That arrives as `max_tokens_exceeded` (not retried) when
the status is 413 or the message says the context was too long, and otherwise as
`server`, retried once. XOR has no question cap in NeuroLink, and its server takes 2 to 255
options on a `choice` or `score`.

**Perplexity's input ceiling covers more than the state.** Measured on a real
account in October 2026: the server reads under 262,144 input tokens per request,
counted over the state and the questions, and refuses input of 262,144 tokens or
more with an explicit 400 instead of cutting the state off. Images are billed as
input tokens, about one for each 32 × 32 tile plus about 95 for the image (a fit
to three measured sizes), and are assumed to count toward the ceiling too; that
was not measured. It takes at most 128 questions and 8 images. The documented
32 MiB body limit was not measured. NeuroLink's own window is 100,000 estimated
tokens of state, a deliberate local limit and not the server's; a state estimated
above it, or more than 128 questions in a `decide()` call, is refused locally
with `max_tokens_exceeded` (`tryDecide()` splits the questions at 128). The estimate is about 3.8 characters per token for ASCII
text and half a token per non-ASCII character (measured: CJK 0.46 tokens per
character, Devanagari 0.44), and it counts the state's text only. Measured on
40,000-character samples, it over-counts English prose (4.34 characters per
token) and is close for TypeScript (3.84). It runs about 13% low on minified JSON
(3.36), which stays far under the ceiling at the window: 380,000 characters of
JSON are about 113,000 real tokens. It runs much lower on log lines (1.35) and
arrays of integers (1.16), which are about 281,000 and 328,000 real tokens for
the same 380,000 characters, and on emoji (2.6 tokens per code point), so a state
that is mostly one of those can pass the window and still be refused by the
server. A request that passes it can also be refused when the questions, or the
images if they count as assumed, push the input over. That refusal arrives as
`max_tokens_exceeded` too, and is not retried. A state estimated above the window
needs a smaller state or another provider: no setting raises it, so a larger
state that would fit the server can be sent only through a decision provider with
a larger window. Perplexity documents a request rate of 10 per second for the
account's tier, and on the account tested 14 parallel requests got 10 answers and
4 replies of 429.

**Two separate size ceilings** (TypeSafe), both enforced:

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

**On TypeSafe, `max_tokens_exceeded` arrives with no `message` field** — the one
error a long-context caller is most likely to hit. The provider supplies the
sentence. Perplexity's over-length 400 does carry a message, and its provider
reads the kind from that text.

**Latency**: TypeSafe's p50 is ~400 ms warm, but the first call after idle
measured 2.0–2.7 s. The default timeout is 5 s for that reason, and every
internal call site is fail-open regardless. Perplexity's time scales with the
input and with the question count. Input time grows faster than linearly: 3.9 s
at 65,000 tokens, 10 s at 146,000 and 22.9 s at 251,000 (about 17,000, 15,000
and 11,000 tokens per second), against 0.3 to 1.1 s for one question on a short
state, plus about 65 ms for each question after the first (128 minimal questions
took 8.9 s). Its default timeout is 10 s plus 100 ms for each question, so 10.1 s
for one question and 22.8 s for 128, and a `timeoutMs` you pass is used as given.
A timeout is retried once, so a request that stalls can take about twice the
timeout. Pass a larger `timeoutMs` for any state of more than about 100,000 real
tokens, which log lines and arrays of numbers reach well inside the window. The
[provider guide](../getting-started/providers/perplexity-decider.md#latency-and-the-timeout)
lists the timeout setting for each built-in consumer.

**Privacy**: when enabled, the `state` you send leaves the machine. For model
routing that is the prompt text; for compaction and tool routing it is earlier
conversation text. With no decision provider configured, nothing is transmitted.
A `PERPLEXITY_API_KEY` set for the Perplexity text provider counts as a decision
provider's key, so with it set and none of TypeSafe, Laya or XOR configured, the
state of a decision goes to Perplexity. The provider guide lists
[what each consumer sends](../getting-started/providers/perplexity-decider.md#what-is-sent-to-perplexity).

**Cost**: TypeSafe, $0.042 per million input tokens, output free. Perplexity,
$0.04 per million input tokens (image tokens included), output free.

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

The `decide` inference type is provider-neutral by construction. Another
decision model needs:

1. An `AIProviderName` member and a `<Name>Models` enum
   (`src/lib/constants/enums.ts`, **outside** the generated regions).
2. A provider class extending `SystemOneDecisionProvider`
   (`src/lib/providers/systemOneDecision.ts`), which owns the request loop,
   retries, the auth circuit breaker and answer parsing, and supplies the
   throwing `getAISDKModel()` / `executeStream()` stubs, the same shape the
   embedding-only providers (`voyage.ts`, `jina.ts`) use. The class supplies
   its endpoint, headers, body, error parsing and messages.
3. A descriptor with **`inferenceKinds: ["decide"]`**, no auto-select ranks, and
   `healthCheck: "env-only"`. That one field is what keeps a text-less model out
   of every generation fallback chain; nothing else needs to know the provider
   by name. A provider that reads images or video also declares
   `decisionLimits.media`; without it, a request that carries media is refused
   before any network call.
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
