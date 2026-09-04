---
title: Provider Fallback & Model Chains
description: Centralized model-access fallback policy via the providerFallback callback and modelChain config (v9.58.0).
---

Added in **v9.58.0**, NeuroLink supports two complementary mechanisms for handling **model-access denial** errors at request time: the `providerFallback` callback (dynamic, code-driven) and the `modelChain` config (declarative). They give you a single place to express "if my preferred model rejects me, try this one instead" without scattering try/catch logic across every call site.

> **Scope clarification.** Both mechanisms only fire on `ModelAccessDeniedError` (or messages matching `team … not allowed to access model` / `team can only access`). Rate limits, 5xx errors, network failures, and generic provider errors are **not** routed through this orchestrator — those bubble up to the caller as-is. If you need broader resilience, wrap your own retry/circuit-breaker around `generate()` / `stream()`.

---

## When to Use Each

| Mechanism                   | Use when…                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `providerFallback` callback | You need conditional logic — different fallbacks for different error shapes, A/B routing, custom logging |
| `modelChain` config         | You want a simple ordered list of model names to try in sequence on access denial                        |

`providerFallback` and `modelChain` are **not composable** — if `providerFallback` is set (instance- or per-call), `modelChain` is ignored. Internally, when `providerFallback` is _not_ provided, NeuroLink synthesises a callback from `modelChain` that walks the list. They are two ways to wire the same callback slot.

---

## `providerFallback` callback

```typescript
import { NeuroLink, ModelAccessDeniedError } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  providerFallback: async (error) => {
    // Return null to give up (the original error is rethrown to the caller).
    // Return { provider?, model? } to retry. Either field can be omitted —
    // an omitted provider keeps the current one; an omitted model keeps the current one.

    if (
      error instanceof ModelAccessDeniedError &&
      error.allowedModels?.length
    ) {
      return { model: error.allowedModels[0] };
    }
    return null;
  },
});

const result = await neurolink.generate({
  input: { text: "Summarize this PDF" },
  provider: "anthropic",
  model: "claude-opus-4-7",
});
```

The callback signature is:

```typescript
type ProviderFallbackCallback = (error: unknown) => Promise<{
  provider?: string;
  model?: string;
} | null>;
```

- `null` → stop, surface the original error to the caller.
- `{ provider, model }` → retry with this combination. Either field may be omitted; the missing field is inherited from the failing call.

The callback is `async`, takes a single `error` argument (no separate `attemptedProvider` / `attempts` parameters), and is invoked at most once per call by the orchestrator. To loop through several alternates, return the next candidate each time and rely on the orchestrator to re-invoke the callback on the next denial.

### Per-call override

You can also pass `providerFallback` directly on `generate()` / `stream()`. The per-call value wins over the instance-level configuration:

```typescript
await neurolink.generate({
  input: { text: "..." },
  provider: "anthropic",
  model: "claude-opus-4-7",
  providerFallback: async (err) => {
    if (err instanceof ModelAccessDeniedError) {
      return { provider: "openai", model: "gpt-4o" };
    }
    return null;
  },
});
```

For streaming, the orchestrator additionally guards: fallback only kicks in if the stream **has not yet yielded any tokens**. Once tokens have started flowing, a mid-stream denial cannot be transparently retried.

---

## `modelChain` config

A simple ordered list of model **names**. NeuroLink walks the chain on each access-denial.

```typescript
const neurolink = new NeuroLink({
  modelChain: [
    "claude-opus-4-7", // try first
    "claude-sonnet-4-6", // then this
    "gpt-4o", // then this
    "gemini-3-flash-preview", // last resort
  ],
});

await neurolink.generate({ input: { text: "..." } });
// First call: claude-opus-4-7. If that returns ModelAccessDeniedError,
// the synthesized callback returns { model: "claude-sonnet-4-6" } and
// the orchestrator retries.
```

`modelChain` is `string[]` only — bare model names. There is no support for object entries with `provider` / `baseURL` per row. The current provider is preserved across the chain; only the model name changes. If you need to switch providers on denial, use `providerFallback` and return `{ provider, model }`.

```typescript
type ModelChain = string[];
```

---

## Internal no-output fallback (`disableInternalFallback`, `fallbackOnMaxSteps`)

Separate from the orchestration above, `stream()` carries an internal safety
net: when the drained stream produced no non-sentinel text, audio, or image
chunks and recorded no tool calls or tool results, NeuroLink retries the
request once on a fallback route. An audio-only or image-only stream counts
as real output and does not trigger the retry. The route's provider and
model are resolved independently: the per-call `fallbackProvider` /
`fallbackModel` options each override their matching `FALLBACK_PROVIDER` /
`FALLBACK_MODEL` environment variable, which overrides the corresponding
model-router value. Two per-call knobs control the retry:

- `disableInternalFallback: true` — turn the safety net off entirely. The
  Claude proxy does this so the proxy itself can own fallback order.
- `fallbackOnMaxSteps: false` — keep the safety net, but exempt turns that
  ended at your own `maxSteps` bound. A tool-looping turn that runs out of
  step budget produces no final text, which otherwise looks exactly like a
  failed stream to the no-output check — and the retry spends a second
  provider's tokens to exceed a budget you set deliberately. With this set,
  the capped turn is surfaced as-is and reports
  `metadata.stopReason === "step-cap"` after the stream is drained. Default
  (unset) preserves the retry.

`generate()` has no no-output retry, but the same flag governs its two
internal fallbacks: the static provider-priority walk that runs when no
provider was requested, and the catalog model-fallback walk a provider performs
when the vendor rejects its model as invalid. With
`disableInternalFallback: true`, `generate()` tries exactly one provider from
that static list and surfaces an invalid model as the classified
`InvalidModelError` after a single request. A configured `ModelPool`,
`providerFallback` and `modelChain` are your own fallback and are unaffected on
either path: a pool still walks its own candidates.

---

## Observability

When the orchestrator advances past an access-denial, it emits a `model.fallback` event on the SDK's internal emitter:

```typescript
// Payload shape (verbatim from src/lib/neurolink.ts)
type ModelFallbackEvent = {
  requestedProvider: string | undefined;
  requestedModel: string | undefined;
  fallbackProvider: string | undefined;
  fallbackModel: string | undefined;
  reason: string;
  kind: "generate" | "stream";
  timestamp: number;
};
```

The same event also flows through the OTEL/Langfuse pipeline, so you can monitor fallback frequency in production without subscribing to the in-process emitter.

---

## Patterns

### Walk allowed models from the error itself

```typescript
const neurolink = new NeuroLink({
  providerFallback: async (err) => {
    if (err instanceof ModelAccessDeniedError && err.allowedModels?.length) {
      // Use the first allowed model; the orchestrator will re-invoke us if that one is denied too.
      return { model: err.allowedModels[0] };
    }
    return null;
  },
});
```

### Tier-up on denial

```typescript
const neurolink = new NeuroLink({
  providerFallback: async (err) => {
    if (err instanceof ModelAccessDeniedError) {
      // If a cheap model is denied, jump to a higher-tier one
      return { model: "claude-opus-4-7" };
    }
    return null;
  },
});
```

### Cross-provider failover

```typescript
const neurolink = new NeuroLink({
  providerFallback: async (err) => {
    if (err instanceof ModelAccessDeniedError) {
      return { provider: "openrouter", model: "anthropic/claude-opus-4-7" };
    }
    return null;
  },
});
```

---

## Related

- **[Credential Validation](/docs/features/credential-validation)** — `sdk.checkCredentials()` and the typed `ModelAccessDeniedError`
- **[Real-time Voice Services](/docs/features/real-time-services)** — fallback also applies to realtime sessions on access denial
- **[Provider Setup](../getting-started/provider-setup.md)** — configuring all 30+ providers
- **[Observability](observability.md)** — wiring `model.fallback` events into your monitoring stack
