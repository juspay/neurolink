[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkAIProvider

# Class: NeuroLinkAIProvider

Defined in: [client/aiSdkAdapter.ts:318](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L318)

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

Defined in: [client/aiSdkAdapter.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L323)

#### Parameters

##### options

[`NeuroLinkProviderOptions`](../type-aliases/NeuroLinkProviderOptions.md)

#### Returns

`NeuroLinkProvider`

## Methods

### model()

> **model**(`modelId?`, `options?`): [`NeuroLinkLanguageModel`](NeuroLinkLanguageModel.md)

Defined in: [client/aiSdkAdapter.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L340)

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

Defined in: [client/aiSdkAdapter.ts:353](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L353)

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

Defined in: [client/aiSdkAdapter.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L385)

Get the underlying client

#### Returns

[`NeuroLinkClient`](NeuroLinkClient.md)
