[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2268)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2269)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2270)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2271)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2272)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2273)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2274)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2275)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2276)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2277)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2278)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2279)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2280)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2281)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2282)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2283)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2284)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2285)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2290)
