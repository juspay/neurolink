# Provider Onboarding Tiers

Four tiers, ordered by effort. **Always pick the lowest tier that's
actually true for the provider you're adding** — a provider that's
OpenAI-wire-compatible but gets built as a bespoke Tier 3 subclass "to be
safe" is exactly the copy-pasted-boilerplate problem this redesign
exists to eliminate (see `../adr/0002-catalog-over-subclass-default.md`).

```text
Is the model already served by an aggregator NeuroLink already speaks to
(LiteLLM proxy, OpenRouter)?
├─ Yes → Tier 1 — zero code. → tier-1-aggregator-passthrough.md
└─ No, it's a new backend.
   │
   Does it speak the OpenAI /v1/chat/completions wire format (Bearer
   auth, standard SSE) with NO behavioral quirks (no custom body
   mutation, no 400-retry dance, no nonstandard auth header)?
   ├─ Yes → Tier 2 — one catalog row, ~1 hour. → tier-2-catalog-entry.md
   └─ No.
      │
      Does it need custom wire-format handling but is still a normal
      HTTP+JSON API you can drive with a provider class (own SSE parser,
      own auth scheme, own error shapes)?
      ├─ Yes → Tier 3 — adapter-based native, days. → tier-3-adapter-native.md
      └─ No — non-HTTP protocol, SDK-mediated auth (e.g. AWS SigV4),
         or a genuinely bespoke multi-step lifecycle.
         → Tier 4 — full custom, justify it. → tier-4-full-custom.md
```

| Tier                       | Example                                                                            | Code required                                                     | Time                              |
| -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| 1 — Aggregator passthrough | A new model id on an existing LiteLLM/OpenRouter route                             | None                                                              | Minutes                           |
| 2 — Catalog entry          | A new zero-quirk OpenAI-compatible vendor (the Groq/xAI/Together shape)            | One data row + one mocked-test section                            | ~1 hour                           |
| 3 — Adapter-based native   | A vendor with its own SDK/wire format but a normal request/response HTTP lifecycle | One provider class                                                | Days                              |
| 4 — Full custom            | SageMaker-class: non-HTTP protocol, SDK-signed auth, bespoke lifecycle             | Custom `executeStream`/`doGenerate`, possibly own CLI subcommands | Days, needs written justification |

Every tier that adds a new `AIProviderName` member (Tier 2 and above) ends
the same way: a manifest at
`docs/provider-integration/manifests/<provider>.json`
(see `../manifests/README.md`) and a green run
of `pnpm run verify:provider-onboarding` (see
`../../../tools/verify-provider-onboarding.ts`).
Tier 1 needs no manifest and no gate — see
`tier-1-aggregator-passthrough.md`.

Use `../../../tools/scaffold-provider.ts`
(`pnpm run scaffold:provider`) to generate the starting-point snippets for
Tiers 2–4 instead of copy-pasting from an existing provider by hand. Both
tools ship in the tree; there is no manual-fallback era anymore — a PR
that skips the gate locally just fails it in CI.
