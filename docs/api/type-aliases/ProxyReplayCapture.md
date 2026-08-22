[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2148)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2149)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2150)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2151)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2152)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2153)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2154)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2155)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2156)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2157)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2158)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2159)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2160)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2161)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2162)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2163)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2164)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2165)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2170)
