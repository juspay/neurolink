[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientAuthConfig

# Type Alias: ClientAuthConfig

> **ClientAuthConfig** = `object`

Defined in: [types/client.ts:1076](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1076)

Authentication configuration options

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/client.ts:1078](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1078)

API key for header-based authentication

---

### token?

> `optional` **token?**: `string`

Defined in: [types/client.ts:1080](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1080)

Bearer token for JWT/OAuth authentication

---

### refreshToken?

> `optional` **refreshToken?**: () => `Promise`\<`string`\>

Defined in: [types/client.ts:1082](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1082)

Token refresh function for automatic token renewal

#### Returns

`Promise`\<`string`\>

---

### tokenExpiresAt?

> `optional` **tokenExpiresAt?**: `number`

Defined in: [types/client.ts:1084](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1084)

Token expiry time in milliseconds

---

### refreshBufferMs?

> `optional` **refreshBufferMs?**: `number`

Defined in: [types/client.ts:1086](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1086)

Buffer time before expiry to refresh token (default: 60000ms)

---

### headerName?

> `optional` **headerName?**: `string`

Defined in: [types/client.ts:1088](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1088)

Custom authorization header name (default: "Authorization")

---

### apiKeyHeaderName?

> `optional` **apiKeyHeaderName?**: `string`

Defined in: [types/client.ts:1090](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1090)

Custom API key header name (default: "X-API-Key")
