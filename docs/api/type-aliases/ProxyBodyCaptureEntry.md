[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Defined in: [types/proxy.ts:2522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2522)

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Defined in: [types/proxy.ts:2524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2524)

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2525)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2526)

---

### phase

> **phase**: `string`

Defined in: [types/proxy.ts:2527](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2527)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2528](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2528)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2529)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2530)

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/proxy.ts:2531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2531)

---

### bodySize?

> `optional` **bodySize?**: `number`

Defined in: [types/proxy.ts:2532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2532)

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/proxy.ts:2533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2533)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2534)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/proxy.ts:2535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2535)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:2536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2536)

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:2537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2537)

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:2538](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2538)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2539](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2539)

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2540](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2540)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2542)

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2543)
