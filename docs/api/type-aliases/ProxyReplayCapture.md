[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2559)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2560)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2561)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2562)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2563)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2564)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2565)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2566)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2567)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2568)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2569)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2570)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2571)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2572)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2573)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2574)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2575)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2576)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2581)
