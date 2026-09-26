[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2817)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2819)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2820)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2821)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2822)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2823)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2824)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2825)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2826)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2827)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2829)

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2830)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2831)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2832)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2833)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2834)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2835)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2836)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2837)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2839)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2840)
