[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2780)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2781)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2782)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2783)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2784)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2785)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2786)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2787)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2788)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2789)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2790)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2791)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2792)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2793](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2793)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2794)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2795)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2796)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2797)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2802)
