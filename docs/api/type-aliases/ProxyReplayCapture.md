[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

Defined in: [types/proxy.ts:2845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2845)

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2846)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2847)

---

### attempt

> **attempt**: `number` \| `null`

Defined in: [types/proxy.ts:2848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2848)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2849)

---

### stream

> **stream**: `boolean` \| `null`

Defined in: [types/proxy.ts:2850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2850)

---

### account

> **account**: `string` \| `null`

Defined in: [types/proxy.ts:2851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2851)

---

### accountType

> **accountType**: `string` \| `null`

Defined in: [types/proxy.ts:2852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2852)

---

### responseStatus

> **responseStatus**: `number` \| `null`

Defined in: [types/proxy.ts:2853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2853)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2854)

---

### contentType

> **contentType**: `string` \| `null`

Defined in: [types/proxy.ts:2855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2855)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2856)

---

### body

> **body**: `string` \| `null`

Defined in: [types/proxy.ts:2857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2857)

---

### bodySha256

> **bodySha256**: `string` \| `null`

Defined in: [types/proxy.ts:2858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2858)

---

### bodyTruncated

> **bodyTruncated**: `boolean`

Defined in: [types/proxy.ts:2859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2859)

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

Defined in: [types/proxy.ts:2860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2860)

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

Defined in: [types/proxy.ts:2861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2861)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2862](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2862)

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]

Defined in: [types/proxy.ts:2867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2867)
