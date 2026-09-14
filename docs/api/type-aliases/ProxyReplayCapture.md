[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2550)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2551)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2552)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2553)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2554)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2555)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2556)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2557)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2558)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2559)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2560)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2561)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2562)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2563)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2564)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2565)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2566)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2567)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2572)
