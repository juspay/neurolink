[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAIProvider

# Function: createAIProvider()

> **createAIProvider**(`providerName?`, `modelName?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [index.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/index.ts#L291)

Quick start factory function for creating AI provider instances.

Creates a configured AI provider instance ready for immediate use.
Supports 14+ providers: OpenAI, Anthropic, Google AI Studio,
Google Vertex, AWS Bedrock, AWS SageMaker, Azure OpenAI, Hugging Face,
LiteLLM, Mistral, Ollama, OpenAI Compatible, OpenRouter, and more.

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
const provider = await createAIProvider("vertex", "gemini-3-flash-preview");
```

## See

- [AIProviderFactory.createProvider](../classes/AIProviderFactory.md#createprovider)
- [NeuroLink](../classes/NeuroLink.md) for the main SDK class

## Since

1.0.0
