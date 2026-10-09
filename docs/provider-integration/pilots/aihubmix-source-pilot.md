# AIHubMix text and streaming pilot

This local source pilot selects AIHubMix's paid `gpt-4o-mini` model through
`https://aihubmix.com/v1/chat/completions`. Its declared scope is text generation
and streaming. Source preparation, public contract acceptance, installed-package
acceptance, current account/API availability and delivery are separate gates.
This draft gives no delivery or provider-target credit.

## Exact source facts

AIHubMix's own model page publishes a model-specific server record at
`loaderData.model.record`. It binds `model: "gpt-4o-mini"` to numeric
`context_window: 128000` and `max_output: 16384`. The same record publishes
`retire_stage: "active"`. These exact fields support the pilot's context and
output ceilings. The displayed `128K` and `16.4K` labels are rounded; no K/M
conversion or upstream-model substitution was used. An active documentation
label does not certify access on an account or a successful live API call.

The model's own guide documents `POST /v1/chat/completions`,
`Authorization: Bearer $AIHUBMIX_API_KEY`, ordinary `messages`/`choices` responses,
and SSE `data:` JSON chunks ending in `[DONE]`. Its tools, structured-output,
vision and reasoning capability flags are explicitly unconfirmed. The other
capability booleans in this profile limit the pilot's declared scope; these
flags are not evidence that the vendor lacks those features. Optional prices
are omitted from the catalog draft.

## Billing and retired models

The default `gpt-4o-mini` is usage-priced and requires the caller to establish
funding, permissions and model eligibility. The existing schema's `free-tier`
value describes the vendor-level free-model programme, following the existing
[Mancer profile](https://github.com/juspay/neurolink/blob/8c78cd172a8b2036b75132488f9d24548f2a1e88/src/lib/providers/catalog/mancer.json), whose default
is also paid. AIHubMix's separate programme is model-limited. Its published
no-card and allowance claims do not grant free access to this paid default or
certify current eligibility on any account.

Current model-specific guides mark `gpt-4o-free` and `gpt-5.5-free` retired and
describe HTTP 404 `model_retired`. Both are excluded from the catalog and its
default/fallback list. Older free-model marketing and readable static parameter
schemas cannot establish current availability of these IDs.

AIHubMix documents remote mapping, routing and fallback. The SDK's
`disableInternalFallback` option controls the SDK path; acceptance of gateway
identity, routing and billing remains a separate live/provider question.

## Local public contract

`test/continuous-test-suite-aihubmix-pilot.ts` prepares 16 mandatory cases through
the built public SDK and built CLI, with optional `--package-root` support for a
later installed consumer:

| Cases                                            | Count | Required observation                                                                                                                            |
| ------------------------------------------------ | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK/CLI generate/stream default                  |     4 | Actual catalog default, route, Bearer header, unique user prompt, `max_tokens: 32`, stream mode, no tools/tool choice, and fresh backend answer |
| SDK/CLI generate/stream invalid explicit model   |     4 | All wire preconditions pass before HTTP 400 rejection; no fallback or successful reply                                                          |
| SDK/CLI generate/stream each retired explicit ID |     8 | Same wire preconditions, HTTP 404 retirement cause, preserved caller rejection, no fallback or reply                                            |

The fixture strips real credentials before imports, uses temporary homes and
sets provider routes to its owned random-port listener. Public
`MODEL_CONFIG_URL` uses that same listener's `HEAD /health` and
`GET /api/v1/models`. A schema-valid empty registry keeps the provider's actual
catalog default in control. Positive metadata initialization requires the exact
ordered request pair; explicit CLI model paths require no metadata request.
Successful SDK metadata checks run after shutdown, and preserve original SDK
errors when generation fails. CLI commands keep a 60-second deadline.

The standalone component now passes all 16 cases with zero failures, skips or
unowned network attempts and known process cleanup. The fixture remains
byte-identical to the original source freeze. Runtime receipt
`AIHUB-20261009T171326Z-11` binds these results to the fresh standalone build.
Integrated and installed-consumer acceptance remain separate.

The exact validated Q04 source invocation and public-suite command are:

```sh
pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage source --provider aihubmix
pnpm exec tsx test/continuous-test-suite-aihubmix-pilot.ts
```

The verification lane executes the public command through the existing
credential-free owned-command runner with `RECOVERY_PROOF_TEST_GUARD=true`,
separate process groups and recorded cleanup. The guard must record zero
unowned attempts. The source invocation has no extra forwarded `--` argument.

## Provenance and remaining gates

The legacy `evidence.rosterVerified` slot contains the explicit
`PUBLIC_DOCS_ONLY_NOT_ROSTER_VERIFIED` marker and documentation methods. It has
no HTTP status, auth probe or billing probe. `liveMatrix` is null and the PR
field is the canonical introduction PR URL
(https://github.com/juspay/neurolink/pull/1966), set after the PR existed; it was
`PENDING_PR` while the work was local. Q04 source admission accepts either the
marker or a canonical introduction PR URL. Its source-stage report keeps roster, live, installed-package and delivery
claims separate and gives no provider-count credit. Structural parsing or
source-stage admission does not certify current account/API availability.

The Q04 successor starts from `08c3c4e4e2881874fdf0e453923a3507b759532d`,
which descends from the checked live release
`8c78cd172a8b2036b75132488f9d24548f2a1e88`. Its public fixture is byte-identical
to the original source freeze. The profile's only semantic change is the PR
marker required by Q04. Shared schema, runtime, helpers and original source
receipts are preserved. Actual Q04 source admission passed and reports zero
provider-count, roster, live, installed-package and publication credit.

Canonical catalog generation affects the index, provider union, provider/model
enum regions and generated credential region. The standalone frozen install,
canonical generation and fixed point, fresh SDK/CLI/browser build, normal lint,
strict source/tools/CI types and all 16 guarded public cases passed. Source
outside the generated regions is preserved. A command-delimiter failure before
Q04 admission was retained and corrected by invoking the same production
validator directly; no source or fixture repair was required.

Integrated source/build/required suites, normal hooks and commit, any separately
assigned production sensitivity controls and clean installed-consumer acceptance
remain pending. Accounts, funding, provider inference, external delivery and
target credit are separate.

The retained source receipts were retrieved on 2026-10-09:

| First-party source                                                                   | Body SHA256                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [Paid default model page](https://aihubmix.com/model/gpt-4o-mini)                    | `d30240d57bde0caf42a89cd7c4f96fbbc32217835756321482d362c64586c12e` |
| [Paid default model guide](https://aihubmix.com/model/gpt-4o-mini/llms.txt)          | `6cc75a6d9fece483ee7417c0e4f9a6272282ef317a57f6c4d664b3766b65de7e` |
| [Model field definitions](https://docs.aihubmix.com/cn/api/Models-API.md)            | `06c69590bec8c9b808718c541c6a5efc9bd0e54a86c5e81d287d2a2840231999` |
| [Model-limited free programme](https://docs.aihubmix.com/cn/blogs/free-ai-models.md) | `27cd20549bb9b747c2768eacecf0a66fa58055708432529f3b52c587ad217a22` |
| [Retired gpt-4o-free guide](https://aihubmix.com/model/gpt-4o-free/llms.txt)         | `1e1c70b0cd06d56c47f36e73d34487802c7760bd0541073d5227d55ba4267fdf` |
| [Retired gpt-5.5-free guide](https://aihubmix.com/model/gpt-5.5-free/llms.txt)       | `36e1d73d1e8a47d94b458981888495d3d23671089fb0386d4da431e093778d83` |
