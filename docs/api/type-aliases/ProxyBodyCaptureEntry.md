[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2554)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2556)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2557)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2558)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2559)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2560)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2561)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2562)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2563)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2564)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2566)

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2567)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2568)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2569)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2570)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2571)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2572)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2573)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2574)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2576)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2577)
