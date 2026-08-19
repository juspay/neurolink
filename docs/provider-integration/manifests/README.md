# Provider Manifests

Every provider onboarded via Tier 2, 3, or 4 gets
one JSON file here, named `<provider>.json` where `<provider>` is the
exact `AIProviderName` enum value (e.g. `cerebras.json` for
`AIProviderName.CEREBRAS = "cerebras"`).

This is deliberately a plain JSON convention, not a `src/lib/types/`
TypeScript type — manifests are onboarding-process metadata intended to
be consumed by `tools/verify-provider-onboarding.ts` (a follow-up change
to this plan — see the note below) and by humans reading the directory,
not part of the runtime SDK's type surface. Critical Rule 2
("all type definitions go in `src/lib/types/`") governs types the SDK's
code imports; it doesn't apply here.

## Shape

The block below is annotated JSONC **for documentation purposes only** —
the `//` comments and trailing comma explain each field but are not
valid JSON. A real `<provider>.json` manifest file must be strict JSON:
no comments, no trailing commas. Copying this block verbatim into a
`.json` file will fail to parse.

```jsonc
{
  // Must exactly equal the AIProviderName enum value.
  "provider": "cerebras",

  // 2, 3, or 4. (Tier 1 never gets a manifest — see ../tiers/tier-1-aggregator-passthrough.md.)
  "tier": 2,

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
  "mockedContractSection": "LLM cerebras",

  // One of: "not-tested" | "manual-live-tested" | "ci-mocked-only"
  "manualTestStatus": "not-tested",

  // REQUIRED when tier === 4 only. A sentence or two justifying why
  // this couldn't be Tier 2/3. See ../tiers/tier-4-full-custom.md.
  "tier4Justification": "...",
}
```

## Two worked examples

See `_example-tier2-catalog.json` and
`_example-tier3-adapter.json` — these are
documentation fixtures, not real provider entries (note the `_example-`
prefix; a real manifest is always named exactly `<provider>.json`).

## How it's checked

`pnpm run verify:provider-onboarding` (`tools/verify-provider-onboarding.ts`)
is designed to fail a PR that introduces a new `AIProviderName` member
without a matching, structurally valid manifest here. **As of 2026-08-18
that tool does not exist yet** — it's Tasks 8-9 of the provider onboarding
plan, deliberately sequenced as a separate change after this
documentation lands. Until it ships, manifest completeness is a manual
PR-review checklist item (see `../CHECKLIST.md` §A). Once shipped, it
will not retroactively require manifests for the providers that predate
this convention — see that tool's planned `LEGACY_PROVIDERS` list.
