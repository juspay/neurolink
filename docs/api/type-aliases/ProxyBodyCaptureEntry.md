[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2223)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2224)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2225)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2226)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2227)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2228)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2229)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2230)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2231)

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2232)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2233)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2234)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2235)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2236)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2237)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2238)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2239)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2240)
