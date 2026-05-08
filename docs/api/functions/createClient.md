[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createClient

# Function: createClient()

> **createClient**(`config`): [`NeuroLinkClient`](../classes/NeuroLinkClient.md)

Defined in: [client/httpClient.ts:1147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L1147)

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
