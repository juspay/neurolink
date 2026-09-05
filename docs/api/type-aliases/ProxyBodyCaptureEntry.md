[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2244)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2245)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2246)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2247)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2248)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2249)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2250)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2251)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2252)

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2253)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2254)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2255)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2256)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2257)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2258)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2259)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2260)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2261)
