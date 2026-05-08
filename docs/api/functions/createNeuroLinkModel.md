[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createNeuroLinkModel

# Function: createNeuroLinkModel()

> **createNeuroLinkModel**(`options`): [`NeuroLinkLanguageModel`](../classes/NeuroLinkLanguageModel.md)

Defined in: [client/aiSdkAdapter.ts:459](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L459)

Create a standalone NeuroLink model for Vercel AI SDK

## Parameters

### options

[`NeuroLinkProviderOptions`](../type-aliases/NeuroLinkProviderOptions.md) & `object`

## Returns

[`NeuroLinkLanguageModel`](../classes/NeuroLinkLanguageModel.md)

## Example

```typescript
import { createNeuroLinkModel, generateText } from "@neurolink/ai-sdk";

const model = createNeuroLinkModel({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
  modelId: "gpt-4o",
  provider: "openai",
});

const result = await generateText({
  model,
  prompt: "Hello!",
});
```
