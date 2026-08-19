# Tier 1 — Aggregator Passthrough

**When this applies:** the model you want is already reachable through a
provider NeuroLink already registers as a pass-through aggregator —
today that's `litellm` (any backend the user's LiteLLM proxy exposes) or
`openrouter` (any model in OpenRouter's catalog). No new
`AIProviderName` member, no new provider class, no new catalog row.

**What you're actually doing:** picking a model id string and confirming
it works — this is a _usage_ change, not an _integration_ change.

## Checklist

- [ ] Confirm the aggregator actually serves the model. For LiteLLM,
      check the proxy's `/v1/models` (or its `config.yaml`) for the
      model's `model_name`. For OpenRouter, check
      `https://openrouter.ai/models` for the exact `vendor/model-id`
      slug.
- [ ] No `AIProviderName` enum change. No `PROVIDER_DESCRIPTORS` change.
      No `OPENAI_COMPAT_CATALOG` change. If you find yourself editing any
      of those three for a "Tier 1" provider, it isn't Tier 1 — restart
      from `../tiers/README.md`'s decision tree.
- [ ] Optional: if the model needs a friendlier default alias, add it to
      `MODEL_ALIASES` / `DEFAULT_MODEL_ALIASES` in
      `src/lib/models/modelRegistry.ts`. Not required for the model to
      work.
- [ ] Optional: if the model needs a documented env var (e.g., a
      dedicated LiteLLM route), document it in
      `docs/getting-started/environment-variables.md`.
- [ ] Manually smoke-test the model end-to-end.
- [ ] No manifest file is required — `tools/verify-provider-onboarding.ts`
      (see `../../../tools/verify-provider-onboarding.ts`) only gates
      _new_ `AIProviderName` members, and Tier 1 never adds one.

## Verification commands

```bash
# LiteLLM example
pnpm run cli generate "hello" --provider litellm --model <litellm-model-name>

# OpenRouter example
pnpm run cli generate "hello" --provider openrouter --model <vendor>/<model-id>
```

Both should return a normal `GenerateResult` with non-empty `content`. If
either 400s with an "unknown model" style error, the aggregator doesn't
actually serve that model yet — fix the aggregator-side config, not
NeuroLink.
