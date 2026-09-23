[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2727)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2730)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2731)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2732)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2733)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2734)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2735)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2736)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2737)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2739)

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2740)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2741)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2742)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2743)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2744)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2745)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2746)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2747)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2749)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2750)
