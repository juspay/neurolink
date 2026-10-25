---
name: neurolink-decide
description: "Use when working on NeuroLink's decide inference type: neurolink.decide() and tryDecide(), the decision providers (TypeSafe, Laya, XOR, SubQ, Perplexity, Cloudflare Clef, OpenAI Decisions, ScaleDown), SystemOneDecisionProvider and the decide dialects, decisionLimits, siteDecide and decisionHooks, or any of the five internal decide call sites (model routing, tool routing, context relevance, the summary gate, RAG planning)."
---

# The `decide` inference type

Moved out of the root CLAUDE.md. The `transcribe` inference type is in `src/lib/voice/CLAUDE.md`.

`generate`, `stream`, `decide` and `transcribe` are peers. The first two assume
the model emits text; `decide` does not — a decision model takes one `state`
plus a map of named typed questions and returns one typed, calibrated answer
each in a single parallel pass, with no text anywhere. `transcribe` starts from
audio instead of text (see `src/lib/voice/CLAUDE.md`). `InferenceKind`
includes `"transcribe"`, but no `ProviderDescriptor` declares it: STT providers
are chosen from their own list, `STT_PROVIDER_DESCRIPTORS`.

The discriminator is one field on `ProviderDescriptor`:

```ts
inferenceKinds?: readonly InferenceKind[] // "generate" | "stream" | "decide" | "transcribe"
```

Omitted means `["generate","stream"]`, so every text provider keeps its
meaning. For the text and decision providers this is the **only declarative
statement of provider modality** in the codebase (STT has its own list, above) —
before it, modality was implied by `toolSupport`, `healthCheck` and
the auto-select ranks, which is why embedding-only providers (voyage, jina)
have to implement `getAISDKModel()` as a throw. Anything that builds a
generation fallback chain, runs the health sweep or offers model choices must
filter on `inferenceKinds` rather than special-casing a provider name.

`AIProvider.decide?()` is optional and `BaseProvider` supplies a throwing
default, exactly as `embed()` does. Public surface is `neurolink.decide()` and
`neurolink.tryDecide()` — the public fail-open variant, which returns `null`
instead of throwing (a question map over the provider's cap is split into
batches; a failed batch costs only its own answers, and `null` comes back only
when every batch fails); the internal consumers get the same contract through
the private `siteDecide` (see below) — plus the CLI's
`neurolink decide [state]`, a thin wrapper over `decide()` (`src/cli/commands/decide.ts`).

**Decision providers; descriptor order is precedence.** TypeSafe (Jev,
hosted), Laya (open weights, at a configured base URL — there is no default),
XOR (open weights that also reads an image and audio and extracts typed values,
likewise at a configured base URL), SubQ (`subq`, described below), Perplexity (`perplexity-decider`, the hosted Decisions API; it also reads
images, no video, at the public `https://api.perplexity.ai`, so a key alone
configures it), Cloudflare Clef (`cloudflare-clef`, on Workers AI; it also reads
images, no video, at Cloudflare's own API, so a token and an account id configure
it) and OpenAI Decisions (`openai-decisions`, OpenAI's hosted Decisions API in
public beta; it also reads images, no video, at the public `https://api.openai.com`,
so a key alone configures it) and ScaleDown (`scaledown`, hosted Classify models,
text only, at the public `https://api.scaledown.xyz`, so a key alone configures
it; described below) all extend `SystemOneDecisionProvider` in
`src/lib/providers/systemOneDecision.ts`,
which owns the request loop, retries, the auth circuit breaker and answer
parsing; each provider supplies only its endpoint, headers, body and error
parsing. OpenAI Decisions is the one whose wire is not System One's (named
questions in an array, an array of answers), so its catalog entry names
`decide.dialect: "openai-decisions"`, translated by
`src/lib/providers/decide/dialects/openaiDecisions.ts`; the Laya, XOR and SubQ entries
use the `system-one` dialect, as does ScaleDown. `resolveDefaultDecisionProvider()` returns the first
`DECISION_PROVIDERS` entry that is fully configured (a key, plus a base URL for
Laya and XOR, which have no built-in endpoint), in `decideOrder` order (the list is
sorted by each descriptor's `decideOrder`, not by its position), so TypeSafe's 1
before Laya's 2, Laya's before XOR's, XOR's before SubQ's, SubQ's before
Perplexity's, Perplexity's before Clef's, Clef's before OpenAI Decisions', and OpenAI
Decisions' before ScaleDown's, is what makes
TypeSafe win whenever either of its keys (`TYPESAFE_API_KEY`, `AI_GATEWAY_API_KEY`)
is set alongside `LAYA_API_KEY`, `XOR_API_KEY`, `SUBQ_API_KEY`, `PERPLEXITY_API_KEY`,
`CLOUDFLARE_API_KEY`, `OPENAI_API_KEY` or `SCALEDOWN_API_KEY`. Reordering them changes which model
every built-in consumer uses. The three providers whose keys
are shared with a text provider (Perplexity, Clef and OpenAI Decisions) stay
behind every provider a host sets up on purpose, except ScaleDown (below): a provider added after
them would be displaced by an ambient key. SubQ sits ahead of them only because
`SUBQ_API_KEY` belongs to no other provider. ScaleDown's key belongs to no other
provider either, yet ScaleDown sits last, after those three, by the owner's decision of
2026-10-15 (`decide.order` 8): an ambient `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` or
Cloudflare pair outranks a `SCALEDOWN_API_KEY` a host set on purpose, and ScaleDown
is reached by naming it. Test 18.4 pins `scaledown` as the last entry.

**SubQ comes after XOR and ahead of Perplexity, Clef and OpenAI Decisions, and it is a catalog entry, not a class.**
`src/lib/providers/catalog/subq.json` describes Subquadratic's hosted SubQ Snap
(`subq`, aliases `subquadratic` and `subq-snap`; `decide.order` 4) and
`ConfiguredDecisionProvider` runs it, on the System One wire at
`https://api.subq.ai/v1/systemone` (`wire.baseURL` is the default base, so
`SUBQ_BASE_URL` and `credentials.subq.baseURL` replace it). `SUBQ_API_KEY` alone
configures it, so any test that asserts the "nothing configured" path must blank
it with the other decision keys. Its `decisionLimits` are `advisory`: 376,000
estimated state tokens is a margin under the largest request SubQ answered
(376,180 input tokens), and the entry's `contextWindow: 393216` is the maximum
model length SubQ's own HTTP 400 response states (both observed live on
2026-10-13). Both are advisory and neither is a guarantee, and no test or doc may
word them as what SubQ accepts; an over-length request is refused with a 400 that
NeuroLink classifies as `invalid_request`. It declares no media, because SubQ wants image objects (`mediaType` plus `base64`)
that the catalog cannot describe yet. 402 and 403 are `invalid_request`, not
`authentication`, so a top-up needs no new instance. Its fixture's 200 body was
captured on 2026-10-13, and one error row (the over-length 400) is a saved live body; every other error body in it is a stand-in.

**Perplexity's key is shared with the `perplexity` text provider.** Both read
`PERPLEXITY_API_KEY`, so an ambient key set only for Sonar also configures
`decide`, as the fallback after TypeSafe, Laya, XOR and SubQ. Any test that asserts the
"nothing configured" path must blank `PERPLEXITY_API_KEY` as well as the other
decision keys, and docs must say so plainly. `credentials.perplexity` (the text
provider's slice) does not configure it; `credentials.perplexityDecider` does.

**OpenAI Decisions' key is shared with the `openai` chat provider.** Both read
`OPENAI_API_KEY`, so an ambient key set only for chat (or for `whisper`, which
reads it too) also configures `decide`, as the default after TypeSafe,
Laya, XOR, SubQ, Perplexity and Clef (`decideOrder` 7; only ScaleDown, 8, follows it). The five internal consumers
(routing, tool routing, context relevance, the summary gate, RAG planning) and
the STT correction guard (for a host that passes a dictionary) then make paid
decision calls, though they still fail open. A test that asserts the "nothing
configured" path must blank `OPENAI_API_KEY` too (and `OPENAI_DECISIONS_*`), and
docs must say so plainly. `credentials.openai` (the chat provider's slice) does not
configure it; `credentials.openaiDecisions` does. **A gateway's key is never used
for the default.** `OPENAI_API_KEY` is also the key of every OpenAI-compatible
gateway, so the entry carries `decide.ambientKeyGuard` (`baseURLEnvVars`
`OPENAI_BASE_URL` and `OPENAI_API_BASE`, `credentialBaseURLs`
`credentials.openai.baseURL`, which the chat provider prefers over the variable,
`trustedOrigins` `https://api.openai.com`): `resolveDefaultDecisionProvider()`
skips a key found only in the environment while a listed variable, or a listed
field of the credentials it is given (the instance's merged with the call's), is
set to something whose origin (scheme, host, port, case-insensitive; path,
trailing slash and `/v1` ignored) is not trusted, and an unparseable, non-text or
non-http(s) value counts as untrusted. It does not apply when
`OPENAI_DECISIONS_BASE_URL` is set (the host routed this provider on purpose) or
when `credentials.openaiDecisions` supplies a key or a base URL, and never to a
call that names `provider: "openai-decisions"`, which uses the environment key
whatever `OPENAI_BASE_URL` or `credentials.openai.baseURL` says and sends it to
`https://api.openai.com`; so a gateway host must route this provider with
`OPENAI_DECISIONS_BASE_URL` or `credentials.openaiDecisions`, or not use it, and
must not name it. It is data on the entry, read by `isDecisionProviderConfigured`,
and no other provider has one. Any test that asserts a default must also blank
`OPENAI_BASE_URL` and `OPENAI_API_BASE`, and pass no `credentials.openai.baseURL`.
`neurolink.decide()` builds a
fresh provider for every call, so a rejected ambient key costs one failing request
per decision site and the 401 breaker never latches across public calls. The model
resolves from `OPENAI_DECISIONS_MODEL`, never from the chat provider's
`OPENAI_MODEL`: `AIProviderFactory.resolveModelFromEnvironment` skips a descriptor
whose `inferenceKinds` is exactly `["decide"]`, because it picks its variable group
by substring and `"openai-decisions"` contains `"openai"`. Its `decisionLimits` row
is `advisory: true` (922,000 state tokens from the model page, reported and never
enforced) with `maxQuestions: 200` (the figure in OpenAI's Python SDK, "Ask 1–200
questions about the input", read from documentation: `tryDecide()` splits at it and
host additions stop at it, but `decide()` does not refuse above it) and `media` of
up to 8 images, no video and a 32 MiB body; those last three are NeuroLink's own
allowance, not OpenAI's. What the public-beta endpoint accepts beyond that (what
it does with more than 200 questions, option counts, image formats, rate limits,
how it rounds probabilities) is not established: no live request has been made, so
docs and comments say "not measured" and never state a result about its accuracy,
speed or cost.

**Clef's token and account id are shared with the `cloudflare` text provider, and
the Workers AI endpoint ignored state text past about 2,048 tokens until
2026-10-04 and read far more on 2026-10-07 (hosted service or model: unknown).** `CLOUDFLARE_API_KEY` and
`CLOUDFLARE_ACCOUNT_ID` also configure `decide`, as a fallback after TypeSafe, Laya,
XOR, SubQ and Perplexity (OpenAI Decisions and ScaleDown come after it); a test that
asserts the "nothing configured" path must blank both (and `CLOUDFLARE_CLEF_*`).
`credentials.cloudflare` does not configure it; `credentials.cloudflareClef` does,
and its `accountId` stands in for `CLOUDFLARE_ACCOUNT_ID` through the descriptor's
`extraRequiredCredentialFields`. Cloudflare documents a 64K context. Workers AI
ignored text past about 2,048 tokens without an error until 2026-10-04 (both
models) and on 2026-10-07 read at least 190,153 tokens (`clef-flash`) and 52,154
(`clef`, which answered HTTP 529 for the 190,153-token array), so the descriptor
declares 16,000 estimated tokens (at most about 18,400 real ones, 2.8 times
fewer than `clef` was seen to read), `digitTokensPerChar: 1` (the tokenizer reads
every digit alone) and 1.5 tokens per non-ASCII character, and the provider adds
250 ms of default timeout per 1,000 estimated tokens. The encoded request cap stays
256,000 bytes. On 2026-10-03,
`clef-flash` accepted 262,000 text characters and refused 270,000. On 2026-10-04
both models accepted 520,000 text characters and refused 525,000 with 413/code 5021. Refusal estimates are the encoded body bytes / 4 (rounded up in seven of eight refusals, one lower in the eighth); what
changed was the threshold, from between 65,527 accepted / 67,527 refused to
130,026 / 131,276 (`clef`) and 130,027 / 131,277 (`clef-flash`). The error still
prints 65,536. Inference:
the new interval contains 131,072, twice that figure; the reason is unknown.
Four images and `image/jpg` succeeded on both models; Clef normalizes the alias
to `image/jpeg`. Natural-script and many-key-object cuts fit the existing rates. The decide
suite's live canaries 19.10 and 19.10b fail if the service stops reading a state just under
NeuroLink's own limit on either model, and 19.11 if the text-only request ceiling moves. On
2026-10-07 the endpoint read states of at least 190,153 tokens (`clef-flash`) and 52,154 (`clef`),
which is why the limit above went from 1,500 to 16,000 estimated tokens.
Only a 401 trips Clef's auth breaker (a 403 was never seen and must not latch the
instance), and a `credentials.cloudflareClef` slice that names its own `baseURL`
never borrows `CLOUDFLARE_API_KEY`.

**ScaleDown is the last decision provider, it is a catalog entry, and its key is its own.**
`src/lib/providers/catalog/scaledown.json` describes ScaleDown's hosted Classify
models (`scaledown`, alias `scaledown-classify`; `decide.order` 8) and
`ConfiguredDecisionProvider` runs it on the System One wire at
`https://api.scaledown.xyz/v1/scaledown` (`wire.baseURL` is the default base, so
`SCALEDOWN_BASE_URL` and `credentials.scaledown.baseURL` replace it; an origin or an
origin with a path prefix, trailing slashes dropped). `SCALEDOWN_API_KEY` alone
configures it and no other provider reads it, so any test that asserts the "nothing
configured" path must blank it (and `SCALEDOWN_BASE_URL` and `SCALEDOWN_MODEL`) with
the other decision keys. Two optional `decide` fields exist for it, and an entry that
omits them behaves exactly as before: `decide.authHeader` (`"x-api-key"` sends
`x-api-key: <key>` and no `Authorization` header at all; omitted or `"bearer"` is the
Bearer header every other entry sends; decide-local, `quirks.authHeaderStyle` is the
chat path's and is not read here) and `decide.stateEncoding` (`"text"` makes the state
always a string: a string unchanged and untrimmed, any other value as its JSON text,
so `{}` and `[]` go out as text, and a string that is blank after trimming is refused
locally, before any request, as an `invalid_request` that names the rule and never the
state). It declares no `decisionLimits` and no media, so media is refused before any
request (that refusal wins over the blank-state check) and nothing is refused on
size. A 401 trips the auth breaker; 402 and 422 are `invalid_request` and do not
latch; 429 is `rate_limit`; 502 is `server`; a server-sent 504 is `timeout` and is not
retried. Its price is a list price (USD 0.05 per million input tokens, output free; source:
ScaleDown's launch post and the response's `usage.cost`, as reported by the marketing
session on 2026-10-15), in `pricing.ts`'s `_default` row only. The wire facts
(`x-api-key` only, the models `classify-1` and `classify`, 255 options answered and
300 refused with 502, the limit between them not mapped and no local cap, the 429 and 504 texts) come from ScaleDown's documentation and
the marketing session's probes of 2026-10-15, **not from this project**: every reply in
the contract fixture and every 200 reply in the tests is an invented stand-in (the mocked
suite's error texts are the ones the marketing session reported), and the catalog's `contextWindow`
128000 and `maxOutputTokens` 1 are placeholders the schema requires, not ScaleDown
statements. Docs and comments say "not measured" for context size, latency, rate
limits and the option, question and level maximums, and never state an accuracy, a
benchmark or a latency.

**`decisionLimits` refuses what a model cannot read.** A descriptor may declare
`decisionLimits: { maxStateTokens, maxQuestions?, models, media? }`; the base refuses an
over-limit request with `max_tokens_exceeded` before any network call, and every
internal consumer then fails open as usual. A row marked `advisory` (TypeSafe's, SubQ's,
OpenAI Decisions') is not enforced locally: its limits are published for
`NeuroLink.decisionLimits()` to report, and the server handles an oversized state
or question count itself. Unsupported question types and per-question option or
level caps are validated separately, on every row. For the question cap,
`decide()` refuses a longer map on an enforced row, but `tryDecide()` (the door every
consumer uses) splits it at the cap, runs up to four batches at a time and joins the
answers, so a consumer that asks 300 questions of a 64-question provider still
gets its decision. A failed batch loses only its own answers. Laya declares 768 state tokens on
`typed-decisions` and `multilingual`, 320 on `english`, `auto` and any unlisted
name, and 64 questions, because its server answers a longer state from the
first 1,024 tokens without saying so. Non-ASCII characters are charged at a
measured per-checkpoint rate (`nonAsciiTokensPerChar`: 1.5, or 0.6 on
`multilingual`), since the ~4-characters-per-token estimate is several times
too generous for non-Latin scripts. TypeSafe's row is `advisory: true` —
33,000 state tokens, no question-count cap (it bounds a request by tokens) —
so `decisionLimits()` reports it while the pre-flight check skips it and its
server keeps refusing; adding a plain (non-advisory) row to a descriptor
silently turns on local refusal for that provider. XOR declares what was measured
through its LiteLLM gateway in October 2026: 120,000 state tokens on `xor-latest`
and 28,000 on `xor-omni` and any other name (windows of 131,072 and 32,768), 128
questions, `maxChoiceOptions: 64` (counting `unknown`; 64 plus `unknown` crashed
the server) and `maxScoreLevels: 10`, and `media` of one image, no video (the
gateway drops a video without a word, so a blind answer is refused locally) and
one audio clip (`audio: { maxSeconds: 30 }`: the model hears the first 30 seconds,
so a longer WAV, FLAC or Ogg is refused; AAC/M4A is refused because it decodes
to nothing), with a 25 MB body against the server's 24 MiB, all prepared by
`src/lib/utils/decisionMedia.ts`. Its timeout scales with the state
(`timeouts.decideMsPerKStateTokens: 150` on top of `decideMs`), and a 5xx
wrapping the backend's 4xx (`backend 400: …`) is a final `invalid_request`, not a
retried `server`. `decide.capableModel` sends a request with media or a `value`
question to `xor-omni` (and checks its 28,000-token window) when nobody chose a
model — the gateway would otherwise hand it there from `xor-latest` past a
120,000 check. **`decisionLimits.questionTypes` lists what a provider reads**
(absent: `boolean`, `choice`, `score`); XOR adds `value` and `choice-unknown` (a
choice with `unknown: true`). Anything else is refused before any request even on
an `advisory` row, and `siteDecide` drops such a host question on its own, as it
does one past `maxChoiceOptions` / `maxScoreLevels`; the check is
`unsupportedDecisionQuestion` in `utils/decisionLimits.ts`. Perplexity declares a 100,000-token state
window, 128 questions and `media` of up to 8 images and no video, with a 32 MiB
body. Measured on a real account in October 2026: the 128-question and 8-image
caps, the 262,144-token input ceiling (images count toward it, one token for
each 32 × 32 tile), the non-ASCII rates, and the stall on large images with its
2,048-tile rule checked at the edge (each side rounds to the nearest 32; 2,048
tiles fits, 2,050 stalls). Taken from Perplexity's documentation and not
measured: the 32 MiB body. The 100,000 is a deliberate local
window, not a measurement and not the server's limit: the server reads 262,144
input tokens in all and refuses more with an explicit 400, which the provider
reports as `max_tokens_exceeded`. Non-ASCII text is charged 0.5 per character
(measured: CJK 0.46, Devanagari 0.44), a ninth image is refused with a 400, and
the estimate (3.81 characters per token) over-counts English prose (4.34
measured) and runs about 13% low on minified JSON (3.36), which stays far under
the ceiling at the window (about 113,000 real tokens), and much lower on log lines
(1.35, about 281,000 real tokens at the window) and arrays of numbers (1.16, about
328,000), so a state of either, or emoji-heavy text, can pass the window and
still be refused. The
provider also checks image format and the 2,048-tile cap per image locally,
because a larger image stalls the API for about a minute before an HTML 504. XOR,
Perplexity, Cloudflare Clef and OpenAI Decisions are the providers with `media`;
XOR alone takes audio and none takes video; every other provider, ScaleDown
included, refuses media before any request. `maxQuestions` is optional
in `DecisionLimits` and in the `decisionLimits()` reading: absent means "no count
cap", never `Infinity`.

**Not to be confused with `evaluate()`**, which scores an already-generated
response with RAGAS scorers. Different feature, different word, ~20
`Evaluation*` types already taken.

**The degradation contract.** Every internal consumer of `decide` fails open:
with no decision provider configured, behaviour is exactly what it was before.
That is deliberate and load-bearing — and it is also why each consumer records
telemetry even when it does nothing, because a decision path that silently
stopped working is otherwise indistinguishable from one that was never
configured. Decisions carry their own span type (`SpanType.MODEL_DECISION`),
never `MODEL_GENERATION`: folding them together would distort generation
counts, latency percentiles and the output-token aggregate at once.

**Five `decide()` call sites, in four files** — verified with
`grep -rn 'await decide(' src/lib`:

| Call site                         | Powers                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `routing/classifierStrategies.ts` | model routing, the model catalogue AND the per-request context budget — one request, three features |
| `context/contextDecision.ts` (×2) | relevance compaction, and the summary-quality gate                                                  |
| `core/toolRoutingDecision.ts`     | tool / MCP server routing                                                                           |
| `rag/retrieval/searchDecision.ts` | per-query RAG planning (opt-in: `RAGPipeline` only, not the `rag: {}` shortcut)                     |

`routing/modelCatalog.ts` and `context/budgetChecker.ts` are NOT callers: the
catalogue renders candidate lines that the routing call's `model` question
chooses between, and the budget threshold is read out of that same call's
`context` answer. Neither costs a second round trip.

**All five stamp a `site` and funnel through `NeuroLink.siteDecide`.** Each
call site sets `site: "<DecisionSite>"` on the options it hands its injected
`DecisionCallerFn` (`routing`, `toolRouting`, `contextRelevance`,
`summaryGate`, `ragPlan`), and the three internal lambdas that used to call
`tryDecide` directly — the classifier's constructor dep, `contextCompactorDeps`,
tool routing's `decideFn` — now call the private `siteDecide(request, outer)`,
where `outer` carries the surrounding request's per-call `credentials`,
`abortSignal`, `sessionId` and `requestId` (the classifier's arrive on
`ClassifierRouterInput` instead, since its caller is fixed at construction).
`tryDecide` itself routes a stamped request through `siteDecide`, which is how
a host-wired `RAGPipeline` or `ClassifierRouter` gets the same treatment. That
one path runs the host's `decisionHooks` (namespacing host questions as
`host__N`, capping them at the provider's `maxQuestions` when it declares one
— Laya, XOR, Cloudflare Clef, Perplexity and OpenAI Decisions do; TypeSafe does
not, and takes every well-formed addition; a host question the provider cannot
answer is dropped on its own —
splitting answers back), emits `decision:before` / `decision:after`, and adds `decision.site` +
`decision.host_question_count` to the `MODEL_DECISION` span. Without hooks or
listeners the decision payload (state and questions) is unchanged; per-call
`credentials` are still forwarded, so the account and base URL on the wire can
differ from the instance's. The path is fail-open by construction: without a
decision provider it runs no hook and emits no event (null, as before hooks
existed); everything host-facing runs inside one `try`, so a host throw falls
back to the answers already obtained or to a call with NeuroLink's own
questions; and every host-facing value is a `structuredClone` — of the state,
the questions and the result only, never of the request's `images` / `video` / `audio`,
which ride through to the wire as the caller's own Buffers (and the result
keeps `mediaBytes`), so an XOR request gets the same funnel. The wire call
dispatches through `this.decide()`, so an override or patch on the public
method sees every site call. `decisionLimits()` / `estimateDecisionStateTokens`
expose the pre-flight check's own flattening and estimator
(`utils/decisionLimits.ts`); `decisionLimits()` reports the model `decide()`
would send — the one registered for the provider, not a fresh read of
`LAYA_MODEL`. TypeSafe's descriptor row is `advisory: true` and is reported,
never enforced. XOR's reading on `xor-latest` is `{ maxStateTokens: 120000,
maxQuestions: 128, questionTypes: [boolean, choice, score, value,
choice-unknown], maxScoreLevels: 10, maxChoiceOptions: 64,
nonAsciiTokensPerChar: 1, media: { maxImages: 1, video: false,
maxRequestBytes: 25000000, audio: { maxSeconds: 30 } }, enforcedLocally: true }`.
TypeSafe's has no `maxQuestions` key at all — test for the key, never compare
against `Infinity`.
