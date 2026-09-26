[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2877)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2879)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2880)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2881)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2882)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2883)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2884)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2885)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2886)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2887)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2889)

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2890)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2891)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2892)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2893)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2894)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2895)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2896)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2897)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2899)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2900)
