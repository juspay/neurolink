[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBestAIProvider

# Function: createBestAIProvider()

> **createBestAIProvider**(`requestedProvider?`, `modelName?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [index.ts:260](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/index.ts#L260)

Create the best available provider based on environment configuration.

Intelligently selects the best provider based on available API keys
in environment variables. Automatically detects and configures the
optimal provider without manual configuration.

## Parameters

### requestedProvider?

`string`

Optional preferred provider name

### modelName?

`string`

Optional model name

## Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Promise resolving to the best configured provider

## Examples

```typescript
import { createBestAIProvider } from "@juspay/neurolink";

// Automatically uses provider with configured API key
const provider = await createBestAIProvider();
const result = await provider.generate({ input: { text: "Hello!" } });
```

```typescript
// Tries to use OpenAI, falls back to available provider
const provider = await createBestAIProvider("openai");
```

## Remarks

Environment variables checked (in order):

- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GOOGLE_API_KEY
- VERTEX_PROJECT_ID + credentials
- AWS credentials for Bedrock
- And more...

## See

- [AIProviderFactory.createBestProvider](../classes/AIProviderFactory.md#createbestprovider)
- [getBestProvider](getBestProvider.md) for provider detection utility

## Since

1.0.0
