# ADR-0001: `ProviderDescriptor` is the single source of truth for provider identity

**Status:** Accepted — 2026-08-15
**Context:** Plans 00/11 (audit)

## Context

Before this redesign, "what providers exist and what do they need" was
answered by five independently hand-maintained places that had already
drifted from each other: `providerRegistry.ts` (registration + aliases),
`commandFactory.ts` (CLI `--provider` choices, re-listing every alias),
`providerHealth.ts` (hardcoded 8-of-31-provider health/auto-select list),
`contextWindows.ts` (per-model context windows), and
`providerImageAdapter.ts` (vision capability map). A sixth ad hoc identity
mechanism existed for `"anthropic-subscription"`. Google AI Studio alone
had five different spellings across these tables. None of this was
type-checked; typos were silent runtime misses (`credentialKeyMap` was
already missing a `together-ai` entry in production).

At 30 providers this was tolerable tech debt. At 200+ it is not: ~1,000+
hand-authored string literals with zero compile-time linkage between them.

## Decision

Every provider gets exactly one `ProviderDescriptor` object
(`src/lib/types/providers.ts`) held in one array,
`PROVIDER_DESCRIPTORS` (`src/lib/factories/providerDescriptors.ts`), a
**pure data module** — no dynamic imports, no provider-class imports — so
it is safe to import statically from anywhere, including the CLI's
command-definition code (which needs `--provider` choices synchronously,
before any provider is instantiated).

Every other subsystem that previously hardcoded its own provider list
(CLI choices, health-check auto-selection, alias resolution) is expected
to derive from `PROVIDER_DESCRIPTORS` / `ProviderFactory.getAllDescriptors()`
instead of maintaining a parallel list. `ProviderFactory.normalizeProviderName`
replaces its O(n) linear alias scan with an alias→canonical index built
once at registration time from the same descriptors.

## Consequences

- **Positive:** one array to review per new provider; CLI/health/alias
  tables can no longer drift because they no longer _have_ independent
  data to drift from.
- **Positive:** `ProviderFactory.getDescriptor(name)` becomes the answer
  to "does this provider exist and what does it need" for every
  subsystem, including this plan's own CI gate (`test:provider-structure`,
  `tools/verify-provider-onboarding.ts`).
- **Negative:** `PROVIDER_DESCRIPTORS` becomes a single large file that
  every new provider touches — a predictable merge-conflict hotspot at
  high PR volume. Mitigated by keeping each entry a small, independent
  object literal (low conflict surface per line) and by the Tier 2 path
  needing only a ~10-line addition.
- **Negative:** subsystems that haven't yet been migrated to read from
  `PROVIDER_DESCRIPTORS` still need manual edits until they are. As of
  2026-08-18, `commandFactory.ts`'s main `--provider` choices and
  `providerHealth.ts` are already descriptor-driven, but the separate
  `setup [provider]` CLI subcommand still hand-hardcodes its own provider
  choices array — a concrete, currently-open gap, not a hypothetical one.
  The tier docs call this out explicitly rather than silently overclaiming
  that migration is complete.
