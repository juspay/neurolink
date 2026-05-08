[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createStreamingResponse

# Function: createStreamingResponse()

> **createStreamingResponse**(`options`): `Promise`\<`Response`\>

Defined in: [client/aiSdkAdapter.ts:517](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/aiSdkAdapter.ts#L517)

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
