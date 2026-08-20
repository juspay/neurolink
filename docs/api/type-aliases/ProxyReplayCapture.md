[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2158)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2159)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2160)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2161)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2162)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2163)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2164)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2165)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2166)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2167)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2168)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2169)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2170)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2171)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2172)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2173)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2174)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2175)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2180)
