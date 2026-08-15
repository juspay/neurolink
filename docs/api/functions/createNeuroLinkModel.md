[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createNeuroLinkModel

# Function: createNeuroLinkModel()

> **createNeuroLinkModel**(`options`): [`NeuroLinkLanguageModel`](../classes/NeuroLinkLanguageModel.md)

Defined in: [client/aiSdkAdapter.ts:460](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/aiSdkAdapter.ts#L460)

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
