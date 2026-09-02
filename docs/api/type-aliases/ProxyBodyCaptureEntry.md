[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2232)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2233)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2234)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2235)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2236)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2237)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2238)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2239)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2240)

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2241)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2242)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2243)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2244)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2245)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2246)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2247)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2248)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2249)
