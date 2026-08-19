# ADR-0003: Mocked-fetch contract tests are the CI merge gate; live-API suites are not

**Status:** Accepted and shipped — 2026-08-15 decision, live on `release` as of 2026-08-18.
**Context:** Plan 10 (audit area `gap1-ci-cd-automated-testing-coverage...md`)

## Context

At the time this decision was made, provider correctness in CI was weak:
no `test:*` script ran as a hard gate, and provider correctness depended
on a human manually running `pnpm run test:matrix` with real, funded API
keys and self-reporting the result in the PR template's checkboxes, which
nothing enforced.

Extrapolating the live-API pattern
(`continuous-test-suite-provider-matrix.ts`) to a large, growing provider
count is not viable as a PR gate: many sets of funded CI secrets, a
sequential loop already documented to take several minutes per call for
some providers, real per-token vendor billing on every push, and constant
vendor-side flakiness that the codebase already special-cases via
`isExpectedProviderError`/`Skip` promotion — an implicit admission that
live tests can't be a hard pass/fail signal.

The codebase already had the alternative that scales:
`continuous-test-suite-providers-mocked.ts` intercepts `globalThis.fetch`
and asserts request shape, response parsing, and 401/429/5xx error
mapping — zero network I/O, zero cost, fully deterministic, runs in
seconds.

## Decision

Every provider PR (Tier 2 and above; Tier 1 needs no code) must add a
mocked-contract section to `test/continuous-test-suite-providers-mocked.ts`
covering at minimum: happy-path request/response shape, and a 401 →
friendly auth error. `main()` in that suite runs every existing section
unconditionally as a required, always-on, zero-cost CI gate — no
`continue-on-error`, no opt-out — so a regression in an existing
provider's mocked contract fails the PR. It does **not** structurally
compare its section list against `AIProviderName` or `ProviderFactory`'s
registered providers (verified 2026-08-19 by reading `main()`: it calls
`ProviderRegistry.registerAllProviders()` and then runs nine fixed
`run*Section()` calls, with no comparison against the registry), so a
brand-new provider that never gets a mocked section written for it will
not, by itself, fail this suite. Today, that gap is closed by PR review
(see `CHECKLIST.md` §B), not by an automated cross-check.

A separate, deliberately-sequenced change to this plan adds
`tools/verify-provider-onboarding.ts` — an onboarding completeness gate,
run in `provider-safety-net` with no `continue-on-error`, that reads
`continuous-test-suite-providers-mocked.ts`'s source directly and fails
if a non-legacy provider has no matching mocked-contract section. Once
that change lands, this specific gap becomes an automated CI failure
instead of a review-time judgment call. As of this PR it has not
landed, so the paragraph above still describes the actual behavior of
`main()`.

Live-provider suites (`test:matrix`, `test:live`, `test:new-providers`,
`test:product`) remain valuable and remain in the repo, but stay
deliberately **manual/scheduled**, never a per-PR gate. This is a
conscious choice to preserve today's cost/flakiness tradeoff rather than
drift into it by accident.

## Current state (verified 2026-08-18 — corrects the original decision text)

The original version of this ADR described `ci.yml`'s `quality-gate` job
as having a placeholder step literally named "🎯 Test Suite Validation"
with two `echo` lines under `continue-on-error: true`. **That step does
not exist in `ci.yml` as of this writing.** What exists instead, in the
`provider-safety-net` job (not `quality-gate`, and not `test` either —
`provider-safety-net` is its own top-level job in `ci.yml`), are real,
hard-gated steps with no `continue-on-error`:

- `Mocked provider contract tests (no API keys required)` → `pnpm run test:providers-mocked`
- `Provider structure tests (registry ↔ filesystem, no API keys required)` → `pnpm run test:provider-structure`

In other words: the decision this ADR argues for has already shipped.
This document now serves as the historical record of why, not a proposal
for future work. (The `quality-gate` job does have an unrelated
`continue-on-error: true` step — `📊 ESLint Quality Report` — but it has
nothing to do with provider contract testing; don't conflate the two when
reading `ci.yml`.)

The original decision text also claimed mocked coverage existed for
"13 of 30 providers." The live count, read directly from
`continuous-test-suite-providers-mocked.ts`'s section names, is **18 of
31** `AIProviderName` members: 7 in the shared OpenAI-compatible loop
(xAI, Groq, Together AI, Fireworks, Perplexity, Cohere, Cloudflare — note
Cohere and Cloudflare share the generic OpenAI-compat mocked runner
despite the file's own header comment filing them under "custom shape"),
3 native fetch-interceptable (OpenAI, Azure, Anthropic), 2 native
construction-only / formatProviderError-contract-only (Vertex, Bedrock,
whose SDKs bypass `globalThis.fetch`), 1 predict-then-poll (Replicate), 2
embeddings (Voyage AI, Jina AI), and 3 image-gen (Stability, Ideogram,
Recraft). The remaining 13 of 31 providers are still without mocked
coverage — a materially different number from what the original decision
text estimated, though the qualitative gap (some legacy providers
uncovered) is the same shape.

## Consequences

- **Positive:** there is now an automated check — CI, not a human — that
  verifies a newly-registered provider is wired correctly before merge,
  at zero marginal cost per provider.
- **Positive:** because the gate lives in the `provider-safety-net` job
  alongside a real provider-structure check (`test:provider-structure`, registry ↔
  filesystem consistency), a new provider that drifts from the registry
  (missing dynamic import, unresolvable enum value, absent
  `PROVIDER_MODULE_TO_ID` entry) fails CI rather than merging silently.
  Missing mocked coverage specifically is **not** caught by either suite
  automatically — see the Decision section above.
- **Negative:** mocked contract tests only prove wire-shape correctness
  against NeuroLink's _assumptions_ about the vendor's API, not that the
  real vendor endpoint still matches those assumptions today. A live,
  scheduled (not per-PR) suite remains necessary to catch vendor-side
  drift — explicitly out of scope for this plan; see the existing
  `test:matrix`/`test:new-providers` scripts.
- **Negative:** the gate only meaningfully covers the 18 providers with
  existing mocked sections plus any added going forward; it does not
  retroactively audit the 13 of 31 existing providers still missing
  mocked coverage. That backfill is tracked as follow-up work, not
  blocked on this plan.
