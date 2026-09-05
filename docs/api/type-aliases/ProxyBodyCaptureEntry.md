[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2239)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2240)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2241)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2242)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2243)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2244)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2245)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2246)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2247)

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2248)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2249)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2250)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2251)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2252)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2253)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2254)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2255)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2256)
