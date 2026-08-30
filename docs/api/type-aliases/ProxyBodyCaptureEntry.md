[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2201)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2202)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2203)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2204)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2205)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2206)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2207)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2208)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2209)

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2210](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2210)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2211)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2212)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2213)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2214)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2215)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2216)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2217)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2218)
