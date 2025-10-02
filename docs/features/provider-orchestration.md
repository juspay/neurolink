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

!!! tip "Routing Strategy"
Enable orchestration in development to understand routing patterns, then pin `provider` or `model` in production for predictable behavior. Orchestration is ideal for exploratory workflows; explicit selection ensures consistency in critical paths.

!!! tip "Ollama Local-First"
The router prioritizes local Ollama models when available, reducing costs and latency for development workflows. Ensure Ollama is running (`http://localhost:11434`) to take advantage of local-first routing.

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

## Dive Deeper

- Code reference: `src/lib/utils/modelRouter.ts`
- Code reference: `src/lib/utils/taskClassifier.ts`
- [`docs/advanced/analytics.md`](../advanced/analytics.md) for logging orchestration metadata.
