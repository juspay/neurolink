[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2262)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2263)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2264)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2265)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2266)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2267)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2268)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2269)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2270)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2271)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2272)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2273)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2274)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2275)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2276)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2277)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2278)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2279)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2284)
