[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientConfig

# Type Alias: ClientConfig

> **ClientConfig** = `object`

Defined in: [types/client.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L22)

Client configuration options for initializing the NeuroLink client

## Properties

### baseUrl

> **baseUrl**: `string`

Defined in: [types/client.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L24)

Base URL for the NeuroLink API

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/client.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L26)

API key for authentication (header-based)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/client.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L28)

Bearer token for authentication

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/client.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L30)

Default timeout in milliseconds (default: 30000)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L32)

Default headers to include in all requests

---

### retry?

> `optional` **retry?**: [`ClientRetryConfig`](ClientRetryConfig.md)

Defined in: [types/client.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L34)

Retry configuration for failed requests

---

### debug?

> `optional` **debug?**: `boolean`

Defined in: [types/client.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L36)

Enable debug logging

---

### fetch?

> `optional` **fetch?**: _typeof_ `fetch`

Defined in: [types/client.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L38)

Custom fetch implementation (for environments without native fetch)

---

### wsUrl?

> `optional` **wsUrl?**: `string`

Defined in: [types/client.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L40)

WebSocket URL override (defaults to ws(s) version of baseUrl)
