# Xiaomi MiMo text and streaming pilot

This local source pilot selects Xiaomi MiMo's usage-priced `mimo-v2.6-flash`
model through `https://api.xiaomimimo.com/v1/chat/completions`. Its declared
scope is text generation and streaming. Source preparation, public contract
acceptance, installed-package acceptance, current account/API availability and
delivery are separate gates. This draft gives no live, delivered-provider or
provider-target credit.

## Exact source facts

All pages below are on the vendor's own documentation host, `mimo.mi.com`, and
were retrieved on 2026-10-10 (hashes at the end).

- **Context and output integers.** The model table (`model.md`) shows only the
  rounded labels `1M` and `128K`, so nothing was expanded from it. The integers
  come from two vendor-authored client configurations that bind them to the
  exact id `mimo-v2.6-flash`: the OpenClaw guide (`"contextWindow": 1048576`,
  `"maxTokens": 131072`) and the OpenCode guide (`"limit": { "context": 1048576,
"output": 131072 }`). Both name `https://api.xiaomimimo.com/v1` as the
  pay-as-you-go base URL. The two pages use different client schemas and agree.
  The API reference independently gives `[1, 131072]` as the required range of
  `max_completion_tokens` and a default of `131072` for `mimo-v2.6-flash`; that
  parameter covers visible plus reasoning tokens. No first-party prose or spec
  table states the context integer; the OpenClaw and OpenCode snippets are the
  only bindings, and `1048576` equals `1024 * 1024`.
- **Route and auth.** The API reference documents
  `https://api.xiaomimimo.com/v1/chat/completions` and two alternative headers,
  `api-key: $MIMO_API_KEY` and `Authorization: Bearer $MIMO_API_KEY`. This entry
  uses the Bearer form.
- **Lifecycle.** `mimo-v2.6-flash` is current and is the named replacement for
  the retiring `mimo-v2.5`; it is not itself on a retirement schedule. The
  deprecation page gives `mimo-v2.5` and `mimo-v2.5-pro` a 10:00 (UTC+8)
  switch on 2026-10-14 in its table and 18:00 (UTC+8) in a note on the same page.
  The discrepancy is preserved here; no exact switch instant is certified.

## Billing

The API is usage-priced: the pay-as-you-go page says it "consumes the account
balance based on the actual Token usage". The promotions page describes bonus
credit, obtained through Refer & Earn or new-user registration, that "can be
used to offset pay-as-you-go API usage" and is "currently valid for 40 days".
It also says eligibility, credit amounts and payout rules vary by campaign. The
catalog therefore uses `promotional-credit`, following the
NAVER CLOVA Studio profile (`src/lib/providers/catalog/naver-clova-studio.json`).
This is not a free tier. Whether a payment method or identity verification is
required to obtain a working key was not established for the real-time API, the
credit amount and eligibility were not checked on an account, and prices are
not recorded (the pay-as-you-go page lists CNY and USD and they were not
converted).

## Scope that is deliberately not declared

The capability booleans limit the pilot's declared scope; `false` is not
evidence that the vendor lacks a feature. Tools, vision, structured output and
SDK thinking controls are not declared because none has been probed. The
deprecation page notes that in thinking mode `mimo-v2.6-flash` ignores custom
`temperature` and `top_p`, so a thinking mode exists; this entry exposes no
control for it. Token Plan keys and base URLs are a separate subscription
product and are out of scope.

## Known gaps the local contract cannot close

- **Output-budget field name.** The vendor's request reference lists only
  `max_completion_tokens`. The profile's `quirks.maxTokensField` maps the
  caller's fitted `maxTokens` budget to that field and omits `max_tokens` on
  generate and stream requests. An owned endpoint refuses the obsolete field
  and requires the exact requested budget before answering. This proves the
  emitted local wire contract; actual vendor acceptance and enforcement remain
  unverified. The parameter includes visible plus reasoning tokens.
- **Streaming usage option.** The vendor's reference documents `stream` but
  not `stream_options`. The profile's `quirks.omitStreamOptions` therefore omits
  that extension, preserving ordinary SSE streaming. Returned usage is still
  consumed if the vendor supplies it; no streaming usage completeness is claimed.
- **Environment variable.** The vendor's own examples name `MIMO_API_KEY`. The
  catalog's derived primary variable is `XIAOMI_MIMO_API_KEY`, and `MIMO_API_KEY`
  is read as a fallback through `wire.apiKeyFallbackEnvVars`, the mechanism the
  Sakana AI entry also uses. Removing the fallback is a one-line change if the
  maintainers prefer the pure convention.
- **Ceilings are source-bound only.** The shared wire builder fits the output
  budget only to runtime-discovered ceilings, so the catalog's `contextWindow` and
  `maxOutputTokens` never appear on the wire, and no public CLI command or SDK
  export was found that reads them back. The owned endpoint cannot observe
  them; they rest on the cited source bindings alone.

## Local public contract

`test/continuous-test-suite-xiaomi-mimo-pilot.ts` retains its original 12 cases through the
built public SDK and built CLI, with optional `--package-root` support for a
later installed consumer:

| Cases                                                    | Count | Required observation                                                                                                                                                                    |
| -------------------------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK/CLI generate/stream default                          |     4 | Actual catalog default, route, Bearer header, unique user prompt, `max_completion_tokens: 32`, no `max_tokens` or `stream_options`, stream mode, no tools/tool choice, and fresh answer |
| SDK/CLI generate/stream invalid explicit id              |     4 | All wire preconditions pass before HTTP 400 rejection; no fallback or successful reply                                                                                                  |
| SDK and CLI generate, only `MIMO_API_KEY`                |     2 | The vendor-documented variable alone reaches the wire as the Bearer credential                                                                                                          |
| SDK generate, both variables set                         |     1 | `XIAOMI_MIMO_API_KEY` wins; the fallback's value never reaches the wire                                                                                                                 |
| SDK generate, no key                                     |     1 | Refusal before any request, naming `XIAOMI_MIMO_API_KEY`                                                                                                                                |
| SDK/CLI generate/stream, budgets 7 and 64                |     8 | Exact caller budget reaches `max_completion_tokens`, with neither obsolete budget nor unverified stream options                                                                         |
| SDK/CLI generate/stream LongCat controls                 |     4 | Unrelated profile retains `max_tokens` and its ordinary streaming usage option                                                                                                          |
| Owned fixture calibration, obsolete budget/stream option |     2 | Direct listener controls refuse wrong fields with HTTP 400 before serving a model; these are fixture controls, not SDK/CLI execution                                                    |

Total: 26 cases, comprising 24 public SDK/CLI cases and two fixture calibration
controls. The original case identities, credential/model negatives, deadlines and
caller intent are preserved; output-field assertions are strengthened to the
documented contract. No other catalog profile opts into the two dialect fields.

The fixture strips real credentials before imports, uses temporary homes and
sets the provider route to its owned random-port listener. Public
`MODEL_CONFIG_URL` uses that same listener's `HEAD /health` and
`GET /api/v1/models`. A schema-valid empty registry keeps the provider's actual
catalog default in control. Positive metadata initialization requires the exact
ordered request pair; explicit CLI model paths require no metadata request.
CLI commands keep a 60-second deadline. The suite makes no vendor call, creates
no account and reads no secret.

The validated source invocation and public-suite command are:

```sh
pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage source --provider xiaomi-mimo
pnpm exec tsx test/continuous-test-suite-xiaomi-mimo-pilot.ts
```

## Provenance and remaining gates

The legacy `evidence.rosterVerified` slot carries the explicit
`PUBLIC_DOCS_ONLY_NOT_ROSTER_VERIFIED` marker and documentation methods; it has
no HTTP status, auth probe or roster. `billingProbe` is likewise documentation
only. `liveMatrix` is null. `addedInPR` holds the canonical introduction PR URL,
`https://github.com/juspay/neurolink/pull/1977`; it was `PENDING_PR` in the
first commit, before the PR existed. A URL alone is
not proof of merge, and source-stage admission gives no provider-count, roster,
live, installed-package or publication credit.

Authenticated roster, account creation, funding, live inference, installed
consumer acceptance and delivery are separate and not done here.

## Source receipts

Retrieved with a plain `GET` on 2026-10-10; the SHA-256 is of each response body.

| First-party source                                                                        | Body SHA256                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Model table](https://mimo.mi.com/static/docs/quick-start/summary/model.md)               | `26a7f23c7a12410e10cc75610dc9e6c364a637495161f5d41bc2a21e1075ed84` |
| [OpenClaw integration](https://mimo.mi.com/static/docs/tokenplan/integration/openclaw.md) | `4fab15ca323ac46f8c9905d5a82d7cb02023220f17d20ba21c69dce5b540c924` |
| [OpenCode integration](https://mimo.mi.com/static/docs/tokenplan/integration/opencode.md) | `d39cb672b9f9da03f3da00e83c964849bfdf3f9d06ca54efbbabd5374aa8c376` |
| [OpenAI-compatible API reference](https://mimo.mi.com/static/docs/api/chat/openai-api.md) | `1be241b9a882b3c70954e8ec04031cb657b06c8e0b0bbb8511e5b6ec63b82ae7` |
| [Promotions FAQ](https://mimo.mi.com/static/docs/quick-start/faq/promotions.md)           | `63e8515066b5ec06a61e71262b4a5f41b945f9bd4e540b76299f3437880223e7` |
| [Pay-as-you-go pricing](https://mimo.mi.com/static/docs/price/pay-as-you-go.md)           | `f62427a339e91edbb252cc6b54cac92050d4254483b1e7eb97a234d6d32f947b` |
| [Deprecation schedule](https://mimo.mi.com/static/docs/updates/deprecate.md)              | `f5c856884116df8ebba552550ec5c6912b1d0bd8edad66e2bf1e973da6270068` |
