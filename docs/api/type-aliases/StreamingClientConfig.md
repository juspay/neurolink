[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingClientConfig

# Type Alias: StreamingClientConfig

> **StreamingClientConfig** = `object`

Defined in: [types/client.ts:1549](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1549)

Streaming client configuration

## Properties

### baseUrl

> **baseUrl**: `string`

Defined in: [types/client.ts:1551](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1551)

Base URL for the API

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/client.ts:1553](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1553)

API key

---

### token?

> `optional` **token?**: `string`

Defined in: [types/client.ts:1555](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1555)

Bearer token

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:1557](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1557)

Default headers

---

### transport?

> `optional` **transport?**: `"sse"` \| `"websocket"`

Defined in: [types/client.ts:1559](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1559)

Preferred transport: 'sse' or 'websocket'
