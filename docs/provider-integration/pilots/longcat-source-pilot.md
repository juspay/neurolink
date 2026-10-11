# LongCat text and streaming source pilot

This source-level catalog entry selects Meituan's `LongCat-2.5-Preview` model
through `https://api.longcat.chat/openai/v1/chat/completions` with
`Authorization: Bearer $LONGCAT_API_KEY`. Its declared scope is text generation
and streaming only. Source preparation, public contract acceptance,
installed-package acceptance, current account/API availability and delivery are
separate gates. This entry gives no provider-count, roster, live, package or
delivery credit.

## What the entry declares

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| Provider id    | `longcat` (display name LongCat, operator Meituan)                  |
| Base URL       | `https://api.longcat.chat/openai/v1`                                |
| Route          | `POST /chat/completions`                                            |
| Credential     | `LONGCAT_API_KEY` as a Bearer token                                 |
| Default model  | `LongCat-2.5-Preview` (the only model listed, so no other fallback) |
| Context window | 1,048,576 tokens                                                    |
| Maximum output | 131,072 tokens                                                      |
| Capabilities   | text and streaming; tools, structured output, thinking, vision off  |
| Billing policy | `no-free-tier`, usage-priced pay-as-you-go                          |

`LongCat-2.0` is served on the same route but is outside this pilot's catalog
scope, so it is deliberately not a default and not a fallback. The capability booleans bound this pilot's declared scope; they
are not evidence that the vendor lacks those features.

## Billing

The default model is usage-priced. Promotional credits, when an account has
any, are consumed first, but no free allowance is stated, so the entry claims
no free tier. The vendor's Pay-As-You-Go page says account verification is required before a
top-up, and its FAQ scopes that requirement to users in Mainland China; it was
not tried on an account.

## Evidence caveats

- The context integer 1048576 rests on the vendor's own Retrieve Model response
  sample for the exact model id plus the 1M prose; no normative sentence states
  it. It has not been confirmed with `GET /openai/v1/models/LongCat-2.5-Preview`
  because that needs a key.
- The vendor SDK snippet omits `/v1` although the exact HTTP route includes it;
  the catalog base URL `https://api.longcat.chat/openai/v1` is taken from the
  curl example and is proven only against the owned fixture.
- The vendor's Pay-As-You-Go page says account verification is required before
  top-up; its FAQ scopes that to users in Mainland China. Both were read
  directly; it was not tried on an account. No live call was made.

## Local public contract

`test/continuous-test-suite-longcat-pilot.ts` runs eight cases through the built
public SDK and built CLI, with optional `--package-root` support for a later
installed consumer:

| Cases                                          | Count | Required observation                                                                                                                                  |
| ---------------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK/CLI generate/stream default                |     4 | Actual catalog default, `/openai/v1/chat/completions`, Bearer header, unique user prompt, `max_tokens: 32`, stream mode, no tools/tool choice, answer |
| SDK/CLI generate/stream invalid explicit model |     4 | All wire preconditions pass before HTTP 400 rejection; no fallback or successful reply                                                                |

The fixture strips real credentials before imports, uses temporary homes and
points the provider at an owned random-port listener. Public `MODEL_CONFIG_URL`
uses that same listener's `HEAD /health` and `GET /api/v1/models`; a
schema-valid empty registry keeps the provider's actual catalog default in
control. The listener is the only server involved: no vendor host is contacted.

```sh
pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage source --provider longcat
pnpm exec tsx test/continuous-test-suite-longcat-pilot.ts
```

## Provenance and remaining gates

The legacy `evidence.rosterVerified` slot carries the explicit
`VENDOR_DOCS_ONLY_NOT_ROSTER_VERIFIED` marker. It has no HTTP status, auth probe
or billing probe; `liveMatrix` is null. `evidence.addedInPR` is the
introduction pull request URL (https://github.com/juspay/neurolink/pull/1980),
set after the PR existed; it was `PENDING_PR` while the work was local. Source-stage admission does not certify current account or API
availability.

Still pending and separate: an authenticated `GET /openai/v1/models` roster, a
funded-account live matrix, installed-consumer acceptance and any delivery
claim.
