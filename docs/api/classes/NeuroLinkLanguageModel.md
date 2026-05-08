[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkLanguageModel

# Class: NeuroLinkLanguageModel

Defined in: [client/aiSdkAdapter.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L49)

NeuroLink Language Model implementation compatible with Vercel AI SDK

Implements the LanguageModelV1 interface for drop-in compatibility.

## Example

```typescript
import { generateText } from "ai";
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

Defined in: [client/aiSdkAdapter.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L55)

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

Defined in: [client/aiSdkAdapter.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L50)

Model specification string

#### Implementation of

`ClientLanguageModel.modelId`

---

### provider

> `readonly` **provider**: `string`

Defined in: [client/aiSdkAdapter.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L51)

Provider name

#### Implementation of

`ClientLanguageModel.provider`

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<[`ClientLanguageModelResponse`](../type-aliases/ClientLanguageModelResponse.md)\>

Defined in: [client/aiSdkAdapter.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L70)

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

Defined in: [client/aiSdkAdapter.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L129)

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
