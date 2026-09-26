[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2907)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2908)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2909)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2910)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2911)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2912)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2913)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2914)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2915)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2916)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2917)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2918)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2919)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2920)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2921)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2922)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2923)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2924)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2929)
