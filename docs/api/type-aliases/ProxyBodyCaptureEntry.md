[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2867)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2869)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2870)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2871)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2872)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2873)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2874)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2875)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2876)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2877)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2879)

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2880)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2881)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2882)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2883)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2884)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2885)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2886)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2887)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2889)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2890)
