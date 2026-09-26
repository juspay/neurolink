[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkLanguageModel

# Class: NeuroLinkLanguageModel

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

Model specification string

#### Implementation of

`ClientLanguageModel.modelId`

---

### provider

> `readonly` **provider**: `string`

Provider name

#### Implementation of

`ClientLanguageModel.provider`

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<[`ClientLanguageModelResponse`](../type-aliases/ClientLanguageModelResponse.md)\>

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
