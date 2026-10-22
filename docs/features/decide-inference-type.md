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
open-weights **Laya**, Juspay's open-weights **XOR**, which also reads an image
and audio and extracts typed values, Subquadratic's hosted **SubQ Snap**, Perplexity's hosted **Decisions**
API, which also reads images,
Cloudflare's **Clef** models on Workers AI,
which also read images, OpenAI's
**Decisions** API (a public beta), which also reads images, and ScaleDown's
hosted **Classify** models, which read text only.

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

### Two more, on XOR: `value`, and `choice` with `unknown`

A provider lists the question types it reads in its `decisionLimits`
(`questionTypes`); without the list it reads the three above. Asking anything
else is refused before any request, as a non-retryable `invalid_request`, and a
host question of such a type is dropped on its own (see
[`decisionHooks`](#riding-along-decisionhooks)). XOR reads two more:

| Type                          | Question                               | Answer fields                                                           |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| `value`                       | Extract one typed field from the state | `value` (string or number; `null` when absent), `confidence`, `unknown` |
| `choice` with `unknown: true` | Which option, or none of them?         | as `choice`, plus `unknown: true` when none fits                        |

```ts
const result = await neurolink.decide({
  provider: "xor",
  state: "Invoice INV-2024-0892 for 18,275.50 rupees, due on 15 September.",
  questions: {
    amount: { type: "value", dtype: "float", instructions: "Invoice amount?" },
    ref: {
      type: "value",
      instructions: "Invoice reference?",
      pattern: "INV-[0-9]{4}-[0-9]{4}",
    },
    intent: {
      type: "choice",
      unknown: true,
      instructions: "What does the customer want?",
      criteria: { upgrade: "a higher plan", downgrade: "a lower plan" },
    },
  },
});
readDecisionValue(result.answers, "amount"); // { value: 18275.5, confidence, unknown: false }
```

`dtype` is `string` (the default), `int` or `float`; `pattern` is a regular
expression the extracted text must match. A value the state does not hold comes
back as `null` with `unknown: true` — an answer, not a missing one.
`readDecisionValue` returns undefined only for an absent id or another type.
With `unknown: true` on a `choice`, the option count includes `unknown`, and no
option may itself be named `unknown`.

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
export XOR_MODEL=xor-latest                         # optional; xor-omni reads an image and audio
```

XOR, Juspay's open-weights decision model, has no built-in endpoint either.
NeuroLink calls `<base URL>/v1/decisions`, and a trailing `/v1` on the base URL
is accepted. The base URL must be `https://`; `http://` is accepted only for
`localhost`, `127.0.0.1` and `[::1]`, because every request carries the key and
the state. A redirect from the endpoint is refused, not followed. The base URL
and key can equally come from the config passed to the SDK,
`new NeuroLink({ credentials: { xor: { baseURL, apiKey } } })`, or per call; config set there counts when NeuroLink picks the default decision
provider, exactly as the environment does. On a LiteLLM proxy the key's team
must allow `xor-latest` (and `xor-omni` for media), otherwise the proxy answers 403 `team_model_access_denied`.

Built-in features use the first configured decision provider in the order
TypeSafe, Laya, XOR, SubQ, Perplexity, Cloudflare Clef, OpenAI Decisions, ScaleDown. XOR counts as configured only with both its key
and its base URL, and runs where a caller names it (`provider: "xor"`) or when
neither TypeSafe nor Laya is configured. It reads one image and up to 30
seconds of audio, but no video, and answers `value` questions; see
[Images and video](#images-and-video) and the
[XOR provider guide](../getting-started/providers/xor.md).

### SubQ, at its hosted endpoint

```bash
export SUBQ_API_KEY=...                        # required; from console.subq.ai, which shows it once
export SUBQ_MODEL=subq-snap-preview            # optional; the only model on the Decisions endpoint
export SUBQ_BASE_URL=https://api.subq.ai       # optional; an origin, without /v1
```

Subquadratic's `subq-snap-preview` (public preview) speaks the same System One
wire as TypeSafe, at a public endpoint, so a key alone configures it and there
is no base URL to set. The key and base URL can equally come from the config
passed to the SDK, `new NeuroLink({ credentials: { subq: { apiKey, baseURL } } })`,
or per call. The provider id is `subq`; `subquadratic` and `subq-snap` name it
too. It comes after TypeSafe, Laya and XOR and ahead of Perplexity and Cloudflare
Clef: its key belongs to no other provider, so it is set on purpose, whereas
theirs are shared with text providers and must not displace it. NeuroLink sends it no images or video: SubQ's image format is not
one the decide catalog can describe yet, so an image attached to a call is
refused before any request. The state window NeuroLink reports for it is advisory
(reported, never enforced, not a guarantee); see the
[SubQ provider guide](../getting-started/providers/subq.md#limits).

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
provider, exactly as the environment does. The classifier router's `auto` gate
counts them too, per-call credentials included, so a
`credentials.perplexityDecider` passed on one call can make `auto` pick `jev`.
The provider id is `perplexity-decider`: the `perplexity` provider is the
Sonar text provider, which serves `generate()` and `stream()` and not `decide()`.

**`PERPLEXITY_API_KEY` is shared with that text provider.** A host that set it
only to use Sonar has therefore also configured `decide`, and built-in features
will use Perplexity whenever none of TypeSafe, Laya, XOR or SubQ is configured.
Perplexity comes after XOR and SubQ in descriptor order, so it never displaces
one that is. Context compaction's relevance stage and summary gate need no opt-in of their
own, so earlier conversation text starts going to Perplexity the first time a
conversation outgrows its budget; model routing, tool routing and RAG planning do
nothing unless enabled. To keep the shared key from activating decisions, pass
the text provider's key as `credentials.perplexity` instead of through the
environment, and keep it out of `.env` too, because the SDK and the CLI load that
file into the environment, or configure one of TypeSafe, Laya, XOR and SubQ, which then
receives those texts instead. The Perplexity provider guide lists
[what each consumer sends](../getting-started/providers/perplexity-decider.md#what-is-sent-to-perplexity)
and the
[exact switches](../getting-started/providers/perplexity-decider.md#one-key-two-providers).
It reads images but no video; see [Images and video](#images-and-video).

### Cloudflare Clef, on Workers AI

```bash
export CLOUDFLARE_API_KEY=...                 # required; a Workers AI token, also the Workers AI text provider's key
export CLOUDFLARE_ACCOUNT_ID=...              # required; also the Workers AI text provider's account id
export CLOUDFLARE_CLEF_MODEL=clef-flash       # optional: clef (27B, the default) or clef-flash (9B)
export CLOUDFLARE_CLEF_BASE_URL=https://api.cloudflare.com/client/v4   # optional
```

Cloudflare's `clef` and `clef-flash` are hosted on Workers AI at a public
endpoint, so there is no base URL to set. The account id is part of the route, so
Clef counts as configured only with both the token and the account id. They can
equally come from the config passed to the SDK,
`new NeuroLink({ credentials: { cloudflareClef: { apiKey, accountId } } })`
(`baseURL` is optional), or per call; config set there counts when a `decide()`
call picks the default decision provider, exactly as the environment does. The
classifier router's `auto` gate counts them too, per-call credentials included,
so a `credentials.cloudflareClef` passed on one call can make `auto` pick `jev`.
The provider id is `cloudflare-clef`: the `cloudflare` provider is the Workers AI text
provider, which serves `generate()` and `stream()` and not `decide()`, and
`credentials.cloudflare` does not configure `decide`.

**The Workers AI endpoint's state window changed during October 2026.**
Cloudflare documents a 64K window; until 2026-10-04 text past about 2,048 tokens
was ignored without an error, and on 2026-10-07 states of at least 190,153 tokens
(`clef-flash`) and 52,154 (`clef`) were read in full (hosted service or model:
unknown). NeuroLink refuses a state it estimates at more than 16,000 tokens with
`max_tokens_exceeded`, which every built-in consumer treats as "carry on as
before"; see [Limits and gotchas](#limits-and-gotchas). Latency grows with the
state, about 0.2 s per 1,000 tokens on large ones, so NeuroLink's default timeout
adds 250 ms per 1,000 estimated tokens.

**`CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID` are shared with that text
provider.** A host that set them only to use Workers AI text has therefore also
configured `decide`, and built-in features will use Clef whenever none of
TypeSafe, Laya, XOR, SubQ or Perplexity is configured. Clef comes after
TypeSafe, Laya, XOR, SubQ and Perplexity, so it never displaces one that is. No switch turns it off while the two
variables are set. The Clef provider guide explains
[when NeuroLink uses it](../getting-started/providers/cloudflare-clef.md#when-neurolink-uses-it)
and
[how the two providers share the token](../getting-started/providers/cloudflare-clef.md#one-token-two-providers).
It reads images but no video; see [Images and video](#images-and-video).

### OpenAI Decisions, at its hosted endpoint

```bash
export OPENAI_API_KEY=sk-...                              # required; also the OpenAI chat provider's key
export OPENAI_DECISIONS_MODEL=gpt-6-luna                  # optional
export OPENAI_DECISIONS_BASE_URL=https://api.openai.com   # optional: an origin
```

OpenAI's Decisions API is a public beta at a public endpoint, so a key alone
configures it and there is no base URL to set. NeuroLink calls
`<base URL>/v1/decisions`; a trailing `/v1` on an override is accepted. The key
can equally come from the config passed to the SDK,
`new NeuroLink({ credentials: { openaiDecisions: { apiKey } } })`, or per call;
config set there counts when a `decide()` call picks the default decision
provider, exactly as the environment does. The classifier router's `auto` gate
counts them too, per-call credentials included, so a `credentials.openaiDecisions`
passed on one call can make `auto` pick `jev`. The provider id is `openai-decisions`: the `openai` provider is the chat
provider, which serves `generate()` and `stream()` and not `decide()`, and
`credentials.openai` does not configure `decide`. Its wire is OpenAI's own (named
questions in an array, an array of answers), so NeuroLink translates both ways;
the question types you write are unchanged. See the provider guide's
[wire mapping](../getting-started/providers/openai-decisions.md#how-a-question-is-sent).

**`OPENAI_API_KEY` is shared with that chat provider.** A host that set it only to
use OpenAI chat has therefore also configured `decide`, and built-in features will
use OpenAI Decisions whenever none of TypeSafe, Laya, XOR, SubQ, Perplexity or Cloudflare
Clef is configured. It comes after those six in the order, so it never displaces
one that is; only ScaleDown follows it.
The built-in consumers (model routing, tool routing, relevance compaction, the
summary gate, RAG planning) and the speech-to-text correction check then make paid
decision calls, though they still fail open. No switch turns it off while the key
is set (short of a gateway `OPENAI_BASE_URL`, below). `neurolink.decide()` and `tryDecide()` build a fresh provider for every
call, so a key OpenAI rejects costs one failing request per decision site each
time, and the 401 latch never carries across calls. The provider guide explains
[when NeuroLink uses it](../getting-started/providers/openai-decisions.md#when-neurolink-uses-it)
and
[how the two providers share the key](../getting-started/providers/openai-decisions.md#one-key-two-providers).
**A gateway's key is never used for the default.** `OPENAI_API_KEY` is also the
key of every OpenAI-compatible gateway (LiteLLM, vLLM and the like), so while
`OPENAI_BASE_URL`, `OPENAI_API_BASE` or `credentials.openai.baseURL` names a host other than
`https://api.openai.com`, NeuroLink does not take the environment key to be
OpenAI's and does not pick OpenAI Decisions as the default; the built-in
consumers send nothing to `api.openai.com` for it and behave as they did without a
decision model. The comparison is of scheme, host and port, without regard to case; a path,
a trailing slash and `/v1` do not matter, a value that is not an http(s) URL
counts as another host, and a blank one as unset. Setting
`OPENAI_DECISIONS_BASE_URL`, or passing `credentials.openaiDecisions` with a key or
a base URL, lifts the check, because you routed this provider on purpose. A call
that names `provider: "openai-decisions"` is never checked: it uses the
environment key, and sends it to `https://api.openai.com` unless
`OPENAI_DECISIONS_BASE_URL` or `credentials.openaiDecisions.baseURL` says otherwise,
so a host whose key is a gateway's must route the provider on purpose or not use
it, and must not name it. The rule is data on the catalog entry
(`decide.ambientKeyGuard`) and applies to this provider alone; the provider guide
spells out
[the cases](../getting-started/providers/openai-decisions.md#a-gateways-key-is-never-used-for-the-default).

It reads images but no video; see [Images and video](#images-and-video). **Much
about the endpoint is not established**, including its option limits, image
formats and rate limits. Its question cap is the 200 that OpenAI's Python SDK
documents, which `tryDecide()` splits at; going over it was not tried against the
live endpoint. The guide lists
[what is not established](../getting-started/providers/openai-decisions.md#what-is-not-established).

### ScaleDown, at its hosted endpoint

```bash
export SCALEDOWN_API_KEY=...                          # required; a key no other provider reads
export SCALEDOWN_MODEL=classify-1                     # optional; classify-1 is the default
export SCALEDOWN_BASE_URL=https://api.scaledown.xyz   # optional: an origin, or an origin with a path prefix
```

ScaleDown's Classify models speak the same System One wire as TypeSafe, at a
public endpoint, so a key alone configures it and there is no base URL to set.
NeuroLink calls `<base URL>/v1/scaledown`, drops trailing slashes from an
override, and sends the key in an `x-api-key` header and never as a Bearer token.
The key can equally come from the config passed to the SDK,
`new NeuroLink({ credentials: { scaledown: { apiKey } } })`, or per call. The
provider id is `scaledown`; `scaledown-classify` names it too.

**ScaleDown is the last decision provider, and its key is its own.** Nothing
else reads `SCALEDOWN_API_KEY`, so setting it can only be meant for ScaleDown. It
still comes last in the order: a host with only that key gets ScaleDown for the
built-in features, and a host that also has any earlier provider configured
(including an `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` or Cloudflare pair set only for
a text provider) gets that earlier provider and reaches ScaleDown only by naming
it. When ScaleDown is the default, the built-in consumers make paid decision
calls, and still fail open.

**It reads text only, and the state always goes out as a string.** A string state
is sent unchanged, any other value as its JSON text, and a string that is empty or
only whitespace is refused before any request, as an `invalid_request`. `{}` and
`[]` are sent as that text. Images and video are refused before any request. Two
optional keys in the entry's `decide` block say this to the shared engine,
`authHeader: "x-api-key"` and `stateEncoding: "text"`; an entry that omits them
behaves as before. The provider guide has the
[request](../getting-started/providers/scaledown.md#how-a-request-is-sent) and the
[billing note](../getting-started/providers/scaledown.md#choice-options-and-billing):
ScaleDown's documentation says a `choice` question is scored once per option, but
the input tokens charged in a live test did not grow with options times state
length (the same 20,000-character state cost 2,966, 3,024 and 3,137 tokens at 3, 6
and 12 options); how ScaleDown counts them is not known.

**Much about the endpoint is not measured**, including its context size, latency,
rate limits and the maximum number of options, questions and levels; the guide
lists [what is not measured](../getting-started/providers/scaledown.md#not-measured).
All of the facts the guide gives about ScaleDown's endpoint come from its
documentation and from probes the marketing session made on 2026-10-15; none were
made by NeuroLink's project.

**The degradation contract.** `resolveDefaultDecisionProvider()` returns
`undefined` when no decision provider is configured (a key, plus a base URL for
Laya and XOR, or an account id for Cloudflare Clef; SubQ and ScaleDown need only their key), and `tryDecide()` returns
`null` on any failure. There is no
configuration in which a missing, invalid, slow or unreachable decision model
changes NeuroLink's observable behaviour — it only ever falls back to what it did
before.

A credential the service does not accept disables that provider instance rather
than paying a round trip on every later call to be told so again. An XOR 403 or
402 is not that case: on a LiteLLM proxy it means the key's team lacks the model
or the budget, which an admin can fix, so the instance is not disabled. For
Perplexity only a 401 is that case: a 413 or a 400 over the model's context length
is `max_tokens_exceeded`, a 429 is `rate_limit` (retried once), and any other 4xx
is a non-retried `invalid_request`. For ScaleDown only a 401 is that case: a 402
(no credit left, or a key ScaleDown does not recognise; the message says both)
and a 422 are non-retried `invalid_request`s (the same instance works again once
the cause is fixed), a 429 is `rate_limit` and a 502 or other 5xx is `server`
(each retried once), and a 504 that ScaleDown sends is `timeout` and is not
retried. For OpenAI Decisions only a 401 is that case
(a 403 is a non-retried `invalid_request`), and every 429 is a non-retried
`rate_limit`. For Cloudflare Clef only a 401 is that case
(a 403 was never seen, and would be a non-retried `invalid_request`, so a
permission fixed in the dashboard works at once), a 413 is `max_tokens_exceeded`,
a 429 is `rate_limit` (retried, except the Free plan's daily-allocation 429 with
code 4006, which a few seconds of backoff do not clear), and a 400 or 422 is a non-retried
`invalid_request`.

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

`ticketText` is attacker-controlled, so the verdict is a hint: keep `assignTo`
reversible or put a deterministic check in front of it (see the Untrusted input
bullet under [What it is bad at](#what-it-is-bad-at)).

Use `decide()` instead of `tryDecide()` when you want the failure to surface;
it throws a `ProviderError` whose `cause` carries a typed `kind`
(`authentication`, `rate_limit`, `max_tokens_exceeded`, …).

**More questions than a provider takes.** A provider that caps the questions in
one request (Laya and Cloudflare Clef take 64, Perplexity and XOR 128, OpenAI Decisions 200) refuses a longer map from `decide()` with `max_tokens_exceeded`, except
OpenAI Decisions, whose row is advisory: its cap is reported and used to split,
but `decide()` sends a longer map whole and leaves the answer to the server.
`tryDecide()`, which every built-in consumer calls, splits the map at the cap
instead, keeps the questions in the order given, runs
up to four batches at a time and joins the answers into one result: usage is
summed, the latency is the slowest batch's, and `requestId` lists the batches'
ids. A batch that fails costs only its own questions, which then have no answer
(the `read*` helpers return `undefined` for them, and every built-in consumer
carries on without that decision); `tryDecide()` returns `null` only when every
batch failed. The state and any media are sent with each batch, so a split
request costs the state's tokens once for each batch. A provider with no cap
(TypeSafe, SubQ, ScaleDown) always gets one request.

### From the CLI

The same primitive is available as `neurolink decide [state]`, which calls
`decide()` (not `tryDecide()`) and prints one line per answer:

```bash
npx @juspay/neurolink decide "Refund request for a damaged item" \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}'
```

To ask about an image, a video or an audio clip, add `--image <path>`
(repeatable), `--video <path>` or `--audio <path>`. XOR reads one image and
audio, Perplexity, Cloudflare Clef and OpenAI Decisions read images only,
TypeSafe, Laya, SubQ and ScaleDown read neither, and no shipped provider reads
video. With `--audio`, the state may be left out:

```bash
npx @juspay/neurolink decide "A product photo from a listing." --provider xor --model xor-omni \
  --image ./front.png \
  --questions '{"color":{"type":"choice","instructions":"What color is the product?","criteria":{"red":"Mostly red","blue":"Mostly blue"}}}'
```

See the [CLI command reference](../cli/commands.md#decide) for the full flag
list, including `--state-file`, `--questions-file`, `--image`, `--video`,
`--audio` and `--format json`.

### A choice answer is also a ranking

`readDecisionChoice` returns `ranked` — every option sorted by probability,
highest first. One `choice` question over N options therefore ranks all N in a
single request. This is the basis for picking from a large catalogue.

---

## Images and video

A decision provider whose descriptor declares media limits reads images, and
possibly one video or one audio clip, alongside `state`. XOR, Perplexity,
Cloudflare Clef and OpenAI Decisions read images; XOR also reads audio; TypeSafe,
Laya, SubQ and ScaleDown read none. No shipped provider reads video: XOR's
gateway drops a video without a word (a solid red clip was answered the same as
garbage bytes), so NeuroLink refuses one rather than return a blind answer.
Three optional fields on the request carry media, for `decide()` and
`tryDecide()` alike:

- `images` — up to 8 for Perplexity and OpenAI Decisions (OpenAI's is
  NeuroLink's own allowance, not a limit OpenAI documents), 4 for Cloudflare
  Clef, 1 for XOR.
- `video` — one video, for a provider that declares video (none today).
- `audio` — one clip, for a provider that declares audio (XOR); see
  [Audio](#audio) below.

Each takes the same three input forms:

- a `Buffer`;
- a local file path;
- a `data:image/…`, `data:video/…` or `data:audio/…;base64,` URL.

```ts
const result = await neurolink.decide({
  provider: "perplexity-decider",
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
image or video content. Clef normalizes `image/jpg` to `image/jpeg`; other data URLs are sent as given. Perplexity and Cloudflare Clef read
PNG, JPEG and WebP only, and refuse a GIF before any request. OpenAI Decisions
sends every image as an inline data URL and checks no format list, because
OpenAI's list is not established.

**What is refused.** Everything NeuroLink can check is refused before any
request, as a non-retryable `invalid_request`:

- an `http(s)` URL — media is not fetched for you, so pass a Buffer, a file path
  or a `data:` URL;
- a string that is not a file path or a `data:` URL, such as bare base64 or a
  URL with another scheme;
- a missing file, a directory, or an empty Buffer or file;
- something that is not an image or a video;
- more than 8 images, more than 4 for Cloudflare Clef, or more than 1 for XOR;
- a request body over the provider's limit: 25 MB for XOR, 32 MiB for Perplexity
  and for OpenAI Decisions (NeuroLink's own number for the latter), 256,000 bytes
  for Cloudflare Clef. The limit applies to the encoded body, so
  the base64 form counts, and a photo usually has to be resized to well under
  190 KB before Clef will take it. A file over it is refused from its size,
  before it is read;
- a video, which no shipped provider declares (XOR, Perplexity, Cloudflare Clef,
  OpenAI Decisions);
- an image Perplexity cannot read: one of another type, or over 2,048 tiles of
  32 × 32 pixels, which the API would otherwise hold for about a minute before
  answering 504;
- an image Cloudflare Clef cannot read: one that is not PNG, JPEG or WebP;
- any media sent to a provider that declares no media capability (TypeSafe,
  Laya). The message names the providers that accept media.

### Audio

XOR hears one clip per request, as WAV, FLAC, Ogg (Vorbis or Opus) or MP3,
identified from its bytes and sent as `{ data, format }`. The state may be empty
(`state: ""`; the CLI's `--audio` lets you leave it out), and an image may go
with it.

```ts
const result = await neurolink.decide({
  provider: "xor",
  model: "xor-omni",
  state: "",
  audio: "./call.wav",
  questions: {
    language: {
      type: "choice",
      instructions: "Which language is spoken?",
      criteria: { english: "English", hindi: "Hindi" },
    },
  },
});
```

The model hears the **first 30 seconds** and drops the rest without a word, at
about 25 input tokens a second. So a WAV, FLAC or Ogg (Opus or Vorbis) clip that
runs longer is refused before any request, its length read from the file; an
MP3's length is not read, and only its first 30 seconds count. With no model
named and `XOR_MODEL` unset, a request carrying media or a `value` question goes
to `xor-omni` and is checked against its window (the catalog's
`decide.capableModel`). AAC/M4A is refused by name: it was
measured decoding to nothing while the request was still answered. A WAV without
a complete `fmt` and `data` chunk is refused too.

The result carries `mediaBytes`, the encoded size of the media sent. The
`decide` spans carry `decision.images.count`, `decision.audio.count` and
`decision.media.bytes`, and
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
> `cloudflare-clef` takes 0.3 to 1.0 s for a small request and 1.1 to 1.3 s for
> 64 questions (measured 2026-10-03). A 64-question request with the same
> questions and a shorter state took 1.5 s on `clef-flash` and 2.3 s on `clef` on 2026-10-04; see
> [its latency section](../getting-started/providers/cloudflare-clef.md#latency-and-the-timeout).
> `openai-decisions` has not been timed: its latency is not measured. `scaledown`
> has been timed only lightly: 265-token requests took 0.3 to 9.8 s on
> 2026-10-20, and a `choice` question is scored once per option, so a request
> with many options may need a larger `timeoutMs` than its 30-second default; see
> [its timeouts note](../getting-started/providers/scaledown.md#timeouts).

On TypeSafe, 400 questions cost ~70 ms more than one. **Concurrent requests, by
contrast, queue**: ten parallel calls take ~1.4 s wall with nine landing together
at the end, while the server's own upstream time stays flat at 64–169 ms.

So on TypeSafe, 400 things in one request take ~465 ms; the same 400 as separate
requests take roughly a minute. Add every question you _might_ need to the call
you are already making — speculative questions are nearly free on TypeSafe (on
Perplexity each costs about 65 ms, up to 128 in a request; Cloudflare Clef takes
up to 64), and a second round trip is not.

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
latency and the confidence it reports. The
[Cloudflare Clef guide](../getting-started/providers/cloudflare-clef.md) gives its
latency; a prompt NeuroLink estimates over 16,000 tokens is refused there and
routing falls back to the heuristic, as it does on any failure.

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
with size; `cloudflare-clef` took 0.3 to 1.0 s for a small request on 2026-10-03, and its
endpoint refuses nothing below 16,000 estimated state tokens, but a state that large takes seconds).
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

### One funnel for all five sites

Every one of those calls is stamped with a `site` — `routing`, `toolRouting`,
`contextRelevance`, `summaryGate` or `ragPlan` (the `DecisionSite` union) — and
goes through one private path on `NeuroLink`, which is also where a bound
`tryDecide()` lands. For the four sites that run inside a NeuroLink request —
`routing`, `toolRouting`, `contextRelevance` and `summaryGate` — that path
forwards the outer `generate()` / `stream()` call's per-call `credentials`,
`abortSignal` and `requestId` (the top-level option, else
`context.requestId`) to the decision, so a request that carries
`credentials: { laya: {...} }` routes and compacts against _that_ account
rather than the instance's; for `routing` the per-call credentials also count
towards the `auto` strategy's activation, so a host that holds no decision key
itself still routes a request that carries one. `ragPlan` runs inside a
host-wired `RAGPipeline`, outside any NeuroLink request, so it receives only
what the host puts on the options it hands `tryDecide` (see "Host-wired
consumers" below). The path also adds `decision.site` and
`decision.host_question_count` to the `model.decision` span; emits
`decision:before` / `decision:after` on the instance emitter; and runs the
`decisionHooks` described next. Without hooks or listeners, the decision
payload — state and questions — is unchanged; per-call `credentials` are still
forwarded, so the full request on the wire (account, base URL) can differ from
the instance's.

---

## Riding along: `decisionHooks`

Latency on a decision model is flat in question count, so a host with its own
questions about the same request pays nothing to ask them in the round trip
NeuroLink is already making. `decisionHooks` on the constructor does exactly
that — one request per site, never a second:

```ts
const neurolink = new NeuroLink({
  classifierRouter: { enabled: true, pool },
  decisionHooks: {
    // Called before each site's call with NeuroLink's own questions. Return
    // extra questions under ids of your choosing, or undefined to add none.
    extendQuestions: ({ site, state }) =>
      site === "routing"
        ? {
            tone: { type: "boolean", instructions: "Is the request polite?" },
            team: {
              type: "choice",
              instructions: "Which team owns this?",
              criteria: { payments: "Money movement", platform: "Rest" },
            },
          }
        : undefined,
    // Called with YOUR answers under YOUR ids, plus the full result.
    onAnswers: ({ site, answers, result }) => {
      const team = readDecisionChoice(answers, "team");
      if (team && team.confidence > 0.7) {
        tagRequest(team.choice);
      }
    },
  },
});
```

What the funnel guarantees:

| Concern                 | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Id collisions           | Host questions travel as `host__0`, `host__1`, … on the wire, so they can never collide with `difficulty`, `model`, `server__N`, `msg__N`, …; `onAnswers` maps them back to your ids.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Malformed questions     | Each is checked at runtime (`isDecisionQuestion`); an invalid one is dropped with a warning, its siblings still go.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| The provider's cap      | Additions are capped at `maxQuestions − NeuroLink's own count`, dropped from the end with a warning. Without this one question too many would refuse the WHOLE request, and NeuroLink's routing would degrade. This is a count cap, and Laya, XOR (128), Clef, Perplexity and OpenAI Decisions all declare one. TypeSafe caps a request by tokens, not by count: its `decisionLimits()` reading has **no `maxQuestions` key** (absent, never `Infinity`), and every well-formed addition goes on the wire. For TypeSafe (`enforcedLocally: false`) size your questions with `decisionLimits()` and `estimateDecisionStateTokens()` — an over-long host question can still make the request exceed its state-plus-question or combined-request budget, and that refusal is not caught locally. A host question the provider cannot answer — a type outside its `questionTypes`, or a `choice` or `score` past its per-question cap — is dropped on its own, with a warning. |
| A throwing or slow hook | Logged at `warn`; the decision proceeds with NeuroLink's own questions. Each hook is bounded by `hookTimeoutMs` (default 2000 ms) because both sit on the request path; the bound must be a finite number from 1 to 2^31 − 1 ms — anything else, `Infinity` included, falls back to the default with one warning, because a timer given such a delay fires immediately. Neither hook can change what NeuroLink does with its own answers — `onAnswers` and the events receive copies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| An unreadable return    | A return value from `extendQuestions` that cannot be read or copied (a proxy, a throwing getter, a function-valued field) is treated as a hook failure: logged at `warn`, and the decision proceeds with NeuroLink's own questions. Every question that is accepted travels as a copy, so editing your object after the hook returned changes nothing on the wire.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| A throwing listener     | A `decision:before` / `decision:after` listener that throws is logged at `warn` and the call continues; the events are observe-only, and their `state` / `questions` / `answers` are copies — editing them changes neither the request on the wire nor NeuroLink's own question objects.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NeuroLink's consumers   | See only their own ids, exactly as without hooks. If anything host-facing throws after the call returned, the consumer still gets its own answers from that call; if it throws before, the call is made with NeuroLink's own questions. A host cannot turn a decision into an exception.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Host-wired consumers    | A `RAGPipeline` or `ClassifierRouter` you constructed with `decide: (o) => neurolink.tryDecide(o)` gets the same treatment — the consumer stamps the site, `tryDecide` honours it. Overriding or patching `decide()` on the instance is honoured too: every site call, `tryDecide` included, dispatches through it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Question ids            | Your ids are ordinary map keys — `__proto__` or `constructor` come back under exactly that name in `onAnswers` and `hostAnswers`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| No hooks, no provider   | Nothing changes. Without a decision provider — none in the environment, the instance `credentials` or the request's per-call `credentials` — no hook runs and no event fires; `tryDecide` returns `null` exactly as it did before hooks existed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

The two events are observe-only and fire once per site call whether or not it
produced a result, so a decision path that has stopped working stays visible:

```ts
import type { DecisionAfterEvent } from "@juspay/neurolink";

neurolink.getEventEmitter().on("decision:after", (event) => {
  const { site, answers, hostAnswers, latencyMs, provider, model, result } =
    event as DecisionAfterEvent; // result is null when the call failed
});
```

`decision:before` carries `{ site, state, questions, hostQuestionCount }` —
everything about to be sent, host questions already namespaced — plus the
`sessionId` and `requestId` of the surrounding request, so a host can join the
events of one turn. Both events fire only when a decision provider is
configured; without one there is no call to observe.

---

## Limits and gotchas

### Reading the limits before you send: `decisionLimits()`

`neurolink.decisionLimits({ provider?, model?, credentials? })` returns the
figures the pre-flight check compares against, resolved for one model —
provider as `decide()` resolves it, model as `model ?? the model decide() sends`
(the one registered for the provider: `LAYA_MODEL` / `TYPESAFE_MODEL` as read
when providers were registered, else the default — a later change to the
variable moves neither), the per-model entry flattened over the base:

```ts
const limits = neurolink.decisionLimits(); // null with no decision provider
// laya, typed-decisions → { provider: "laya", model: "typed-decisions",
//   maxStateTokens: 768, maxQuestions: 64, nonAsciiTokensPerChar: 1.5,
//   enforcedLocally: true }
// typesafe → { maxStateTokens: 33000, enforcedLocally: false }
//   (no maxQuestions key: TypeSafe caps by tokens, not by count)
// xor, xor-latest → { maxStateTokens: 120000, maxQuestions: 128,
//   questionTypes: ["boolean", "choice", "score", "value", "choice-unknown"],
//   maxScoreLevels: 10, maxChoiceOptions: 64, nonAsciiTokensPerChar: 1,
//   media: { maxImages: 1, video: false, maxRequestBytes: 25000000,
//     audio: { maxSeconds: 30 } },
//   enforcedLocally: true }
//   (28,000 on xor-omni; `media` is absent for the text-only providers, and
//   `questionTypes` for every provider that reads only the default three)
// openai-decisions → { maxStateTokens: 922000, maxQuestions: 200,
//   media: { maxImages: 8, video: false, maxRequestBytes: 33554432 },
//   enforcedLocally: false }
//   (922,000 is the model page's input figure, reported and never enforced;
//   200 is the question cap in OpenAI's Python SDK: tryDecide() splits at it
//   and host additions stop at it, but decide() does not refuse above it, and
//   going over was not tried live; the three media numbers are NeuroLink's own
//   allowance, not OpenAI's)
// scaledown → null: it declares no limits, so a named call reads null and
//   nothing is refused locally on the size of a state

if (
  limits &&
  estimateDecisionStateTokens(state, limits) > limits.maxStateTokens
) {
  state = shorten(state);
}
```

`maxQuestions` is present only for a provider that caps by question count
(Laya, XOR, Cloudflare Clef, Perplexity, OpenAI Decisions); a reading without the
key has no count cap, and a host should test
for the key rather than compare against `Infinity`. `media` is present only
for a provider that reads images or video (XOR, Perplexity, Cloudflare Clef,
OpenAI Decisions); its absence is what the media refusal for TypeSafe, Laya, SubQ
and ScaleDown is based on.

`enforcedLocally` says who refuses: NeuroLink itself, before any network call
(Laya and XOR, whose servers would silently truncate or fail inside the
engine), or the provider's server
(TypeSafe and OpenAI Decisions, whose descriptor rows are marked `advisory` and are
_reported_ but never enforced here — a local refusal would turn a server ceiling
into a client one that drifts from it). `estimateDecisionStateTokens` is the very
function the pre-flight refusal uses, so a state it sizes as fitting is sent
and one it sizes as over is refused; pass the reading so non-ASCII text is
charged at the model's measured rate. A named `provider` is read whether or
not it is configured — its limits are facts about the model — while the
default requires a configured provider, as `tryDecide()` does.

**Laya reads far less than Jev.** About 768 tokens of state on
`typed-decisions` and `multilingual`, and 320 on `english`, `auto` or an
unrecognised model name, against Jev's ~33,000. Laya's server does not refuse a
longer state; it answers from the first 1,024 tokens (512 on `english`). So the
provider estimates the state's size — counting non-Latin characters at a rate
measured per checkpoint — and refuses anything over the limit locally with
`max_tokens_exceeded`, before any network call. The estimate errs toward
refusing.

**XOR's two models have different windows.** Measured through a LiteLLM gateway
in October 2026: `xor-latest` reads 131,072 tokens and `xor-omni` 32,768, and
each refuses a longer input. NeuroLink allows 120,000 and 28,000 estimated
tokens of state (about four characters per token for ASCII, one token per
character for other scripts), leaving room for the questions, about 600 tokens
for an image and about 25 a second of audio, and refuses more locally with
`max_tokens_exceeded`. Dense text — JSON, digits — runs above the estimate, so a
state near the limit can still be refused by the server; that arrives as
`max_tokens_exceeded`, not retried. A request takes up to 128 questions (more is
split by `tryDecide()`), a `choice` 2 to 64 options counting `unknown`, and a
`score` 2 to 10 levels; past any of these it is refused before any request. The
timeout grows with the state: 5 seconds plus 150 ms for every full 1,000
estimated tokens, because a 120,000-token state took about 18 seconds.

**Perplexity's input ceiling covers more than the state.** Measured on a real
account in October 2026: the server reads under 262,144 input tokens per request,
counted over the state, the questions and the images, and refuses input of
262,144 tokens or more with an explicit 400 instead of cutting the state off.
Images are billed as input tokens, about one for each 32 × 32 tile plus 95 to
103 more in the single-image requests measured, which looks like fixed request
overhead and not a charge per image. They count toward the ceiling at one token
for each tile: eight 2,048-tile images added 16,384 to a request that was then
refused. It takes at most 128 questions and 8 images. The documented
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
server. A request that passes it can also be refused when the questions or the
images push the input over. That refusal arrives as `max_tokens_exceeded` too,
whichever of the server's two wordings it uses (one for text alone, one when
images are in the request), and is not retried. A state estimated above the window
needs a smaller state or another provider: no setting raises it, so a larger
state that would fit the server can be sent only through a decision provider with
a larger window. Perplexity documents a request rate of 10 per second for the
account's tier, and on the account tested 14 parallel requests got 10 answers and
4 replies of 429.

**The Workers AI endpoint's state window changed (hosted service or model:
unknown).** On 2026-10-03 and 2026-10-04 it ignored Clef state text past about
2,048 tokens, far less than the documented 64K (a 133-call follow-up on 2026-10-04
found the same cut on both models). On 2026-10-07 `clef-flash` read a fact at the
very end of states of 190,153 tokens (a digit array) and 86,819 (prose), and
`clef` read 52,154 tokens of prose and answered HTTP 529, code 5012, for the
190,153-token array.

The estimator charges digits 1 token each, punctuation 0.75, astral characters
3 and other non-ASCII characters 1.5, with other text about 4 characters a token.
It refuses more than 16,000 estimated state tokens with `max_tokens_exceeded`,
before any network call: at most about 18,400 real tokens (it counts prose 35%
over and a digit array 14% under), 2.8 times fewer than `clef` was seen to read.
The rates now approximate real tokens and no longer stand for a cut; other object
shapes and Unicode sequences may differ.

A request takes at most 64 questions (`tryDecide()` splits larger maps) and
four images. Exactly four succeeded and a fifth was refused on both models.
NeuroLink retains a 256,000-byte cap for the encoded body, including base64
images. Both models accepted 520,000 text characters and refused 525,000 with
413/code 5021 on 2026-10-04; `clef-flash` had accepted 262,000 and refused
270,000 on 2026-10-03.
On 2026-10-05 both models accepted PNG request bodies up to 492,485 bytes and refused
532,505 (`clef-flash`) and 532,499 (`clef`) with the same 413; the reason the limits
moved is unknown.
See the [Clef guide's limits](../getting-started/providers/cloudflare-clef.md#limits).

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
lists the timeout setting for each built-in consumer. On 2026-10-03 Cloudflare Clef
answered a small request in 0.3 to 1.0 s, and 64 questions in 1.1 s on `clef-flash`
and 1.3 s on `clef` (1.5 s and 2.3 s on 2026-10-04); its default timeout is 5 s, and `timeoutMs` changes it for one call.

**Privacy**: when enabled, the `state` you send leaves the machine. For model
routing that is the prompt text; for compaction and tool routing it is earlier
conversation text. With no decision provider configured, nothing is transmitted.
A `PERPLEXITY_API_KEY` set for the Perplexity text provider counts as a decision
provider's key, so with it set and none of TypeSafe, Laya, XOR or SubQ configured, the
state of a decision goes to Perplexity. The provider guide lists
[what each consumer sends](../getting-started/providers/perplexity-decider.md#what-is-sent-to-perplexity).
Likewise `CLOUDFLARE_API_KEY` with `CLOUDFLARE_ACCOUNT_ID`, set for the Workers AI
text provider, counts as a decision provider's credentials: with them set and none
of TypeSafe, Laya, XOR, SubQ or Perplexity configured, the state of a decision goes to
Cloudflare. And an `OPENAI_API_KEY` set for the OpenAI chat provider counts as a
decision provider's key as well: with it set and none of the six earlier
providers configured, the state of a decision goes to OpenAI, unless
`OPENAI_BASE_URL`, `OPENAI_API_BASE` or `credentials.openai.baseURL` names another host than
`https://api.openai.com`, in which case that key is a gateway's and is not used
by default. `SCALEDOWN_API_KEY`, which nothing else reads, sends the state to
ScaleDown when it is the only decision key.

**No model-registry lookup**: a decision provider reads its own model setting
(`<PROVIDER>_MODEL`, else its default), so `decide()` does not load the model
registry that chat providers use to look up a default model (`MODEL_CONFIG_URL`,
else `http://localhost:3001`, then the GitHub copy of `config/models.json`, then
`./config/models.json`). The registry lists no decision provider.

**Cost**: TypeSafe, $0.042 per million input tokens, output free. Perplexity,
$0.04 per million input tokens (image tokens included), output free. Cloudflare
Clef, $0.24 per million input tokens for `clef` and $0.09 for `clef-flash`;
no output price is listed. OpenAI Decisions, $0.10 per million input tokens, input
only, from [OpenAI's Decisions guide](https://developers.openai.com/api/docs/guides/decisions)
as read on 2026-10-07; regional and long-context multipliers are not modelled.
ScaleDown, USD 0.05 per million input tokens, output not charged: a list price from
its launch post and a response's `usage.cost`, reported to this project by the
marketing session on 2026-10-15 and not measured here. NeuroLink prices ScaleDown
from the reply's input tokens at that rate and does not read `usage.cost`.

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
- **Untrusted input.** Any text in `state` can steer a verdict: a user prompt,
  a ticket, an earlier message, a retrieved document, tool output, a
  transcript, a third-party server's description. A decision model can only
  return an option you offered, but text written to push it can still pick the
  option the author wants. The built-in consumers are advisory and fail-open,
  and none of them feeds human-in-the-loop approval or a guardrail. Their reach
  is bounded, not zero. For example, a steered verdict can withhold a declared
  server's tools for the turn, drop earlier messages (up to half of the
  eligible ones by default), change the model tier or pick any configured
  model, set a retrieval plan (`topK`, hybrid, graph, rerank), lower the
  compaction threshold for one request, or decide whether a transcript
  substitution is applied. Each stays inside what the host configured: a model
  pick must be a configured candidate, a retrieval plan cannot switch on a
  capability the pipeline lacks, and the compaction threshold can only stay at
  or go below its 0.8 default. Tools and messages go only on a confident "no" (0.6 by
  default). A tier verdict at or above neutral clears a 0.3 bar (default) and
  one below it a 0.6 bar (default), and a risk reading above 0.7 raises the
  tier to "hard" or above with no bar. Confidence does not defend against this:
  it says how decided the model is, not whether the text was written to steer
  it. Do not make a `decide` verdict the only check before an irreversible or
  security-sensitive action; keep a deterministic check or a human approval in
  front of it.

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
