[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createClient

# Function: createClient()

> **createClient**(`config`): [`NeuroLinkClient`](../classes/NeuroLinkClient.md)

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
