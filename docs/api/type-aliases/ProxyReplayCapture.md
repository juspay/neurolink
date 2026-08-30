[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2225)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2226)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2227)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2228)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2229)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2230)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2231)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2232)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2233)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2234)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2235)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2236)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2237)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2238)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2239)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2240)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2241)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2242)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2247)
