[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildObservabilityConfigFromEnv

# Function: buildObservabilityConfigFromEnv()

> **buildObservabilityConfigFromEnv**(): [`ObservabilityConfig`](../type-aliases/ObservabilityConfig.md) \| `undefined`

Defined in: [utils/observabilityHelpers.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/observabilityHelpers.ts#L29)

Build observability config from environment variables

Reads Langfuse configuration from environment:

- LANGFUSE_ENABLED: Enable/disable Langfuse (must be "true")
- LANGFUSE_PUBLIC_KEY: Your Langfuse public key (required)
- LANGFUSE_SECRET_KEY: Your Langfuse secret key (required)
- LANGFUSE_BASE_URL: Langfuse server URL (default: https://cloud.langfuse.com)
- LANGFUSE_ENVIRONMENT: Environment name (default: dev)
- PUBLIC_APP_VERSION: Release/version identifier (default: v1.0.0)

## Returns

[`ObservabilityConfig`](../type-aliases/ObservabilityConfig.md) \| `undefined`

ObservabilityConfig if all required env vars are set, undefined otherwise

## Example

```typescript
import { NeuroLink, buildObservabilityConfigFromEnv } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  observability: buildObservabilityConfigFromEnv(),
});
```
