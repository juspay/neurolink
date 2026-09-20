---
title: Provider Orchestration Brain
description: Adaptive provider and model selection with intelligent fallbacks based on task classification
keywords: orchestration, provider selection, task classification, routing, intelligent fallback, auto selection
---

# Provider Orchestration Brain

The orchestration engine introduced in 7.42.0 pairs a task classifier with a provider/model router. When enabled, NeuroLink inspects each prompt, chooses the most suitable provider/model based on capabilities and availability, and carries that preference through the fallback chain.

## Highlights

- **Binary task classifier** – categorises prompts (analysis vs. creative, etc.) before routing.
- **Model router** – selects provider/model pairs, honouring local providers like Ollama when available.
- **Provider validation** – confirms credentials/availability before committing to the route.
- **Non-invasive** – orchestration augments requests via context so standard fallback logic still applies.

## Enabling Orchestration (SDK)

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ enableOrchestration: true }); // (1)!

const result = await neurolink.generate({
  input: { text: "Generate product launch plan" }, // (2)!
  enableAnalytics: true, // (3)!
  enableEvaluation: true, // (4)!
});

console.log(result.provider, result.model); // (5)!
```

1. Enable orchestration for automatic provider/model selection
2. Task classifier analyzes prompt to determine best provider
3. Log routing decisions to analytics
4. Validate routed provider meets quality expectations
5. See which provider/model was selected by the router

The router adds `__orchestratedPreferredProvider` to the request context so analytics and downstream logging capture routing decisions.

## Tuning the Router

- **Environment awareness** – orchestration only routes to providers that pass `hasProviderEnvVars`, so missing API keys fall back gracefully.
- **Ollama detection** – checks `http://localhost:11434/api/tags` to verify local models before selection.
- **Confidence scores** – `ModelRouter.route` returns `confidence` and `reasoning`. Enable debug logs (`export NEUROLINK_DEBUG=true`) to inspect decisions.
- **Manual overrides** – specifying `provider` or `model` bypasses orchestration for that call.

## Working with the CLI

CLI sessions instantiate NeuroLink without orchestration by default. To experiment with the router from the CLI:

```bash
node -e "  # (1)!
const { NeuroLink } = require('@juspay/neurolink');
(async () => {
  const neurolink = new NeuroLink({ enableOrchestration: true });  # (2)!
  const res = await neurolink.generate({ input: { text: 'Compare Claude and GPT-4o' } });  # (3)!
  console.log(res.provider, res.model);  # (4)!
})();
"
```

1. Run Node.js one-liner from CLI
2. Enable orchestration in SDK mode
3. Let router select best provider for comparison task
4. Output selected provider and model

Future CLI releases will surface a `--enable-orchestration` flag; until then keep orchestration for SDK/server workloads.

## Best Practices

:::tip[Routing Strategy]
Enable orchestration in development to understand routing patterns, then pin `provider` or `model` in production for predictable behavior. Orchestration is ideal for exploratory workflows; explicit selection ensures consistency in critical paths.
:::

:::tip[Self-Hosted First]
The default fallback order prioritizes self-hosted providers — LiteLLM and Ollama — before cloud providers. This avoids external API costs and rate limits during development. Ensure your local providers are running to take advantage of this local-first routing.
:::

- Pair orchestration with evaluation to verify the routed provider meets quality expectations.
- Maintain provider credentials for all potential routes; orchestration skips providers missing keys.
- Monitor debug logs in staging to understand how tasks map to providers before rolling out widely.
- Combine with regional controls (`region` option) when routing to cloud-specific providers such as Vertex or Bedrock.

## Troubleshooting

| Symptom                             | Action                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Router always returns empty context | Ensure `enableOrchestration: true` and prompts contain text.                                       |
| Routed provider never used          | Check credentials via `neurolink status`; orchestration only hints the preferred provider.         |
| Ollama route ignored                | Confirm Ollama server running at `http://localhost:11434` and model tag matches router suggestion. |
| Fallback cycles between providers   | Pin provider/model explicitly or reduce orchestrated confidence thresholds (see `ModelRouter`).    |

## `ModelPool` — failover with per-member cooldown

Orchestration above _hints_ a provider. `ModelPool` is the separate, explicit
mechanism that **owns** selection: you hand it an ordered list of
provider/model/region members and it tries them in turn, taking a failed member
out of rotation for a while rather than retrying it on every call.

**File:** `src/lib/routing/modelPool.ts` · **Types:** `src/lib/types/modelPool.ts`

```typescript
import { ModelPool } from "@juspay/neurolink";

const pool = new ModelPool({
  members: [
    { provider: "vertex", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  strategy: "priority", // or "round-robin" | "weighted"
  cooldownMs: 60_000, // retryable failures only
});
```

`strategy` picks among the members that are currently _available_: `priority`
always takes the first, `round-robin` rotates, `weighted` prefers higher
`weight`.

### Cooldown is classified, not uniform

A failure is classified into a `ProviderErrorClass` — `rate_limit`, `auth`,
`context_window`, `server`, `network`, `unknown` — and the class decides how
long the member sits out:

| Class                                        | Cooldown                                  |
| -------------------------------------------- | ----------------------------------------- |
| `rate_limit`, `server`, `network`, `unknown` | `cooldownMs` (default **60s**)            |
| `auth`, `context_window`                     | **permanent** for the life of the process |

"Permanent" is literal: `PERMANENT_COOLDOWN_MS` is ten years. The reasoning is
that neither class can fix itself mid-process — a rejected key stays rejected,
and a request that overflowed a model's window will overflow it again — so
retrying only burns latency on every subsequent call.

⚠️ **This is why a context budget may only ever shrink.** One optimistic guess
that overflows a model's window does not cost a retry; it retires that model
for the life of the process. Everything in
[context budget](/docs/features/context-budget) and the
[model catalogue](/docs/features/classifier-router-catalog) that looks
over-cautious about raising a threshold is cautious for this reason, and the
catalogue vetoes a model whose window cannot hold the request _regardless of
how confident the pick was_ — an oversized request is a hard provider error,
not a slightly worse answer.

### A configured pool disables the classifier router

The [classifier router](/docs/features/classifier-router) is skipped entirely
when a `modelPool` is configured, because the two would otherwise both claim
the right to choose a model. The pool wins: it is the explicit, host-declared
statement, and it is the one carrying failover state. A host that wants
per-request routing should use the classifier router's own `pool` rather than a
`ModelPool`.

## Dive Deeper

- Code reference: `src/lib/utils/modelRouter.ts`
- Code reference: `src/lib/utils/taskClassifier.ts`
- Code reference: `src/lib/routing/modelPool.ts`
- [Classifier Router](/docs/features/classifier-router) — per-request model selection
- [Provider Fallback](/docs/features/provider-fallback)
- [`docs/advanced/analytics.md`](../advanced/analytics.md) for logging orchestration metadata.
