[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkAIProvider

# Class: NeuroLinkAIProvider

NeuroLink Provider for Vercel AI SDK

Creates model instances that are compatible with the Vercel AI SDK.

## Example

```typescript
import { neurolink } from "@neurolink/ai-sdk";

const provider = neurolink({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: "your-api-key",
});

// Create a model
const model = provider("gpt-4o");

// Use with AI SDK
const result = await generateText({
  model,
  prompt: "Hello!",
});
```

## Constructors

### Constructor

> **new NeuroLinkAIProvider**(`options`): `NeuroLinkProvider`

#### Parameters

##### options

[`NeuroLinkProviderOptions`](../type-aliases/NeuroLinkProviderOptions.md)

#### Returns

`NeuroLinkProvider`

## Methods

### model()

> **model**(`modelId?`, `options?`): [`NeuroLinkLanguageModel`](NeuroLinkLanguageModel.md)

Create a language model instance

#### Parameters

##### modelId?

`string`

Model ID (e.g., 'gpt-4o', 'claude-3-opus')

##### options?

[`ClientModelOptions`](../type-aliases/ClientModelOptions.md)

Additional model options

#### Returns

[`NeuroLinkLanguageModel`](NeuroLinkLanguageModel.md)

---

### call()

> **call**(`modelId?`, `options?`): [`NeuroLinkLanguageModel`](NeuroLinkLanguageModel.md)

Alias for model() - makes the provider callable

#### Parameters

##### modelId?

`string`

##### options?

[`ClientModelOptions`](../type-aliases/ClientModelOptions.md)

#### Returns

[`NeuroLinkLanguageModel`](NeuroLinkLanguageModel.md)

---

### getClient()

> **getClient**(): [`NeuroLinkClient`](NeuroLinkClient.md)

Get the underlying client

#### Returns

[`NeuroLinkClient`](NeuroLinkClient.md)
