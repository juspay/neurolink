[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2757)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2758)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2759)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2760)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2761)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2762)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2763)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2764)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2765)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2766)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2767)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2768)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2769)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2770)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2771)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2772)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2773)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2774)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2779)
