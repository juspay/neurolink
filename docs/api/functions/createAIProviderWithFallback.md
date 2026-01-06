[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAIProviderWithFallback

# Function: createAIProviderWithFallback()

> **createAIProviderWithFallback**(`primaryProvider?`, `fallbackProvider?`, `modelName?`): `Promise`\<`ProviderPairResult`\<[`AIProvider`](../type-aliases/AIProvider.md)\>\>

Defined in: [index.ts:207](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/index.ts#L207)

Create provider with automatic fallback for production resilience.

Creates both primary and fallback provider instances for high-availability
deployments. Automatically switches to fallback on primary provider failure.

## Parameters

### primaryProvider?

`string`

Primary AI provider name (default: 'bedrock')

### fallbackProvider?

`string`

Fallback AI provider name (default: 'vertex')

### modelName?

`string`

Optional model name for both providers

## Returns

`Promise`\<`ProviderPairResult`\<[`AIProvider`](../type-aliases/AIProvider.md)\>\>

Promise resolving to object with primary and fallback providers

## Examples

```typescript
import { createAIProviderWithFallback } from "@juspay/neurolink";

const { primary, fallback } = await createAIProviderWithFallback(
  "bedrock",
  "vertex",
);

try {
  const result = await primary.generate({ input: { text: "Hello!" } });
} catch (error) {
  // Automatically use fallback
  const result = await fallback.generate({ input: { text: "Hello!" } });
}
```

```typescript
const { primary, fallback } = await createAIProviderWithFallback(
  "vertex", // Primary: US region
  "bedrock", // Fallback: Global
  "claude-3-sonnet",
);
```

## See

[AIProviderFactory.createProviderWithFallback](../classes/AIProviderFactory.md#createproviderwithfallback)

## Since

1.0.0
