[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAIProvider

# Function: createAIProvider()

> **createAIProvider**(`providerName?`, `modelName?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [index.ts:158](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/index.ts#L158)

Quick start factory function for creating AI provider instances.

Creates a configured AI provider instance ready for immediate use.
Supports all 13 providers: OpenAI, Anthropic, Google AI Studio,
Google Vertex, AWS Bedrock, AWS SageMaker, Azure OpenAI, Hugging Face,
LiteLLM, Mistral, Ollama, OpenAI Compatible, and OpenRouter.

## Parameters

### providerName?

`string`

The AI provider name (e.g., 'bedrock', 'vertex', 'openai')

### modelName?

`string`

Optional model name to override provider default

## Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Promise resolving to configured AI provider instance

## Examples

```typescript
import { createAIProvider } from "@juspay/neurolink";

const provider = await createAIProvider("bedrock");
const result = await provider.stream({ input: { text: "Hello, AI!" } });
```

```typescript
const provider = await createAIProvider("vertex", "gemini-3-flash");
```

## See

- [AIProviderFactory.createProvider](../classes/AIProviderFactory.md#createprovider)
- [NeuroLink](../classes/NeuroLink.md) for the main SDK class

## Since

1.0.0
