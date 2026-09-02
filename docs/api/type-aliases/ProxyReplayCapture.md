[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2247)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2248)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2249)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2250)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2251)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2252)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2253)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2254)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2255)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2256)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2257)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2258)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2259)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2260)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2261)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2262)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2263)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2264)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2269)
