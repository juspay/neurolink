[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2747)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2749)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2750)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2751)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2752)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2753)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2754)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2755)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2756)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2757)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2759)

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2760)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2761)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2762)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2763)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2764)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2765)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2766)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2767)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2769)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2770)
