[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2124)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2125)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2126)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2127)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2128)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2129)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2130)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2131)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2132)

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2133)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2134)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2135)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2136)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2137)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2138)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2139)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2140)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2141)
