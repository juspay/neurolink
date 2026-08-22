[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / neuroLinkAIInstance

# Variable: neuroLinkAIInstance

> `const` **neuroLinkAIInstance**: (`options`) => [`NeuroLinkAIProvider`](../classes/NeuroLinkAIProvider.md) & (`modelId?`, `modelOptions?`) => [`NeuroLinkLanguageModel`](../classes/NeuroLinkLanguageModel.md) = `createNeuroLinkProvider`

Defined in: [client/aiSdkAdapter.ts:489](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/aiSdkAdapter.ts#L489)

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
