# Provider Manifests

This convention originally applied to every provider onboarded via Tier 2,
3, or 4: one JSON file here, named `<provider>.json` where `<provider>` is
the exact `AIProviderName` enum value (e.g. `cerebras.json` for
`AIProviderName.CEREBRAS = "cerebras"`).

## Tier 2 (JSON catalog) providers no longer use a manifest here

As of the provider-JSON-catalog refactor, Tier 2 providers are declared
entirely in `src/lib/providers/catalog/<id>.json`, validated by the zod
schema in `src/lib/providers/catalog/schema.ts`. That file's `evidence`
object — `rosterVerified`, `addedInPR`, and optionally `authProbe`,
`billingProbe`, `liveMatrix` — carries the same onboarding evidence a
manifest used to hold, so a separate manifest file would just duplicate
it. `tools/verify-provider-onboarding.ts` reflects this: for any provider
with a matching `src/lib/providers/catalog/<id>.json` file, the gate
checks that the JSON file exists, parses via the real zod schema, and
(via that same successful parse, since both fields are non-optional in
the schema) carries `evidence.rosterVerified` and `evidence.addedInPR`.

`cerebras.json` and `sambanova.json` — the two manifests that used to
live in this directory — were removed for this reason: both providers
are now JSON-catalog entries, and their onboarding evidence lives in
`src/lib/providers/catalog/cerebras.json` and
`src/lib/providers/catalog/sambanova.json` respectively.

## Tier 3/4 (hand-written) providers still use a manifest here

A provider onboarded outside the JSON catalog — a custom adapter (Tier 3)
or fully custom integration (Tier 4) — has no catalog JSON file, so
`tools/verify-provider-onboarding.ts` falls back to its original
four-check flow for it, including a manifest at
`docs/provider-integration/manifests/<name>.json`. The shape below still
applies to those providers.

The block is annotated JSONC **for documentation purposes only** — the
`//` comments and trailing comma explain each field but are not valid
JSON. A real `<provider>.json` manifest file must be strict JSON: no
comments, no trailing commas.

```jsonc
{
  // Must exactly equal the AIProviderName enum value.
  "provider": "example-vendor",

  // 3 or 4. (Tier 1 never gets a manifest; Tier 2 uses catalog evidence
  // instead — see above.)
  "tier": 3,

  // Full PR URL. Leave "" until the PR exists, fill in before merge.
  "addedInPR": "https://github.com/juspay/neurolink/pull/1234",

  // YYYY-MM-DD.
  "addedDate": "2026-08-15",

  // Every file this provider's onboarding touched — used for PR review,
  // not machine-checked beyond "the array exists".
  "filesTouched": ["src/lib/constants/enums.ts", "..."],

  // Must match the section-name prefix used in
  // test/continuous-test-suite-providers-mocked.ts's `record(results,
  // `${section}: ...`, ...)` calls for this provider, e.g. "LLM cerebras".
  "mockedContractSection": "LLM example-vendor",

  // One of: "not-tested" | "manual-live-tested" | "ci-mocked-only"
  "manualTestStatus": "not-tested",

  // REQUIRED when tier === 4 only. A sentence or two justifying why
  // this couldn't be Tier 2/3. See ../tiers/tier-4-full-custom.md.
  "tier4Justification": "...",
}
```

## How it's checked

`pnpm run verify:provider-onboarding` (`tools/verify-provider-onboarding.ts`)
fails a PR that introduces a new `AIProviderName` member without matching
onboarding evidence: a valid catalog JSON entry for Tier 2 providers (see
above), or a structurally valid manifest here for Tier 3/4 providers. It
does not retroactively require either for providers that predate the gate
— see that tool's `LEGACY_PROVIDERS` list.
