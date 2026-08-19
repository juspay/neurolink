# ADR-0002: OpenAI-wire-compatible providers default to a catalog row, not a subclass

**Status:** Accepted and shipped — 2026-08-15 decision, live on `release` as of 2026-08-19 (`830db31a`; see the Current state note below).
**Context:** Plans 05/10 (audit area `10-openai-compat-family.md`)

## Context

A large share of NeuroLink's providers extend one abstract class,
`OpenAIChatCompletionsProvider`. Seven of those (Groq, xAI, Together AI,
Fireworks, Perplexity, Cloudflare, Mistral) were pure configuration — an
env var name, a base URL, a default/fallback model, and a
`formatProviderError` string-matcher copy-pasted with only the message
text and error class varying. The constructor's credential-precedence
block (`credentials?.apiKey?.trim() || getXApiKey()`) was repeated
character-for-character across those subclasses. None of that variation
was behavioral — it was data wearing a class costume.

## Decision

A new provider whose backend speaks the OpenAI `/v1/chat/completions`
wire format and needs **no behavioral override** (no custom
`adjustRequestBody`, `adjustResponseFormat`, `getAuthHeaders`, etc.) is
onboarded as one `OpenAICompatCatalogEntry` object appended to
`OPENAI_COMPAT_CATALOG` (`src/lib/providers/openaiCompatCatalog.ts`),
constructed at registration time by one generic
`ConfiguredOpenAICompatProvider` class
(`src/lib/providers/configuredOpenAICompat.ts`) — **not** a new
`src/lib/providers/<name>.ts` subclass file.

A dedicated subclass is still the right choice — and remains fully
supported — the moment a provider needs a real hook override (DeepSeek's
`adjustResponseFormat`, Azure's four overrides, NVIDIA NIM's
`adjustBodyAfter400`). This is exactly the Tier 2 vs. Tier 3 boundary
documented in `docs/provider-integration/tiers/`.

## Current state (verified 2026-08-19 against merged `release`)

The catalog data module (`openaiCompatCatalog.ts`, seven fully-populated
entries) and the generic provider class
(`ConfiguredOpenAICompatProvider`) both exist on `release` and are
tested. They **are** wired into `providerRegistry.ts`: `830db31a`
("refactor(providers): drive seven OpenAI-compat providers from the
catalog") replaced each of the seven hand-written
`OpenAIChatCompletionsProvider` subclasses — Groq, xAI, Together AI,
Fireworks, Perplexity, Mistral, Cloudflare — with one loop in
`_doRegister()` that iterates `OPENAI_COMPAT_CATALOG` and constructs
`ConfiguredOpenAICompatProvider` generically for every entry. The seven
subclass files are gone; onboarding a new zero-quirk OpenAI-compatible
provider is now purely a data addition (see
`tiers/tier-2-catalog-entry.md`, which describes this as the live path,
not a target).

A separate, same-day change (`0e935499`, "fix(providers): make provider
registration statically discoverable") added the `PROVIDER_MODULE_TO_ID`
manifest and extended `test/continuous-test-suite-provider-structure.ts`
with manifest-coverage checks. It's registry-integrity tooling, not part
of this migration — it doesn't require a manifest entry per catalog row
(see the "Registration" section of `tiers/tier-2-catalog-entry.md` for
why).

## Consequences

- **Positive:** the ~15–20 lines of copy-pasted constructor +
  error-formatter boilerplate per zero-quirk provider that the seven
  subclasses used to carry now collapses to a ~10-line data row per
  provider.
- **Positive:** catalog rows are data-driven, not hand-registered — a new
  entry in `OPENAI_COMPAT_CATALOG` is picked up automatically by the
  existing loop in `providerRegistry.ts` (see `tiers/tier-2-catalog-entry.md`,
  "Registration"); there is no per-provider registration block left to
  write for this family.
- **Negative:** a provider that _starts_ as a zero-quirk catalog row and
  later needs one override (e.g., a vendor adds a nonstandard 400 body)
  requires a migration from catalog row to dedicated subclass. This is a
  known, accepted cost — it's strictly better than every provider paying
  subclass overhead up front on the speculation that it might need a hook
  someday.
- **Negative:** reviewers must actually check "does this really need zero
  overrides" — a catalog entry that silently needs a `formatProviderError`
  tweak but doesn't get one produces a confusing generic error message
  instead of a build failure. The Tier 2 checklist makes this an explicit
  checklist item, not an assumption.
