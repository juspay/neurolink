[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2529)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2531)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2532)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2533)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2534)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2535)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2536)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2537)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2538](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2538)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2539](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2539)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2541)

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2542)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2543)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2544)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2545)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2546)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2547)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2548)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2549)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2551)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2552)
