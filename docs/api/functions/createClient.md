[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createClient

# Function: createClient()

> **createClient**(`config`): [`NeuroLinkClient`](../classes/NeuroLinkClient.md)

Defined in: [client/httpClient.ts:1147](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/httpClient.ts#L1147)

Create a new NeuroLink client instance

## Parameters

### config

[`ClientConfig`](../type-aliases/ClientConfig.md)

## Returns

[`NeuroLinkClient`](../classes/NeuroLinkClient.md)

## Example

```typescript
import { createClient } from "@neurolink/client";

const client = createClient({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
  debug: true,
});
```
