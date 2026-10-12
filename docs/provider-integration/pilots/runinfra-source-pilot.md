# RunInfra text and streaming source pilot

This source-level catalog entry selects RunInfra's `nemotron-3-5-lightning-30b`
model through `https://api.runinfra.ai/v1/chat/completions` with
`Authorization: Bearer <workspace API key>`. Its declared scope is text
generation and streaming only. Source preparation, public contract acceptance,
installed-package acceptance, current account/API availability and delivery are
separate gates. This entry gives no provider-count, roster, live, package or
delivery credit.

## Vendor sources

All were read on 2026-10-12 with public GETs. No API call was made and no
account exists for this work.

- [https://runinfra.ai/inference-api/nemotron-3-5-lightning-30b](https://runinfra.ai/inference-api/nemotron-3-5-lightning-30b) (model page)
- [https://runinfra.ai/docs/tools-sdks/openai-compatibility](https://runinfra.ai/docs/tools-sdks/openai-compatibility)
- [https://runinfra.ai/docs/api-reference/chat-completions.md](https://runinfra.ai/docs/api-reference/chat-completions.md)
- [https://runinfra.ai/docs/api-reference/authentication.md](https://runinfra.ai/docs/api-reference/authentication.md)
- [https://runinfra.ai/docs/introduction/plans.md](https://runinfra.ai/docs/introduction/plans.md)
- [https://runinfra.ai/docs/changelog.md](https://runinfra.ai/docs/changelog.md)

## What the entry declares

| Field          | Value                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Provider id    | `runinfra` (display name RunInfra)                                                                            |
| Base URL       | `https://api.runinfra.ai/v1`                                                                                  |
| Route          | `POST /chat/completions`                                                                                      |
| Credential     | `RUNINFRA_GATEWAY_KEY` as a Bearer token, with `RUNINFRA_API_KEY` read as a fallback                          |
| Default model  | `nemotron-3-5-lightning-30b` (the only model listed, so no other fallback)                                    |
| Context window | 262,144 tokens                                                                                                |
| Maximum output | 262,144 tokens, a ceiling and not capacity beside a full prompt (see below)                                   |
| Capabilities   | text and streaming; tools, structured output, thinking, vision off                                            |
| Billing policy | `promotional-credit`, usage-priced per token, with a one-time signup credit listed on the vendor's plans page |

The model id is the one the vendor's copyable examples pass as `model`. The
model page's header also shows the upstream served name
`nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16`, which is not the id to send.

The capability booleans bound this pilot's declared scope; they are not
evidence that the vendor lacks those features. The model page lists tool
calling, JSON mode and streaming as supported and the accepted input as text
only. Tools, structured output, thinking and vision are simply not declared
here because none was probed.

## Credential variables

The vendor's curl and SDK examples read `RUNINFRA_GATEWAY_KEY`, and its export
block also sets `RUNINFRA_API_KEY` to the same value. The entry reads
`RUNINFRA_GATEWAY_KEY` first and `RUNINFRA_API_KEY` as a fallback
(`wire.envOverrides.apiKey` plus `wire.apiKeyFallbackEnvVars`). The vendor's
authentication page says `RUNINFRA_API_KEY` is the name its CLI and most
coding-agent integrations read and that it "is not an alias for
`RUNINFRA_GATEWAY_KEY`", so the entry reads both. The base URL
variable is the derived `RUNINFRA_BASE_URL`, the name the vendor's export block
already uses.

## Context and output

The model page states "Context window 262,144 tokens" and "Maximum generated
output 262,144 tokens" for this exact model. The chat-completions reference
gives the per-request cap as "the model's remaining context, that is its
context window minus your prompt" and says oversized values are clamped, never
refused. So 262,144 is a ceiling, not 262,144 usable output beside a full
prompt. The schema accepts equal context and output values, and other catalog
entries already declare them. This SDK path sends neither ceiling on the wire,
so the owned endpoint in the suite below cannot observe them.

## Billing

The model page lists "USD, pay per token" rates: $0.05 per 1M input tokens,
$0.01 per 1M cached input tokens and $0.15 per 1M output tokens. They were read
on 2026-10-12, are not recorded in the catalog JSON and may change. The plans
page lists a credit as worth $1, a minimum top-up of $5, top-up credit that
lasts one year from purchase, and a $1 credit "Free on signup", "once per
account, never expires".

The catalog therefore uses `promotional-credit`, whose type comment in
`src/lib/types/providerCatalog.ts` says a promotional allowance is conditional
and that setup text must describe eligibility, activation and expiry without
implying current account entitlement. A credit given once per account is not a
free tier, and this entry does not claim one. `no-free-tier` would drop a
credit the vendor lists, `free-tier` and `free-with-card` would claim more than
was read, and the xiaomi-mimo and NAVER CLOVA Studio entries use
`promotional-credit` for conditional bonus or signup credit. Whether a
particular account receives the credit, and what a signup asks of the account,
was not established.

## Availability

Availability is a runtime field. The model page said "Available" on
2026-10-12, but the vendor changelog says the model was listed ahead of its
public opening. The chat-completions reference says a hosted model can be
temporarily paused and then answers `503` with `code` `hosted_model_paused`.
No API call was made, so availability to any account is unverified.

## Evidence caveats

- Context window 262144 and maximum generated output 262144 are both stated on
  the vendor's model page for this exact model. The chat-completions reference
  says per-request output is capped at the model's remaining context (window
  minus prompt) and that oversized values are clamped, so 262144 output is a
  ceiling, not capacity beside a full prompt. This SDK path does not send either
  ceiling on the wire; the owned endpoint cannot observe them.
- Availability is a runtime field. The model page said Available on
  2026-10-12; the vendor changelog says the model was listed ahead of its public
  opening and a paused model answers 503 hosted_model_paused. No API call was
  made, so availability to any account is unverified.
- Billing is usage-priced (USD per token) with prepaid $1 credits, a $5 minimum
  top-up and a one-time $1 signup credit per account. Prices and credit terms
  were read from vendor pages and not tried on an account; they may change.
- The vendor documents a `reasoning_effort` default for this model under JSON
  response formats, and says `usage.outputTokenDetails.reasoningTokens` reports
  0 even when the model reasoned. Thinking, tools, structured output and vision
  are declared off here as a scope limit; none was probed, and whether streamed
  output carries reasoning text was never observed.
- The chat-completions reference says this model reasons by default, that
  reasoning tokens count toward `max_tokens` before the answer, and that a
  smaller budget can be spent entirely on reasoning and return a completion
  whose `content` is empty. The suite's `max_tokens: 32` is a wire marker for
  the owned endpoint, not a recommendation, and the empty-content behavior was
  not observed.

## Local public contract

`test/continuous-test-suite-runinfra-pilot.ts` runs twelve cases through the
built public SDK and built CLI, with optional `--package-root` support for a
later installed consumer:

| Cases                                          | Count | Required observation                                                                                                                                    |
| ---------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK/CLI generate/stream default                |     4 | Actual catalog default, `/v1/chat/completions`, Bearer header, unique user prompt, `max_tokens: 32`, stream mode, no tools/tool choice, answer          |
| SDK/CLI generate/stream invalid explicit model |     4 | All wire preconditions pass before HTTP 400 rejection; no fallback or successful reply                                                                  |
| Key variables                                  |     4 | `RUNINFRA_API_KEY` alone reaches the wire (SDK and CLI), `RUNINFRA_GATEWAY_KEY` wins when both are set, and no key refuses before the wire and names it |

The fixture strips real credentials before imports, uses temporary homes and
points the provider at an owned random-port listener. Public `MODEL_CONFIG_URL`
uses that same listener's `HEAD /health` and `GET /api/v1/models`; a
schema-valid empty registry keeps the provider's actual catalog default in
control. The listener is the only server involved: no vendor host is contacted.

```sh
pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage source --provider runinfra
pnpm exec tsx test/continuous-test-suite-runinfra-pilot.ts
```

## Provenance and remaining gates

The legacy `evidence.rosterVerified` slot carries the explicit
`VENDOR_DOCS_ONLY_NOT_ROSTER_VERIFIED` marker and `evidence.billingProbe`
carries `PUBLIC_DOCS_ONLY_ACCOUNT_NOT_TESTED`; there is no HTTP status or auth
probe, and `liveMatrix` is null. `evidence.addedInPR` is the introduction pull
request URL (https://github.com/juspay/neurolink/pull/1983), set after the pull
request existed; it was `PENDING_PR` while the work was local. Source-stage admission does not certify current account or API
availability.

Still pending and separate: an authenticated `GET /v1/models` roster (the
vendor's chat-completions reference says a temporarily paused model is
reported there), a funded-account
live matrix, installed-consumer acceptance and any delivery claim.
