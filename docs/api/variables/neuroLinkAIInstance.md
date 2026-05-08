[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / neuroLinkAIInstance

# Variable: neuroLinkAIInstance

> `const` **neuroLinkAIInstance**: (`options`) => [`NeuroLinkAIProvider`](../classes/NeuroLinkAIProvider.md) & (`modelId?`, `modelOptions?`) => [`NeuroLinkLanguageModel`](../classes/NeuroLinkLanguageModel.md) = `createNeuroLinkProvider`

Defined in: [client/aiSdkAdapter.ts:488](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L488)

Default export for easy provider creation

Create a NeuroLink provider for Vercel AI SDK

## Parameters

### options

[`NeuroLinkProviderOptions`](../type-aliases/NeuroLinkProviderOptions.md)

## Returns

[`NeuroLinkAIProvider`](../classes/NeuroLinkAIProvider.md) & (`modelId?`, `modelOptions?`) => [`NeuroLinkLanguageModel`](../classes/NeuroLinkLanguageModel.md)

## Example

```typescript
import { createNeuroLinkProvider, generateText } from "@neurolink/ai-sdk";

const neurolink = createNeuroLinkProvider({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
});

const result = await generateText({
  model: neurolink("gpt-4o"),
  prompt: "Hello!",
});
```

## Example

```typescript
import { neurolink } from "@neurolink/ai-sdk";

const provider = neurolink({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: "your-key",
});

const model = provider("gpt-4o");
```
