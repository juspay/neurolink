---
title: "Classifier Router"
description: Automatically classify each request and route it to the right model (and tool set) from a configurable base pool — cheaper/faster models for easy tasks, more capable models for hard ones
keywords:
  [
    classifier,
    router,
    model-routing,
    multi-model,
    dynamic-model-selection,
    tool-filtering,
    litellm,
    cost-optimization,
  ]
---

# Classifier Router

> **Status**: Stable | **Availability**: SDK + CLI | **Opt-in** (disabled by default)

## Overview

The **Classifier Router** lets NeuroLink decide, per request, **which model to use** (and, optionally, **which tools to expose**) from a pool you declare — routing hard/complex tasks to more capable models and easy tasks to cheaper, faster ones. You give it a pool of models; it classifies the incoming prompt and switches to the best one transparently before the call runs.

```
                 ┌─────────────── classifier router ───────────────┐
  generate()  →  │  classify difficulty  →  pick model + tools  →   │  →  chosen model runs
                 └──────────────────────────────────────────────────┘
```

It is **opt-in** (`classifierRouter.enabled` defaults to `false`), **fails open** (any classifier/selection error leaves the call exactly as it would have been), and is fully **backward compatible** — a default `new NeuroLink()` is unchanged.

Typical use cases:

- **Cost optimization** — send `"hi"` to a cheap model and a multi-step architecture question to a powerful one, automatically.
- **Latency optimization** — keep simple turns on fast models.
- **Custom / self-hosted fleets** — route across LiteLLM, OpenAI-compatible, or Ollama models that aren't in any registry.
- **Per-difficulty tool scoping** — expose fewer tools for trivial tasks.

## How it works

Each request flows through two stages:

1. **Classify** — produce a difficulty bucket (`trivial | simple | moderate | hard | expert`) plus optional `requiredCapabilities` and tool hints. Two strategies:
   - `heuristic` (default): zero-cost keyword/length scoring of the prompt text. No LLM call, fully deterministic, provider-agnostic.
   - `llm`: a cheap "classifier model" reads the prompt and returns a difficulty — and, when given your pool, **picks a model directly** by id.
2. **Select** — turn that into a concrete `{ provider, model, region }` from your `pool`, optionally narrowing `tools`.

The router runs **before** the provider/model is constructed (it reuses the same pre-call seam as `requestRouter`). It is skipped when the caller pinned both `provider` and `model`, or when a [`modelPool`](/docs/features/provider-orchestration) is configured (the pool owns selection).

## Quick start (heuristic, SDK)

```typescript
import { NeuroLink } from "@juspay/neurolink";

const nl = new NeuroLink({
  classifierRouter: {
    enabled: true,
    classifier: "heuristic", // default — no LLM cost
    pool: [
      { provider: "vertex", model: "gemini-2.5-flash" }, // cost/quality auto-enriched
      { provider: "vertex", model: "gemini-2.5-pro" },
    ],
  },
});

await nl.generate({ input: { text: "hi" } }); // → routed to gemini-2.5-flash
await nl.generate({
  input: {
    text: "Design a fault-tolerant multi-region event architecture and justify the consistency trade-offs.",
  },
}); // → routed to gemini-2.5-pro
```

## Defining "which model for which case"

The router resolves a model using the **first** of these that applies:

| #   | Mechanism              | How you define it                                                                  | Best for                              |
| --- | ---------------------- | ---------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | **LLM direct pick**    | `classifier: "llm"` + a `description` on each pool member                          | Custom/registry-less models; smartest |
| 2   | **`tierMap`**          | Explicit `difficulty → members` map                                                | Full, deterministic control           |
| 3   | **Per-member `tiers`** | `tiers: ["hard","expert"]` on a member                                             | Simple, explicit, generic             |
| 4   | **Metadata scoring**   | `cost` / `quality` per member (declared, or auto-enriched from the model registry) | Known models with comparable metadata |

> When two members can't be separated (e.g. equal declared quality, or the model registry only knows both as "high" quality), the router keeps the declared pool order. For reliable hard-vs-easy separation, prefer mechanisms 1–3, or give members distinct `quality` values.

### Metadata scoring rules

- `trivial` / `simple` → cheapest first (`cost` ascending)
- `moderate` → best `quality − cost`
- `hard` / `expert` → most capable first (`quality` descending)

Members may declare `cost` (relative, lower = cheaper) and `quality` (relative, higher = more capable). If omitted, NeuroLink tries to enrich them from its model registry; if the model is unknown (e.g. a custom LiteLLM endpoint), use mechanisms 1–3 instead.

## Custom & self-hosted models (LiteLLM, OpenAI-compatible, Ollama)

These models aren't in any registry, so define routing explicitly — both approaches are fully generic:

**Heuristic + `tiers` (deterministic, no LLM cost):**

```typescript
new NeuroLink({
  classifierRouter: {
    enabled: true,
    classifier: "heuristic",
    pool: [
      {
        provider: "litellm",
        model: "my-fast-endpoint",
        tiers: ["trivial", "simple", "moderate"],
      },
      {
        provider: "litellm",
        model: "my-strong-endpoint",
        tiers: ["hard", "expert"],
      },
    ],
  },
});
```

**LLM picks per-prompt from plain-English descriptions (most flexible):**

```typescript
new NeuroLink({
  classifierRouter: {
    enabled: true,
    classifier: "llm",
    classifierModel: { provider: "litellm", model: "cheap-classifier-model" },
    pool: [
      {
        provider: "litellm",
        model: "my-fast-endpoint",
        description: "cheap & fast; greetings, simple lookups, short Q&A",
      },
      {
        provider: "litellm",
        model: "my-strong-endpoint",
        description:
          "powerful reasoning; complex multi-step analysis, architecture, hard math/code",
      },
    ],
  },
});
```

The classifier model is shown each candidate's `id` (defaults to `provider/model`) and description, and returns the best `id` for the prompt. An invalid or absent pick falls back to difficulty-based selection; any classifier failure falls back to the heuristic.

## Narrowing tools per difficulty

Filter the tool set per difficulty with `toolDirectives` (and/or let the LLM classifier suggest tools). `toolFilter` is an allowlist; `excludeTools` is a denylist — both are enforced by the provider before the model call.

```typescript
new NeuroLink({
  classifierRouter: {
    enabled: true,
    pool: [...],
    toolDirectives: {
      trivial: { toolFilter: [] }, // no tools for trivial turns
      expert: { excludeTools: ["delete_resource"] },
    },
  },
});
```

## CLI usage

```bash
# Heuristic routing across a pool (inline JSON or a file path)
neurolink generate "hi" \
  --classifier-router \
  --classifier-pool '[{"provider":"vertex","model":"gemini-2.5-flash","tiers":["trivial","simple","moderate"]},{"provider":"vertex","model":"gemini-2.5-pro","tiers":["hard","expert"]}]'

# LLM classifier picks the model per prompt (descriptions drive the choice)
neurolink generate "Design a multi-region architecture" \
  --classifier-router \
  --classifier-strategy llm \
  --classifier-model-provider vertex --classifier-model-name gemini-2.5-flash \
  --classifier-pool ./pool.json
```

| Flag                          | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `--classifier-router`         | Enable the classifier router.                           |
| `--classifier-strategy`       | `heuristic` (default) or `llm`.                         |
| `--classifier-model-provider` | Provider for the LLM classifier model (`strategy=llm`). |
| `--classifier-model-name`     | Model name for the LLM classifier model.                |
| `--classifier-model-region`   | Region for the LLM classifier model.                    |
| `--classifier-pool`           | JSON file path or inline JSON array of pool members.    |
| `--classifier-timeout`        | LLM classifier hard timeout (ms).                       |

> CLI flags cover the common case (strategy, classifier model, pool). For `tierMap` and `toolDirectives`, use the SDK config.

## Configuration reference

```typescript
type ClassifierRouterConfig = {
  enabled: boolean; // master switch; false/absent → router never built
  classifier?: "heuristic" | "llm"; // default: "heuristic"
  classifierModel?: {
    provider?: string;
    model?: string;
    region?: string;
    temperature?: number;
  }; // for "llm"
  pool: ClassifierRouterPoolMember[]; // the available base
  tierMap?: Partial<Record<ClassifierDifficulty, ClassifierRouterPoolMember[]>>;
  toolDirectives?: Partial<
    Record<
      ClassifierDifficulty,
      { toolFilter?: string[]; excludeTools?: string[] }
    >
  >;
  timeoutMs?: number; // LLM classifier hard timeout (default 8000)
};

type ClassifierRouterPoolMember = {
  provider: string;
  model?: string;
  region?: string;
  id?: string; // stable id for LLM selection (default `provider/model`)
  description?: string; // drives LLM selection
  tiers?: ClassifierDifficulty[]; // restrict member to these difficulties
  cost?: number; // relative cost (lower = cheaper)
  quality?: number; // relative quality (higher = more capable)
  capabilities?: string[]; // e.g. ["vision","tools","reasoning"]
  weight?: number; // tiebreak
};
```

## Precedence & interactions

Model selection resolves in this order: **caller-pinned `provider`+`model`** > **classifierRouter** > **`requestRouter`** > legacy `enableOrchestration`. The classifier marks the request so the downstream selectors stand down.

- **`modelPool`** — when a `modelPool` is configured the classifier stands down (the pool owns selection); use one or the other for model choice.
- **`toolRouting`** — the dedicated tool-routing feature still applies; classifier `toolDirectives` are additive.

## Caveats

- **Registry quality is coarse.** Auto-enrichment maps a model to a 3-bucket quality (`high/medium/low`), so two "high" models can't be separated on capability alone — declare `quality`/`tiers`/`tierMap` or use the LLM pick for reliable hard-vs-easy routing.
- **LLM classifier latency/cost.** The `llm` strategy adds one cheap call per uncached turn; prefer a small, fast, non-Gemini model and keep `heuristic` as the default where determinism matters.
- **Gemini tools + JSON schema.** The classifier call uses a schema with tools disabled, so the Gemini exclusivity rule doesn't apply to it; when routing a tools + structured-output request, prefer a non-Gemini target model.
- **Prompt privacy (LLM strategy).** The `llm` classifier sends a truncated copy of the prompt to the classifier model, so the same data-handling/retention considerations as any provider call apply. The `heuristic` default keeps classification fully in-process (no prompt leaves your environment) — prefer it where that matters.

## See also

- [Provider Orchestration & Model Pool](/docs/features/provider-orchestration)
- [Provider Fallback](/docs/features/provider-fallback)
- [Per-Request Credentials](/docs/features/per-request-credentials)
