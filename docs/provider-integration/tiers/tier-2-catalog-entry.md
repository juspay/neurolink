# Tier 2 — Catalog Entry

**When this applies:** the vendor speaks the OpenAI `/v1/chat/completions`
wire format (Bearer auth, standard SSE, standard JSON body) and needs
**zero** behavioral overrides — no custom `adjustRequestBody`, no
`adjustResponseFormat`, no nonstandard auth header, no `adjustBodyAfter400`.
This is the Groq/xAI/Together AI/Fireworks/Perplexity/Cloudflare/Mistral
shape from before the redesign — now expressed as one JSON file instead of
a hand-written subclass (see `../adr/0002-catalog-over-subclass-default.md`
and the single-JSON spec at
`docs/superpowers/plans/2026-08-28-provider-json-catalog-spec.md`).

If you're not sure whether your provider is quirk-free, start writing the
JSON anyway — if it turns out you need a hook, migrate to Tier 3 instead of
forcing the quirk into the catalog shape.

## Files touched (end state)

| #   | File                                  | Change                          |
| --- | ------------------------------------- | ------------------------------- |
| 1   | `src/lib/providers/catalog/<id>.json` | The entire integration, as data |

That is the whole list. Everything else is **generated or derived**:

- `pnpm run codegen:catalog` writes the `AIProviderName` member, the
  `<Name>Models` enum and the `NeurolinkCredentials` key into marked
  regions, plus the generated catalog index. Pre-commit and CI fail on
  stale output, so it can't drift.
- The runtime loader builds the registry entry, descriptor, config options,
  context windows, pricing, vision map and model choices from the JSON.
- The test suites derive their spec rows, matrix rows and counts from the
  built catalog.

Scaffold it with:

```bash
pnpm run scaffold:provider -- --name=<id> --tier=2 \
  --baseURL=https://api.<vendor>.com/v1 --defaultModel=<live-verified-id>
```

Tier 2 emits exactly two files: a pre-filled `<id>.json` (with TODO markers
where only a live probe can supply the truth) and a short checklist. The
JSON deliberately fails schema validation until every TODO is replaced.

## Count pins — nothing to bump

There are none left. The wiring and descriptor suites compute their
expected totals from `CATALOG_PROVIDER_IDS`, and the matrix rows spread
from the catalog with a completeness guard that throws if any catalog
provider is missing. Adding a provider changes no test file.

`src/lib/factories/providerRegistry.ts` isn't in the table either:
`_doRegister()` loops over the catalog and registers every entry
generically.

One historical exception worth re-checking: `commandFactory.ts`'s separate
`setup [provider]` subcommand hand-hardcoded its own provider-choices array.
That was migrated to derive from the enum (PR #1583) — confirm it still
does before assuming you need a manual edit.

## The JSON, field by field

`id`, `displayName`, `aliases`, `tier`, then:

**`wire`** — `baseURL` for the normal case. Env var names derive by
convention (`<CONSTANT_CASE(id)>_API_KEY` / `_BASE_URL` / `_MODEL`); set
`envOverrides` only for a vendor that breaks it. For a URL computed from
another credential (Cloudflare's account id) use `baseURLTemplate` plus
exactly one `extraCredentials` entry.

**`models`** — `default`, `fallbacks`, `defaultContextWindow`,
`defaultMaxOutputTokens`, and a `catalog` map of model id → `{contextWindow?,
maxOutputTokens?, pricingPerMTok?, vision, status, description, enumMember?}`.
Omit a number rather than invent one. Optional refinements:

| Field                  | Use it when                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `enumMember`           | The derived constant-case name would break an existing export   |
| `enumTypeName`         | The `<Name>Models` enum name must differ from the derived one   |
| `fallbackModelName`    | The legacy fallback differs from `fallbacks[1] ?? fallbacks[0]` |
| `registryDefaultModel` | The registry default differs from `default`                     |
| `topModels`            | The CLI picker should show a curated ordered subset             |
| `visionModel`          | Vision tests need a specific model (the default is text-only)   |
| `testModel`            | The catalog default is retired/gated on the testing account     |

`testModel` is matrix-only — it never changes the runtime default. Reach
for it when a vendor retires the model your catalog documents (Groq purged
its llama lineup; Fireworks gates deployment per account).

**`capabilities`** — the matrix row. `vision` is derived from the models,
not declared here.

**`errorRules`** — status code and/or case-insensitive pattern → error
class + message. Templates: `{model}`, `{apiKeyEnvVar}`, `{setupUrl}`.
Rules are appended before the defaults and matched first-wins.

**`quirks`** — two escape hatches, both rare:

- `timeoutErrorClass: "provider"` — `classifyProviderError()` hard-codes
  `TimeoutError -> NetworkError` ahead of any rule table. Groq is the only
  entry that overrides it, because its pre-migration subclass returned a
  plain `ProviderError`. Set it only if your vendor genuinely needs a
  different timeout Error subclass; other error-mapping quirks belong in
  `errorRules`, or in a Tier 3 subclass if they need real logic.
  `test/continuous-test-suite-error-classifier-contract.ts` asserts this
  per provider — add a case if you set it.
- `registryDefaultIgnoresModelEnvVar: true` — Mistral only.

**`setup`** — `url`, `apiKeyFormat` (regex or null), `billingPolicy`
(`free-tier` | `free-with-card` | `no-free-tier`), `instructions[]`, and an
optional `description`. This is what the setup wizard shows, so make the
billing line honest.

**`evidence`** — structured probe records replacing the old manifest file:
`rosterVerified`, optional `authProbe` / `billingProbe`, `liveMatrix`
(nullable until verified) and `addedInPR`. `verify:provider-onboarding`
requires `rosterVerified` and `addedInPR`.

## Live verification

The mocked gates prove the wire contract, not the commercial reality.
Each of these caught a real defect on the cerebras pilot:

1. **Roster probe first** — authenticated `GET <baseURL>/models`. Pick
   `default`, `fallbacks` and catalog keys from what the API serves TODAY.
   Vendor docs listed four cerebras models; the live roster had two, and
   the documented default 404'd (finding #7). This ages: both Groq's and
   Fireworks' catalog defaults went dead within weeks.
2. **Billing policy** — confirm how a working key is obtained. Cerebras has
   no keyless free tier: even the "$5 free credits" require saving a payment
   card (finding #8); SambaNova requires payment outright (finding #11).
3. **Capability probes** — probe `tools` + `response_format` in one request
   before setting `structuredOutputWithTools`; strict backends 400. Don't
   copy another provider's flags on vibes.
4. **Live matrix** — with a working key:
   `npx tsx test/continuous-test-suite-provider-matrix.ts --provider=<id>`
   must pass generate, stream, tool calling and structured output, and a
   bare `node dist/cli/index.js generate "..." --provider <id>` must resolve
   the default model. The pilot's first live run was 2/4 and surfaced an
   SDK-wide bug (`tool_choice` emitted on tools-less requests — fixed in
   #1564, now pinned by the mocked suite), which is why this step exists.

Record the outcome in `evidence.liveMatrix`.

## Verification commands

```bash
pnpm run codegen:catalog     # regenerate; CI fails if you skip it
pnpm run build               # derived suites read the BUILT catalog
pnpm run check
pnpm run check:tools-tests   # typechecks test/ — the CI types shard; plain `check` skips it
pnpm run lint
pnpm run test:providers-mocked
pnpm run test:provider-structure
pnpm run test:error-classifier-contract
pnpm run verify:provider-onboarding
pnpm run cli generate "hello" --provider <id>
```

All must exit 0 before opening the PR. The first three test commands run in
the `provider-safety-net` CI job (`.github/workflows/ci.yml`) — zero-API,
zero-credential checks, so there's no reason to skip them locally. Add a
case to `test:error-classifier-contract` first if your entry sets
`timeoutErrorClass` or vendor-specific `errorRules`.

Because the suites derive from data, a new provider needs no new assertions
— but if you ever do add one, run the break-one-assertion ritual: flip it,
confirm the suite reports `✗` and exits non-zero (not `⊘` skip — see the
assertion-message hazard in CLAUDE.md), then restore it.
