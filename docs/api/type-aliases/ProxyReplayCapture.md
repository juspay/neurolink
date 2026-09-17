[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2563)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2564)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2565)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2566)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2567)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2568)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2569)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2570)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2571)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2572)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2573)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2574)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2575)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2576)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2577)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2578)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2579)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2580)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2585)
