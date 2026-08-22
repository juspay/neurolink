[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createStreamingResponse

# Function: createStreamingResponse()

> **createStreamingResponse**(`options`): `Promise`\<`Response`\>

Defined in: [client/aiSdkAdapter.ts:518](https://github.com/juspay/neurolink/blob/release/src/lib/client/aiSdkAdapter.ts#L518)

Create an AI SDK compatible streaming response from NeuroLink stream

## Parameters

### options

[`NeuroLinkProviderOptions`](../type-aliases/NeuroLinkProviderOptions.md) & `object`

## Returns

`Promise`\<`Response`\>

## Example

```typescript
// In a Next.js API route or server action
import { createStreamingResponse } from "@neurolink/ai-sdk";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const stream = await createStreamingResponse({
    baseUrl: process.env.NEUROLINK_URL,
    apiKey: process.env.NEUROLINK_API_KEY,
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o",
  });

  return stream;
}
```
