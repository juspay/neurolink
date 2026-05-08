---
title: Credential Validation
description: Pre-flight credential validation with sdk.checkCredentials() and the typed ModelAccessDeniedError (v9.59.0).
---

Added in **v9.59.0**, NeuroLink ships a typed `ModelAccessDeniedError` and a pre-flight `sdk.checkCredentials()` API. Together they let you validate provider credentials _before_ wiring them into a long-running flow — useful for setup wizards, health checks, and surfacing actionable errors to users instead of opaque HTTP 401/403s.

---

## `sdk.checkCredentials()`

Probes a single provider with a real 1-token generation call (`maxTokens: 16`, tools disabled) and returns a structured status. The signature is:

```typescript
async checkCredentials(input: { provider: string; model?: string }): Promise<{
  provider: string;
  status: "ok" | "missing" | "expired" | "denied" | "network" | "unknown";
  detail: string;
}>;
```

Implementation lives in `src/lib/neurolink.ts`.

### Basic usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const report = await neurolink.checkCredentials({ provider: "openai" });
console.log(report);
// { provider: "openai", status: "ok", detail: "credentials valid" }
```

### Probing a specific model

```typescript
const report = await neurolink.checkCredentials({
  provider: "anthropic",
  model: "claude-opus-4-7",
});
// status === "denied" if the model is enrolled but the calling subscription tier
// or team does not have access to that specific model.
```

### Status reference

| `status`    | Meaning                                                               |
| ----------- | --------------------------------------------------------------------- |
| `"ok"`      | Credentials valid; the probe succeeded.                               |
| `"missing"` | Required env vars / per-call credentials are not set.                 |
| `"expired"` | OAuth token / temporary credentials have expired.                     |
| `"denied"`  | Model access denied — see `ModelAccessDeniedError` below.             |
| `"network"` | Network failure reaching the provider (DNS, TLS, timeout).            |
| `"unknown"` | An unclassified provider error; inspect `detail` for the raw message. |

`detail` is a short human-readable message suitable for surfacing in a setup UI or log line.

### Probing several providers

`checkCredentials()` validates one provider per call. To check multiple providers, run them concurrently:

```typescript
const results = await Promise.all(
  ["openai", "anthropic", "vertex", "deepseek"].map((provider) =>
    neurolink.checkCredentials({ provider }).catch((err) => ({
      provider,
      status: "unknown" as const,
      detail: err instanceof Error ? err.message : String(err),
    })),
  ),
);

const broken = results.filter((r) => r.status !== "ok");
for (const r of broken) {
  console.warn(`${r.provider}: ${r.status} — ${r.detail}`);
}
```

---

## `ModelAccessDeniedError`

When a generate/stream call hits a model-access policy (e.g. the team is not allowed to use a particular model, or a tier-restricted model is requested), NeuroLink throws a typed `ModelAccessDeniedError` instead of a generic `Error`. This makes it catchable by the [`providerFallback`](/docs/features/provider-fallback) orchestrator and lets you produce actionable UI.

```typescript
import { NeuroLink, ModelAccessDeniedError } from "@juspay/neurolink";

try {
  await neurolink.generate({
    input: { text: "Hello" },
    provider: "anthropic",
    model: "claude-opus-4-7",
  });
} catch (err) {
  if (err instanceof ModelAccessDeniedError) {
    console.error("Model access denied for", err.provider);
    console.error("Requested model:", err.requestedModel);
    console.error("Allowed models:", err.allowedModels);
    // Show user a setup link, or fall back to a model in `allowedModels`.
  }
  throw err;
}
```

### Error shape

```typescript
class ModelAccessDeniedError extends ProviderError {
  readonly name: "ModelAccessDeniedError";
  readonly code: "MODEL_ACCESS_DENIED";
  readonly provider?: string; // inherited from ProviderError
  readonly requestedModel?: string;
  readonly allowedModels?: string[];
}
```

The exact definition lives in `src/lib/types/errors.ts`.

---

## CLI

NeuroLink does not ship a dedicated `check-credentials` CLI command. The closest operator-facing command is:

```bash
# Check provider connectivity / status
npx @juspay/neurolink status
```

For programmatic credential validation in scripts, call the SDK directly:

```typescript
const r = await neurolink.checkCredentials({ provider });
process.exit(r.status === "ok" ? 0 : 1);
```

---

## Combining with Provider Fallback

The most common pattern: validate at boot, surface configuration errors to operators, then let runtime requests use [`providerFallback`](/docs/features/provider-fallback) for the model-access denial cases that survive validation.

```typescript
// Boot-time validation
for (const provider of ["anthropic", "openai", "vertex"]) {
  const r = await neurolink.checkCredentials({ provider });
  if (r.status !== "ok") {
    console.warn(
      `Provider ${provider} not configured: ${r.status} — ${r.detail}`,
    );
  }
}

// Runtime: per-instance providerFallback handles ModelAccessDeniedError
const sdk = new NeuroLink({
  providerFallback: async (err) => {
    if (err instanceof ModelAccessDeniedError && err.allowedModels?.length) {
      return { model: err.allowedModels[0] };
    }
    return null;
  },
});
```

---

## Setup Wizard Pattern

```typescript
async function runSetupWizard() {
  const apiKey = await prompt("Enter your OpenAI API key:");
  process.env.OPENAI_API_KEY = apiKey;

  const r = await neurolink.checkCredentials({ provider: "openai" });

  if (r.status === "ok") {
    await writeEnv({ OPENAI_API_KEY: apiKey });
    console.log("Configured.");
  } else {
    console.error(`Invalid key (${r.status}):`, r.detail);
  }
}
```

Per-call credential overrides are also supported on `generate()` / `stream()` — see [Per-Request Credentials](/docs/features/per-request-credentials).

---

## Related

- **[Provider Fallback](/docs/features/provider-fallback)** — catch `ModelAccessDeniedError` and switch to an allowed model
- **[Per-Request Credentials](/docs/features/per-request-credentials)** — pass credentials per-call or per-instance
- **[Provider Setup](../getting-started/provider-setup.md)** — initial configuration for all 21+ providers
- **[Troubleshooting](../reference/troubleshooting.md)** — error reference and resolution guide
