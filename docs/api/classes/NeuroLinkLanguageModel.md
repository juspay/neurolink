[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkLanguageModel

# Class: NeuroLinkLanguageModel

Defined in: [client/aiSdkAdapter.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L50)

NeuroLink Language Model implementation compatible with Vercel AI SDK

Implements the LanguageModelV1 interface for drop-in compatibility.

## Example

```typescript
import { generateText } from "ai-sdk";
// Replace "ai-sdk" with the Vercel AI SDK package name in your project.
import { createNeuroLinkModel } from "@neurolink/ai-sdk";

const model = createNeuroLinkModel({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: "your-api-key",
});

const result = await generateText({
  model: model("gpt-4o"),
  prompt: "Hello, world!",
});
```

## Implements

- [`ClientLanguageModel`](../type-aliases/ClientLanguageModel.md)

## Constructors

### Constructor

> **new NeuroLinkLanguageModel**(`client`, `modelId`, `provider`, `options?`): `NeuroLinkLanguageModel`

Defined in: [client/aiSdkAdapter.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L56)

#### Parameters

##### client

[`NeuroLinkClient`](NeuroLinkClient.md)

##### modelId

`string`

##### provider

`string`

##### options?

[`ClientModelOptions`](../type-aliases/ClientModelOptions.md) = `{}`

#### Returns

`NeuroLinkLanguageModel`

## Properties

### modelId

> `readonly` **modelId**: `string`

Defined in: [client/aiSdkAdapter.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L51)

Model specification string

#### Implementation of

`ClientLanguageModel.modelId`

---

### provider

> `readonly` **provider**: `string`

Defined in: [client/aiSdkAdapter.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L52)

Provider name

#### Implementation of

`ClientLanguageModel.provider`

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<[`ClientLanguageModelResponse`](../type-aliases/ClientLanguageModelResponse.md)\>

Defined in: [client/aiSdkAdapter.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L71)

Generate a non-streaming response

#### Parameters

##### options

[`ClientLanguageModelCallOptions`](../type-aliases/ClientLanguageModelCallOptions.md)

#### Returns

`Promise`\<[`ClientLanguageModelResponse`](../type-aliases/ClientLanguageModelResponse.md)\>

#### Implementation of

`ClientLanguageModel.doGenerate`

---

### doStream()

> **doStream**(`options`): `Promise`\<[`ClientLanguageModelStreamResponse`](../type-aliases/ClientLanguageModelStreamResponse.md)\>

Defined in: [client/aiSdkAdapter.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L130)

Generate a streaming response

Uses an async queue so that each text delta from the provider is yielded
to the consumer immediately, rather than buffering the entire response.

#### Parameters

##### options

[`ClientLanguageModelCallOptions`](../type-aliases/ClientLanguageModelCallOptions.md)

#### Returns

`Promise`\<[`ClientLanguageModelStreamResponse`](../type-aliases/ClientLanguageModelStreamResponse.md)\>

#### Implementation of

`ClientLanguageModel.doStream`
