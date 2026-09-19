[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2676)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2678)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2679)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2680)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2681)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2682)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2683)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2684)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2685)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2686)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2688)

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2689)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2690)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2691)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2692)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2693)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2694)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2695)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2696)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2698)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2699)
