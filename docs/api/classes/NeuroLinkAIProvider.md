[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkAIProvider

# Class: NeuroLinkAIProvider

Defined in: [client/aiSdkAdapter.ts:317](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L317)

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

Defined in: [client/aiSdkAdapter.ts:322](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L322)

#### Parameters

##### options

[`NeuroLinkProviderOptions`](../type-aliases/NeuroLinkProviderOptions.md)

#### Returns

`NeuroLinkProvider`

## Methods

### model()

> **model**(`modelId?`, `options?`): [`NeuroLinkLanguageModel`](NeuroLinkLanguageModel.md)

Defined in: [client/aiSdkAdapter.ts:339](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L339)

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

Defined in: [client/aiSdkAdapter.ts:352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L352)

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

Defined in: [client/aiSdkAdapter.ts:384](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L384)

Get the underlying client

#### Returns

[`NeuroLinkClient`](NeuroLinkClient.md)
