[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2584)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2585)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2586)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2587)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2588)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2589)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2590)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2591)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2592)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2593)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2594)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2595)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2596)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2597)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2598)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2599)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2600)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2601)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2606)
