[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2134)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2135)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2136)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2137)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2138)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2139)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2140)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2141)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2142)

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2143)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2144)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2145)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2146)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2147)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2148)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2149)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2150)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2151)
